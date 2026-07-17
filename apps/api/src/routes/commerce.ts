import { prisma, type Prisma } from "@vanstro/db";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { Hono, type Context } from "hono";
import { getSessionFromRequest } from "../auth/session.js";
import { loadApiConfig } from "../config.js";

type CheckoutItem = {
  skuId: string;
  skuCode: string;
  productName: string;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
  currency: string;
};

const MAX_BULK_INVENTORY_PRODUCTS = 100;

const cartInclude = {
  items: {
    include: {
      sku: {
        include: {
          product: {
            include: {
              assets: { orderBy: { sortOrder: "asc" as const } },
              specifications: { orderBy: { sortOrder: "asc" as const } }
            }
          },
          prices: { where: { status: "active" as const }, orderBy: { createdAt: "desc" as const } }
        }
      }
    }
  }
};

type CartRecord = Prisma.CartGetPayload<{ include: typeof cartInclude }>;

const favoriteInclude = {
  product: {
    include: {
      category: true,
      assets: { orderBy: { sortOrder: "asc" as const } },
      specifications: { orderBy: { sortOrder: "asc" as const } },
      skus: {
        where: { status: "active" as const },
        orderBy: { sortOrder: "asc" as const },
        include: {
          prices: { where: { status: "active" as const }, orderBy: { createdAt: "desc" as const } }
        }
      }
    }
  }
} satisfies Prisma.FavoriteInclude;

type FavoriteWithProduct = Prisma.FavoriteGetPayload<{ include: typeof favoriteInclude }>;

function money(amountCents: number, currency: string) {
  return { amount: amountCents / 100, amountCents, currency };
}

function optionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

async function requireCustomer(context: Context) {
  const session = await getSessionFromRequest(context);

  if (!session || session.user.kind !== "customer") {
    return undefined;
  }

  return session;
}

async function resolveCartIdentity(context: Context) {
  const session = await getSessionFromRequest(context);
  const requestedToken = context.req.header("x-cart-token");

  if (session?.user.kind === "customer") {
    const cart = await prisma.$transaction(async (transaction) => {
      const customerCart = await transaction.cart.upsert({
        where: { userId: session.user.id },
        update: {},
        create: { userId: session.user.id }
      });

      if (requestedToken) {
        const guestCart = await transaction.cart.findUnique({
          where: { guestToken: requestedToken },
          include: { items: true }
        });

        if (guestCart && guestCart.id !== customerCart.id) {
          for (const item of guestCart.items) {
            await transaction.cartItem.upsert({
              where: { cartId_skuId: { cartId: customerCart.id, skuId: item.skuId } },
              update: { quantity: { increment: item.quantity } },
              create: { cartId: customerCart.id, skuId: item.skuId, quantity: item.quantity }
            });
          }
          await transaction.cart.delete({ where: { id: guestCart.id } });
        }
      }

      return customerCart;
    });

    return { cart, cartToken: undefined, userId: session.user.id };
  }

  const cartToken = requestedToken || randomBytes(24).toString("base64url");
  const cart = await prisma.cart.upsert({
    where: { guestToken: cartToken },
    update: {},
    create: { guestToken: cartToken }
  });

  return { cart, cartToken, userId: undefined };
}

function loadCart(cartId: string) {
  return prisma.cart.findUniqueOrThrow({ where: { id: cartId }, include: cartInclude });
}

function formatCart(cart: CartRecord) {
  const items = cart.items.flatMap((item) => {
    const price = item.sku.prices[0];
    if (!price) return [];

    return [{
      id: item.id,
      skuId: item.skuId,
      quantity: item.quantity,
      product: {
        id: item.sku.product.id,
        slug: item.sku.product.slug,
        name: item.sku.product.name,
        sku: item.sku.skuCode,
        images: item.sku.product.assets.map((asset) => ({ url: asset.url, alt: asset.altText ?? item.sku.product.name })),
        dimensions: item.sku.product.specifications.find((specification) => specification.key === "Width")?.value ?? "",
        unit: "each",
        inStock: true
      },
      unitPrice: money(price.amountCents, price.currency),
      lineTotal: money(price.amountCents * item.quantity, price.currency)
    }];
  });
  const subtotalCents = items.reduce((total, item) => total + item.lineTotal.amountCents, 0);

  return { id: cart.id, items, subtotal: money(subtotalCents, cart.currency) };
}

function formatFavorite(favorite: FavoriteWithProduct) {
  const sku = favorite.product.skus[0];
  const price = sku?.prices[0];

  if (!sku || !price) return undefined;

  return {
    id: favorite.id,
    product: {
      id: favorite.product.id,
      slug: favorite.product.slug,
      name: favorite.product.name,
      sku: sku.skuCode,
      category: favorite.product.category?.name ?? "Uncategorized",
      price: money(price.amountCents, price.currency),
      unit: "each",
      dimensions: favorite.product.specifications.find((specification) => specification.key === "Width")?.value ?? "",
      images: favorite.product.assets.map((asset) => ({ url: asset.url, alt: asset.altText ?? favorite.product.name })),
      inStock: true
    }
  };
}

async function findSku(productId: string, skuCode?: string) {
  return prisma.platformSku.findFirst({
    where: {
      status: "active",
      ...(skuCode ? { skuCode } : {}),
      product: { status: "active", OR: [{ id: productId }, { slug: productId }] }
    },
    include: { prices: { where: { status: "active" }, orderBy: { createdAt: "desc" } } }
  });
}

function cartCheckoutItems(cart: CartRecord): CheckoutItem[] {
  if (cart.items.length === 0) return [];

  const items: CheckoutItem[] = [];
  for (const item of cart.items) {
    const price = item.sku.prices[0];
    if (!price || item.sku.status !== "active" || item.sku.product.status !== "active") return [];
    items.push({
      skuId: item.skuId,
      skuCode: item.sku.skuCode,
      productName: item.sku.product.name,
      quantity: item.quantity,
      unitPriceCents: price.amountCents,
      lineTotalCents: price.amountCents * item.quantity,
      currency: price.currency
    });
  }

  return items;
}

function callbackSignature(secret: string, sessionId: string, providerPaymentId: string) {
  return createHmac("sha256", secret).update(`${sessionId}:${providerPaymentId}`).digest("hex");
}

function signaturesMatch(expected: string | undefined, actual: string | undefined) {
  if (!expected || !actual || expected.length !== actual.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(actual));
}

function formatOrder(order: {
  id: string; status: string; fulfillment: string; subtotalCents: number; taxCents: number; shippingCents: number; totalCents: number; currency: string; createdAt: Date; items: Array<{ skuCode: string; productName: string; quantity: number; unitPriceCents: number; lineTotalCents: number }>;
}) {
  return {
    id: order.id,
    status: order.status,
    fulfillment: order.fulfillment,
    subtotal: money(order.subtotalCents, order.currency),
    tax: money(order.taxCents, order.currency),
    shipping: money(order.shippingCents, order.currency),
    total: money(order.totalCents, order.currency),
    createdAt: order.createdAt.toISOString(),
    items: order.items.map((item) => ({ ...item, unitPrice: money(item.unitPriceCents, order.currency), lineTotal: money(item.lineTotalCents, order.currency) }))
  };
}

export function createCommerceRoutes() {
  const config = loadApiConfig();
  const routes = new Hono();

  routes.get("/cart", async (context) => {
    const resolved = await resolveCartIdentity(context);
    const cart = await loadCart(resolved.cart.id);
    return context.json({ data: formatCart(cart), meta: resolved.cartToken ? { cartToken: resolved.cartToken } : undefined });
  });

  routes.post("/cart/items", async (context) => {
    const body = (await context.req.json().catch(() => null)) as { productId?: unknown; skuCode?: unknown; quantity?: unknown } | null;
    const productId = optionalString(body?.productId);
    const skuCode = optionalString(body?.skuCode);
    const quantity = Number(body?.quantity);
    if (!productId || !Number.isInteger(quantity) || quantity < 1 || quantity > 999) return context.json({ error: "productId and a quantity between 1 and 999 are required." }, 400);

    const sku = await findSku(productId, skuCode);
    if (!sku?.prices[0]) return context.json({ error: "Active product pricing was not found." }, 404);
    const resolved = await resolveCartIdentity(context);
    await prisma.cartItem.upsert({
      where: { cartId_skuId: { cartId: resolved.cart.id, skuId: sku.id } },
      update: { quantity: { increment: quantity } },
      create: { cartId: resolved.cart.id, skuId: sku.id, quantity }
    });
    const cart = await prisma.cart.findUniqueOrThrow({ where: { id: resolved.cart.id }, include: cartInclude });
    return context.json({ data: formatCart(cart), meta: resolved.cartToken ? { cartToken: resolved.cartToken } : undefined }, 201);
  });

  routes.patch("/cart/items/:itemId", async (context) => {
    const body = (await context.req.json().catch(() => null)) as { quantity?: unknown } | null;
    const quantity = Number(body?.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 999) return context.json({ error: "quantity must be between 1 and 999." }, 400);
    const resolved = await resolveCartIdentity(context);
    const item = await prisma.cartItem.findFirst({ where: { id: context.req.param("itemId"), cartId: resolved.cart.id } });
    if (!item) return context.json({ error: "Cart item not found." }, 404);
    await prisma.cartItem.update({ where: { id: item.id }, data: { quantity } });
    const cart = await prisma.cart.findUniqueOrThrow({ where: { id: resolved.cart.id }, include: cartInclude });
    return context.json({ data: formatCart(cart), meta: resolved.cartToken ? { cartToken: resolved.cartToken } : undefined });
  });

  routes.delete("/cart/items/:itemId", async (context) => {
    const resolved = await resolveCartIdentity(context);
    await prisma.cartItem.deleteMany({ where: { id: context.req.param("itemId"), cartId: resolved.cart.id } });
    const cart = await prisma.cart.findUniqueOrThrow({ where: { id: resolved.cart.id }, include: cartInclude });
    return context.json({ data: formatCart(cart), meta: resolved.cartToken ? { cartToken: resolved.cartToken } : undefined });
  });

  routes.delete("/cart", async (context) => {
    const resolved = await resolveCartIdentity(context);
    await prisma.cartItem.deleteMany({ where: { cartId: resolved.cart.id } });
    return context.json({ data: { ok: true }, meta: resolved.cartToken ? { cartToken: resolved.cartToken } : undefined });
  });

  routes.post("/checkout/session", async (context) => {
    const body = (await context.req.json().catch(() => null)) as { email?: unknown; fulfillment?: unknown; dealerLocationId?: unknown } | null;
    const email = optionalString(body?.email)?.toLowerCase();
    const fulfillment = body?.fulfillment === "delivery" ? "delivery" : body?.fulfillment === "pickup" ? "pickup" : undefined;
    if (!email || !fulfillment) return context.json({ error: "email and fulfillment are required." }, 400);
    const resolved = await resolveCartIdentity(context);
    const cart = await loadCart(resolved.cart.id);
    const items = cartCheckoutItems(cart);
    if (items.length === 0) return context.json({ error: "Cart has no purchasable items." }, 400);
    const requestedDealerLocationId = optionalString(body?.dealerLocationId);
    const availableSnapshots = await prisma.inventorySnapshot.findMany({
      where: { skuId: { in: items.map((item) => item.skuId) }, ...(requestedDealerLocationId ? { dealerLocationId: requestedDealerLocationId } : {}) }
    });
    const oldestAllowedSnapshot = new Date(Date.now() - config.inventorySnapshotTtlMs);
    if (availableSnapshots.some((snapshot) => snapshot.updatedAt < oldestAllowedSnapshot)) {
      return context.json({ error: "Inventory availability is being refreshed. Please try again shortly." }, 409);
    }
    const dealerLocationId = requestedDealerLocationId ?? availableSnapshots.find((snapshot) =>
      items.every((item) => availableSnapshots.some((candidate) => candidate.skuId === item.skuId && candidate.dealerLocationId === snapshot.dealerLocationId && candidate.quantityOnHand - candidate.quantityReserved >= item.quantity))
    )?.dealerLocationId;
    if (!dealerLocationId) return context.json({ error: "No single dealer location can fulfill this cart." }, 409);
    const snapshots = availableSnapshots.filter((snapshot) => snapshot.dealerLocationId === dealerLocationId);
    for (const item of items) {
      const snapshot = snapshots.find((candidate) => candidate.skuId === item.skuId);
      if (!snapshot || snapshot.quantityOnHand - snapshot.quantityReserved < item.quantity) return context.json({ error: `Insufficient inventory for ${item.skuCode}.` }, 409);
    }
    const subtotalCents = items.reduce((total, item) => total + item.lineTotalCents, 0);
    const taxCents = Math.round(subtotalCents * 0.05);
    const shippingCents = fulfillment === "delivery" ? 1500 : 0;
    const session = await prisma.$transaction(async (transaction) => {
      const paymentSession = await transaction.paymentSession.create({
        data: { userId: resolved.userId, guestEmail: email, guestOrderToken: randomBytes(24).toString("base64url"), fulfillment, dealerLocationId, items, subtotalCents, taxCents, shippingCents, totalCents: subtotalCents + taxCents + shippingCents, expiresAt: new Date(Date.now() + 30 * 60 * 1000) }
      });
      for (const item of items) {
        const snapshot = snapshots.find((candidate) => candidate.skuId === item.skuId);
        if (!snapshot) throw new Error("Inventory snapshot disappeared during checkout.");
        const reserved = await transaction.$executeRaw`
          UPDATE "inventory_snapshots"
          SET "quantityReserved" = "quantityReserved" + ${item.quantity}
          WHERE "id" = ${snapshot.id}
            AND "quantityOnHand" - "quantityReserved" >= ${item.quantity}
        `;
        if (reserved !== 1) throw new Error(`Insufficient inventory for ${item.skuCode}.`);
        await transaction.inventoryReservation.create({ data: { skuId: item.skuId, dealerLocationId, paymentSessionId: paymentSession.id, quantity: item.quantity, expiresAt: paymentSession.expiresAt } });
      }
      return paymentSession;
    });
    return context.json({ data: { id: session.id, status: session.status, total: money(session.totalCents, session.currency), expiresAt: session.expiresAt.toISOString(), guestOrderToken: session.guestOrderToken }, meta: resolved.cartToken ? { cartToken: resolved.cartToken } : undefined }, 201);
  });

  routes.get("/payments/sessions/:id", async (context) => {
    const session = await prisma.paymentSession.findUnique({ where: { id: context.req.param("id") } });
    if (!session) return context.json({ error: "Payment session not found." }, 404);
    const customer = await getSessionFromRequest(context);
    if (customer?.user.id !== session.userId && context.req.query("token") !== session.guestOrderToken) return context.json({ error: "Payment session access is denied." }, 403);
    return context.json({ data: { id: session.id, status: session.status, total: money(session.totalCents, session.currency), expiresAt: session.expiresAt.toISOString() } });
  });

  routes.post("/payments/callback", async (context) => {
    const body = (await context.req.json().catch(() => null)) as { sessionId?: unknown; providerPaymentId?: unknown; status?: unknown } | null;
    const sessionId = optionalString(body?.sessionId);
    const providerPaymentId = optionalString(body?.providerPaymentId);
    if (!sessionId || !providerPaymentId || body?.status !== "paid") return context.json({ error: "paid sessionId and providerPaymentId are required." }, 400);
    if (!signaturesMatch(callbackSignature(config.paymentCallbackSecret, sessionId, providerPaymentId), context.req.header("x-payment-signature"))) return context.json({ error: "Payment signature is invalid." }, 401);
    const result = await prisma.$transaction(async (transaction) => {
      const session = await transaction.paymentSession.findUnique({ where: { id: sessionId } });
      if (!session) return undefined;
      const existingOrder = await transaction.order.findUnique({ where: { paymentSessionId: session.id }, include: { items: true } });
      if (existingOrder) return existingOrder;
      if (session.status !== "pending" || session.expiresAt <= new Date()) return null;
      const claimedSession = await transaction.paymentSession.updateMany({
        where: { id: session.id, status: "pending", expiresAt: { gt: new Date() } },
        data: { status: "paid", providerPaymentId, paidAt: new Date() }
      });
      if (claimedSession.count === 0) {
        return transaction.order.findUnique({ where: { paymentSessionId: session.id }, include: { items: true } });
      }
      const items = session.items as unknown as CheckoutItem[];
      const order = await transaction.order.create({
        data: {
          userId: session.userId,
          email: session.guestEmail,
          guestOrderToken: session.guestOrderToken,
          paymentSessionId: session.id,
          fulfillment: session.fulfillment,
          dealerLocationId: session.dealerLocationId,
          subtotalCents: session.subtotalCents,
          taxCents: session.taxCents,
          shippingCents: session.shippingCents,
          totalCents: session.totalCents,
          currency: session.currency,
          items: {
            create: items.map((item) => ({
              skuId: item.skuId,
              skuCode: item.skuCode,
              productName: item.productName,
              quantity: item.quantity,
              unitPriceCents: item.unitPriceCents,
              lineTotalCents: item.lineTotalCents,
              currency: item.currency
            }))
          }
        },
        include: { items: true }
      });
      await transaction.inventoryReservation.updateMany({ where: { paymentSessionId: session.id, status: "active" }, data: { status: "consumed" } });
      await transaction.orderStatusEvent.create({ data: { orderId: order.id, status: "paid", source: "payment_callback", payload: { providerPaymentId } } });
      await transaction.erpSyncJob.create({ data: { type: "order_create", payload: { orderId: order.id, paymentSessionId: session.id } } });
      return order;
    });
    if (result === undefined) return context.json({ error: "Payment session not found." }, 404);
    if (result === null) return context.json({ error: "Payment session cannot be paid." }, 409);
    return context.json({ data: formatOrder(result) });
  });

  routes.get("/orders/:id/status", async (context) => {
    const order = await prisma.order.findUnique({ where: { id: context.req.param("id") }, include: { items: true } });
    if (!order) return context.json({ error: "Order not found." }, 404);
    const session = await getSessionFromRequest(context);
    if (session?.user.id !== order.userId && context.req.query("token") !== order.guestOrderToken) return context.json({ error: "Order access is denied." }, 403);
    return context.json({ data: { id: order.id, status: order.status, createdAt: order.createdAt.toISOString() } });
  });

  routes.get("/orders/:id", async (context) => {
    const order = await prisma.order.findUnique({ where: { id: context.req.param("id") }, include: { items: true } });
    if (!order) return context.json({ error: "Order not found." }, 404);
    const session = await getSessionFromRequest(context);
    if (session?.user.id !== order.userId && context.req.query("token") !== order.guestOrderToken) return context.json({ error: "Order access is denied." }, 403);
    return context.json({ data: formatOrder(order) });
  });

  routes.post("/inventory/reservations", async (context) => {
    const body = (await context.req.json().catch(() => null)) as { productId?: unknown; quantity?: unknown; dealerLocationId?: unknown } | null;
    const sku = await findSku(optionalString(body?.productId) ?? "");
    const quantity = Number(body?.quantity);
    if (!sku || !Number.isInteger(quantity) || quantity < 1) return context.json({ error: "productId and positive quantity are required." }, 400);
    const dealerLocationId = optionalString(body?.dealerLocationId);
    const snapshot = await prisma.inventorySnapshot.findFirst({ where: { skuId: sku.id, dealerLocationId } });
    if (!snapshot || snapshot.quantityOnHand - snapshot.quantityReserved < quantity) return context.json({ error: "Insufficient inventory." }, 409);
    const ownerToken = randomBytes(24).toString("base64url");
    const reservation = await prisma.$transaction(async (transaction) => {
      const reserved = await transaction.$executeRaw`
        UPDATE "inventory_snapshots"
        SET "quantityReserved" = "quantityReserved" + ${quantity}
        WHERE "id" = ${snapshot.id}
          AND "quantityOnHand" - "quantityReserved" >= ${quantity}
      `;
      if (reserved !== 1) throw new Error("Inventory is no longer available.");
      return transaction.inventoryReservation.create({ data: { skuId: sku.id, dealerLocationId, ownerToken, quantity, expiresAt: new Date(Date.now() + 30 * 60 * 1000) } });
    });
    return context.json({ data: { reservationId: reservation.id, reservationToken: ownerToken, expiresAt: reservation.expiresAt.toISOString() } }, 201);
  });

  routes.delete("/inventory/reservations/:id", async (context) => {
    const reservation = await prisma.inventoryReservation.findUnique({ where: { id: context.req.param("id") } });
    if (!reservation || reservation.status !== "active" || !reservation.ownerToken || context.req.header("x-reservation-token") !== reservation.ownerToken) return context.json({ error: "Active reservation not found." }, 404);
    await prisma.$transaction(async (transaction) => {
      await transaction.inventoryReservation.update({ where: { id: reservation.id }, data: { status: "released" } });
      const snapshot = await transaction.inventorySnapshot.findFirst({ where: { skuId: reservation.skuId, dealerLocationId: reservation.dealerLocationId } });
      if (snapshot) await transaction.inventorySnapshot.update({ where: { id: snapshot.id }, data: { quantityReserved: { decrement: reservation.quantity } } });
    });
    return context.json({ data: { ok: true } });
  });

  routes.get("/products/:identifier/inventory", async (context) => {
    const sku = await findSku(context.req.param("identifier"));
    if (!sku) return context.json({ error: "Product not found." }, 404);
    const snapshots = await prisma.inventorySnapshot.findMany({ where: { skuId: sku.id }, include: { dealerLocation: { include: { dealer: true } } } });
    const locations = snapshots.map((snapshot) => ({ dealerLocationId: snapshot.dealerLocationId, dealerId: snapshot.dealerLocation?.dealerId, dealerName: snapshot.dealerLocation?.dealer.name, quantityOnHand: snapshot.quantityOnHand, quantityReserved: snapshot.quantityReserved, quantityAvailable: Math.max(0, snapshot.quantityOnHand - snapshot.quantityReserved), updatedAt: snapshot.updatedAt.toISOString() }));
    return context.json({ data: { productId: sku.productId, sku: sku.skuCode, locations, totalAvailable: locations.reduce((total, location) => total + location.quantityAvailable, 0) } });
  });

  routes.post("/products/inventory", async (context) => {
    const body = (await context.req.json().catch(() => null)) as { productIds?: unknown } | null;
    const productIds = Array.isArray(body?.productIds) ? body.productIds.filter((id): id is string => typeof id === "string") : [];
    if (productIds.length > MAX_BULK_INVENTORY_PRODUCTS) {
      return context.json({ error: `productIds cannot contain more than ${MAX_BULK_INVENTORY_PRODUCTS} items.` }, 400);
    }
    const identifiers = [...new Set(productIds)];
    const skus = identifiers.length === 0
      ? []
      : await prisma.platformSku.findMany({
          where: {
            status: "active",
            product: {
              status: "active",
              OR: [{ id: { in: identifiers } }, { slug: { in: identifiers } }]
            }
          },
          include: {
            product: { select: { id: true, slug: true } },
            inventorySnapshots: true
          },
          orderBy: { sortOrder: "asc" }
        });
    const skuByIdentifier = new Map<string, (typeof skus)[number]>();
    for (const sku of skus) {
      if (!skuByIdentifier.has(sku.product.id)) skuByIdentifier.set(sku.product.id, sku);
      if (!skuByIdentifier.has(sku.product.slug)) skuByIdentifier.set(sku.product.slug, sku);
    }
    const products = productIds.map((identifier) => {
      const sku = skuByIdentifier.get(identifier);
      if (!sku) return undefined;
      return {
        productId: sku.productId,
        sku: sku.skuCode,
        totalAvailable: sku.inventorySnapshots.reduce((total, snapshot) => total + Math.max(0, snapshot.quantityOnHand - snapshot.quantityReserved), 0),
        updatedAt: sku.inventorySnapshots[0]?.updatedAt.toISOString() ?? null
      };
    });
    return context.json({ data: products.filter(Boolean) });
  });

  routes.get("/account/me", async (context) => {
    const session = await requireCustomer(context);
    if (!session) return context.json({ error: "Customer authentication is required." }, 401);
    const customer = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id }, include: { customerProfile: true } });
    return context.json({ data: { id: customer.id, email: customer.email, firstName: customer.customerProfile?.firstName, lastName: customer.customerProfile?.lastName, phone: customer.customerProfile?.phone } });
  });

  routes.patch("/account/me", async (context) => {
    const session = await requireCustomer(context);
    if (!session) return context.json({ error: "Customer authentication is required." }, 401);
    const body = (await context.req.json().catch(() => null)) as { firstName?: unknown; lastName?: unknown; phone?: unknown } | null;
    const profile = await prisma.customerProfile.upsert({ where: { userId: session.user.id }, update: { firstName: optionalString(body?.firstName), lastName: optionalString(body?.lastName), phone: optionalString(body?.phone) }, create: { userId: session.user.id, firstName: optionalString(body?.firstName), lastName: optionalString(body?.lastName), phone: optionalString(body?.phone) } });
    return context.json({ data: profile });
  });

  routes.get("/account/addresses", async (context) => {
    const session = await requireCustomer(context);
    if (!session) return context.json({ error: "Customer authentication is required." }, 401);
    return context.json({ data: await prisma.customerAddress.findMany({ where: { userId: session.user.id }, orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] }) });
  });

  routes.post("/account/addresses", async (context) => {
    const session = await requireCustomer(context);
    if (!session) return context.json({ error: "Customer authentication is required." }, 401);
    const body = (await context.req.json().catch(() => null)) as Record<string, unknown> | null;
    const required = ["firstName", "lastName", "addressLine1", "city", "province", "postalCode"] as const;
    if (required.some((key) => !optionalString(body?.[key]))) return context.json({ error: "Address name, line 1, city, province and postalCode are required." }, 400);
    const address = await prisma.customerAddress.create({ data: { userId: session.user.id, label: optionalString(body?.label), firstName: optionalString(body?.firstName)!, lastName: optionalString(body?.lastName)!, phone: optionalString(body?.phone), addressLine1: optionalString(body?.addressLine1)!, addressLine2: optionalString(body?.addressLine2), city: optionalString(body?.city)!, province: optionalString(body?.province)!, postalCode: optionalString(body?.postalCode)!, country: optionalString(body?.country) ?? "CA", isDefault: body?.isDefault === true } });
    return context.json({ data: address }, 201);
  });

  routes.patch("/account/addresses/:id", async (context) => {
    const session = await requireCustomer(context);
    if (!session) return context.json({ error: "Customer authentication is required." }, 401);
    const address = await prisma.customerAddress.findFirst({ where: { id: context.req.param("id"), userId: session.user.id } });
    if (!address) return context.json({ error: "Address not found." }, 404);
    const body = (await context.req.json().catch(() => null)) as Record<string, unknown> | null;
    return context.json({ data: await prisma.customerAddress.update({ where: { id: address.id }, data: { label: optionalString(body?.label), firstName: optionalString(body?.firstName), lastName: optionalString(body?.lastName), phone: optionalString(body?.phone), addressLine1: optionalString(body?.addressLine1), addressLine2: optionalString(body?.addressLine2), city: optionalString(body?.city), province: optionalString(body?.province), postalCode: optionalString(body?.postalCode), country: optionalString(body?.country), isDefault: typeof body?.isDefault === "boolean" ? body.isDefault : undefined } }) });
  });

  routes.delete("/account/addresses/:id", async (context) => {
    const session = await requireCustomer(context);
    if (!session) return context.json({ error: "Customer authentication is required." }, 401);
    await prisma.customerAddress.deleteMany({ where: { id: context.req.param("id"), userId: session.user.id } });
    return context.json({ data: { ok: true } });
  });

  routes.get("/account/favorites", async (context) => {
    const session = await requireCustomer(context);
    if (!session) return context.json({ error: "Customer authentication is required." }, 401);
    const favorites = await prisma.favorite.findMany({
      where: { userId: session.user.id },
      include: favoriteInclude,
      orderBy: { createdAt: "desc" }
    });
    return context.json({ data: favorites.flatMap((favorite) => {
      const formatted = formatFavorite(favorite);
      return formatted ? [formatted] : [];
    }) });
  });

  routes.post("/account/favorites", async (context) => {
    const session = await requireCustomer(context);
    if (!session) return context.json({ error: "Customer authentication is required." }, 401);
    const body = (await context.req.json().catch(() => null)) as { productId?: unknown } | null;
    const productId = optionalString(body?.productId);
    if (!productId || !await prisma.product.findFirst({ where: { id: productId, status: "active" } })) return context.json({ error: "Active product not found." }, 404);
    const favorite = await prisma.favorite.upsert({
      where: { userId_productId: { userId: session.user.id, productId } },
      update: {},
      create: { userId: session.user.id, productId },
      include: favoriteInclude
    });
    const formatted = formatFavorite(favorite);
    if (!formatted) return context.json({ error: "Active product pricing was not found." }, 409);
    return context.json({ data: formatted }, 201);
  });

  routes.delete("/account/favorites/:productId", async (context) => {
    const session = await requireCustomer(context);
    if (!session) return context.json({ error: "Customer authentication is required." }, 401);
    await prisma.favorite.deleteMany({ where: { userId: session.user.id, productId: context.req.param("productId") } });
    return context.json({ data: { ok: true } });
  });

  routes.get("/account/orders", async (context) => {
    const session = await requireCustomer(context);
    if (!session) return context.json({ error: "Customer authentication is required." }, 401);
    const orders = await prisma.order.findMany({ where: { userId: session.user.id }, include: { items: true }, orderBy: { createdAt: "desc" } });
    return context.json({ data: orders.map(formatOrder) });
  });

  routes.get("/account/orders/:id", async (context) => {
    const session = await requireCustomer(context);
    if (!session) return context.json({ error: "Customer authentication is required." }, 401);
    const order = await prisma.order.findFirst({ where: { id: context.req.param("id"), userId: session.user.id }, include: { items: true } });
    if (!order) return context.json({ error: "Order not found." }, 404);
    return context.json({ data: formatOrder(order) });
  });

  routes.post("/integrations/erp/webhooks/order-status", async (context) => {
    const body = (await context.req.json().catch(() => null)) as { orderId?: unknown; status?: unknown; externalId?: unknown; erpSystem?: unknown } | null;
    const orderId = optionalString(body?.orderId);
    const status = body?.status;
    const externalId = optionalString(body?.externalId);
    const erpSystem = optionalString(body?.erpSystem) ?? "erp";
    const secret = config.erpWebhookSecret;
    const expected = secret && orderId && externalId ? createHmac("sha256", secret).update(`${orderId}:${externalId}:${status}`).digest("hex") : undefined;
    if (!signaturesMatch(expected, context.req.header("x-erp-signature"))) return context.json({ error: "ERP webhook signature is invalid." }, 401);
    if (!orderId || !["processing", "fulfilled", "cancelled"].includes(String(status))) return context.json({ error: "Valid orderId and order status are required." }, 400);
    const existingEvent = await prisma.erpWebhookEvent.findFirst({ where: { erpSystem, eventType: "order-status", externalId } });
    if (existingEvent) return context.json({ data: { ok: true, duplicate: true } });
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return context.json({ error: "Order not found." }, 404);
    await prisma.$transaction(async (transaction) => {
      await transaction.erpWebhookEvent.create({ data: { erpSystem, eventType: "order-status", externalId, payload: body as object, processedAt: new Date() } });
      await transaction.order.update({ where: { id: order.id }, data: { status: status as "processing" | "fulfilled" | "cancelled" } });
      await transaction.orderStatusEvent.create({ data: { orderId: order.id, status: status as "processing" | "fulfilled" | "cancelled", source: `erp:${erpSystem}`, payload: body as object } });
    });
    return context.json({ data: { ok: true } });
  });

  return routes;
}
