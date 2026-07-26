import { prisma, type Prisma } from "@vanstro/db";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { Hono, type Context } from "hono";
import { getSessionFromRequest } from "../../auth/session.js";
import { loadApiConfig, type ApiConfig } from "../../config.js";
import { queueCustomerEmail } from "../../email/queue.js";
import { getPaymentProvider } from "../../payments/index.js";
import { publicError } from "../../public-errors.js";

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

class InventoryConflictError extends Error {
  constructor(
    message: string,
    readonly code: "INVENTORY_REFRESHING" | "INVENTORY_INSUFFICIENT"
  ) {
    super(message);
  }
}

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
          prices: { where: { status: "active" as const }, orderBy: { createdAt: "desc" as const } },
          inventorySnapshots: true
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
          prices: { where: { status: "active" as const }, orderBy: { createdAt: "desc" as const } },
          inventorySnapshots: true
        }
      }
    }
  }
} satisfies Prisma.FavoriteInclude;

type FavoriteWithProduct = Prisma.FavoriteGetPayload<{ include: typeof favoriteInclude }>;

export function availableQuantity(snapshots: Array<{ quantityOnHand: number; quantityReserved: number }>) {
  return snapshots.reduce((total, snapshot) => total + Math.max(0, snapshot.quantityOnHand - snapshot.quantityReserved), 0);
}

/** Compute tax and shipping cents from subtotal, combined tax rate, and fulfillment. */
export function computeCheckoutTotals(
  subtotalCents: number,
  combinedTaxRate: number,
  fulfillment: "pickup" | "delivery",
  deliveryFlatFeeCents: number
) {
  const taxCents = Math.round(subtotalCents * combinedTaxRate);
  const shippingCents = fulfillment === "delivery" ? deliveryFlatFeeCents : 0;
  return {
    taxCents,
    shippingCents,
    totalCents: subtotalCents + taxCents + shippingCents
  };
}

// Resolve the combined sales-tax rate (decimal of subtotal) for a province code.
// Rates are DB-managed (tax_rates). A missing/unknown province yields 0% with a
// warning rather than blocking checkout; finance owns the authoritative table.
async function resolveCombinedTaxRate(province: string | null | undefined) {
  if (!province) return 0;
  const rate = await prisma.taxRate.findFirst({ where: { province, isActive: true } });
  if (!rate) {
    console.warn(
      JSON.stringify({
        ts: new Date().toISOString(),
        service: "vanstro-api",
        level: "warn",
        message: "No active tax rate for province; applying 0% tax.",
        province
      })
    );
    return 0;
  }
  return Number(rate.combinedRate);
}

function money(amountCents: number, currency: string) {
  return { amount: amountCents / 100, amountCents, currency };
}

function optionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

type ErpOrderStatus = "processing" | "fulfilled" | "cancelled";
type ErpOrderStatusPayload = {
  orderId: string;
  status: ErpOrderStatus;
  externalId: string;
  erpSystem: string;
};

type CommerceDatabase = Pick<typeof prisma, "erpWebhookEvent" | "order" | "$transaction">;

type DealerFulfillmentAvailability = {
  pickupAvailable: boolean;
  deliveryAvailable: boolean;
};

export function dealerSupportsFulfillment(
  dealerLocation: DealerFulfillmentAvailability,
  fulfillment: "pickup" | "delivery"
) {
  return fulfillment === "pickup"
    ? dealerLocation.pickupAvailable
    : dealerLocation.deliveryAvailable;
}

const loadDealerFulfillmentAvailability = (dealerLocationId: string) =>
  prisma.dealerLocation.findUnique({
    where: { id: dealerLocationId },
    select: { pickupAvailable: true, deliveryAvailable: true }
  });

function erpOrderStatusPayload(input: {
  orderId: string;
  status: ErpOrderStatus;
  externalId: string;
  erpSystem: string;
}): ErpOrderStatusPayload {
  return {
    orderId: input.orderId,
    status: input.status,
    externalId: input.externalId,
    erpSystem: input.erpSystem
  };
}

function isDuplicateErpWebhookEventConflict(error: unknown) {
  if (!error || typeof error !== "object" || !("code" in error) || error.code !== "P2002") return false;

  const meta = "meta" in error && error.meta && typeof error.meta === "object"
    ? error.meta as { modelName?: unknown; target?: unknown }
    : undefined;
  if (meta?.modelName !== undefined && meta.modelName !== "ErpWebhookEvent") return false;

  const target = meta?.target;
  const targetFields = Array.isArray(target)
    ? target.filter((field): field is string => typeof field === "string")
    : typeof target === "string"
      ? [target]
      : [];
  return ["erpSystem", "eventType", "externalId"].every((field) =>
    targetFields.some((targetField) => targetField.includes(field))
  );
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
        inStock: availableQuantity(item.sku.inventorySnapshots) >= item.quantity
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
      inStock: availableQuantity(sku.inventorySnapshots) > 0
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

export function createCommerceRoutes(
  database: CommerceDatabase = prisma,
  config: ApiConfig = loadApiConfig(),
  findDealerFulfillmentAvailability: (dealerLocationId: string) => Promise<DealerFulfillmentAvailability | null> = loadDealerFulfillmentAvailability
) {
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
    if (!productId || !Number.isInteger(quantity) || quantity < 1 || quantity > 999) return publicError(context, 400, "COMMERCE_INVALID", "productId and a quantity between 1 and 999 are required.");

    const sku = await findSku(productId, skuCode);
    if (!sku?.prices[0]) return publicError(context, 404, "COMMERCE_NOT_FOUND", "Active product pricing was not found.");
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
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 999) return publicError(context, 400, "COMMERCE_INVALID", "quantity must be between 1 and 999.");
    const resolved = await resolveCartIdentity(context);
    const item = await prisma.cartItem.findFirst({ where: { id: context.req.param("itemId"), cartId: resolved.cart.id } });
    if (!item) return publicError(context, 404, "CART_ITEM_NOT_FOUND", "Cart item not found.");
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
    const body = (await context.req.json().catch(() => null)) as { firstName?: unknown; lastName?: unknown; email?: unknown; phone?: unknown; fulfillment?: unknown; paymentMethod?: unknown; notes?: unknown; dealerLocationId?: unknown } | null;
    const firstName = optionalString(body?.firstName);
    const lastName = optionalString(body?.lastName);
    const email = optionalString(body?.email)?.toLowerCase();
    const phone = optionalString(body?.phone);
    const fulfillment = body?.fulfillment === "delivery" ? "delivery" : body?.fulfillment === "pickup" ? "pickup" : undefined;
    const paymentMethod = body?.paymentMethod === "pos" ? "pos" : body?.paymentMethod === "cash" ? "cash" : undefined;
    const notes = optionalString(body?.notes);
    if (!firstName || !lastName || !email || !phone || !fulfillment || !paymentMethod) return publicError(context, 400, "CHECKOUT_INVALID", "firstName, lastName, email, phone, fulfillment and paymentMethod are required.");
    const resolved = await resolveCartIdentity(context);
    const cart = await loadCart(resolved.cart.id);
    const items = cartCheckoutItems(cart);
    if (items.length === 0) return publicError(context, 400, "CART_EMPTY", "Cart has no purchasable items.");
    const existingPendingSession = await prisma.paymentSession.findFirst({
      where: { cartId: resolved.cart.id, status: "pending", expiresAt: { gt: new Date() } }
    });
    if (existingPendingSession) {
      return publicError(context, 409, "CHECKOUT_INVALID", "A checkout session is already pending for this cart.");
    }
    const requestedDealerLocationId = optionalString(body?.dealerLocationId);
    if (requestedDealerLocationId) {
      const dealerLocation = await findDealerFulfillmentAvailability(requestedDealerLocationId);
      if (!dealerLocation || !dealerSupportsFulfillment(dealerLocation, fulfillment)) {
        return publicError(context, 409, "CHECKOUT_FULFILLMENT_UNAVAILABLE", "The selected dealer location does not support the requested fulfillment method.");
      }
    }
    const availableSnapshots = await prisma.inventorySnapshot.findMany({
      where: { skuId: { in: items.map((item) => item.skuId) }, ...(requestedDealerLocationId ? { dealerLocationId: requestedDealerLocationId } : {}) }
    });
    const dealerLocationId = requestedDealerLocationId ?? availableSnapshots.find((snapshot) =>
      items.every((item) => availableSnapshots.some((candidate) => candidate.skuId === item.skuId && candidate.dealerLocationId === snapshot.dealerLocationId && candidate.quantityOnHand - candidate.quantityReserved >= item.quantity))
    )?.dealerLocationId;
    if (!dealerLocationId) return publicError(context, 409, "INVENTORY_NO_DEALER", "No single dealer location can fulfill this cart.");
    const snapshots = availableSnapshots.filter((snapshot) => snapshot.dealerLocationId === dealerLocationId);
    const oldestAllowedSnapshot = new Date(Date.now() - config.inventorySnapshotTtlMs);
    if (snapshots.some((snapshot) => snapshot.updatedAt < oldestAllowedSnapshot)) {
      return publicError(context, 409, "INVENTORY_REFRESHING", "Inventory availability is being refreshed. Please try again shortly.");
    }
    for (const item of items) {
      const snapshot = snapshots.find((candidate) => candidate.skuId === item.skuId);
      if (!snapshot || snapshot.quantityOnHand - snapshot.quantityReserved < item.quantity) return publicError(context, 409, "INVENTORY_INSUFFICIENT", `Insufficient inventory for ${item.skuCode}.`);
    }
    const fulfillingLocation = await prisma.dealerLocation.findUnique({ where: { id: dealerLocationId }, select: { province: true } });
    const combinedTaxRate = await resolveCombinedTaxRate(fulfillingLocation?.province);
    const subtotalCents = items.reduce((total, item) => total + item.lineTotalCents, 0);
    const { taxCents, shippingCents } = computeCheckoutTotals(
      subtotalCents,
      combinedTaxRate,
      fulfillment,
      config.deliveryFlatFeeCents
    );
    let session;
    try {
      session = await prisma.$transaction(async (transaction) => {
        const paymentSession = await transaction.paymentSession.create({
          data: { userId: resolved.userId, cartId: resolved.cart.id, guestEmail: email, guestFirstName: firstName, guestLastName: lastName, guestPhone: phone, guestOrderToken: randomBytes(24).toString("base64url"), fulfillment, paymentMethod, notes, dealerLocationId, items, subtotalCents, taxCents, shippingCents, totalCents: subtotalCents + taxCents + shippingCents, expiresAt: new Date(Date.now() + 30 * 60 * 1000) }
        });
        for (const item of items) {
        const snapshot = snapshots.find((candidate) => candidate.skuId === item.skuId);
        if (!snapshot) throw new InventoryConflictError("Inventory snapshot disappeared during checkout.", "INVENTORY_REFRESHING");
        const reserved = await transaction.$executeRaw`
          UPDATE "inventory_snapshots"
          SET "quantityReserved" = "quantityReserved" + ${item.quantity}
          WHERE "id" = ${snapshot.id}
            AND "quantityOnHand" - "quantityReserved" >= ${item.quantity}
        `;
        if (reserved !== 1) throw new InventoryConflictError(`Insufficient inventory for ${item.skuCode}.`, "INVENTORY_INSUFFICIENT");
          await transaction.inventoryReservation.create({ data: { skuId: item.skuId, dealerLocationId, paymentSessionId: paymentSession.id, quantity: item.quantity, expiresAt: paymentSession.expiresAt } });
        }
        return paymentSession;
      });
    } catch (error) {
      if (error instanceof InventoryConflictError) {
        return publicError(context, 409, error.code, error.message);
      }
      throw error;
    }
    const payment = await getPaymentProvider().initiate({
      paymentSessionId: session.id,
      amountCents: session.totalCents,
      currency: session.currency,
      email
    });
    return context.json(
      {
        data: { id: session.id, status: session.status, total: money(session.totalCents, session.currency), expiresAt: session.expiresAt.toISOString(), guestOrderToken: session.guestOrderToken },
        meta: { ...(resolved.cartToken ? { cartToken: resolved.cartToken } : {}), payment }
      },
      201
    );
  });

  routes.get("/payments/sessions/:id", async (context) => {
    const session = await prisma.paymentSession.findUnique({ where: { id: context.req.param("id") } });
    if (!session) return publicError(context, 404, "PAYMENT_SESSION_NOT_FOUND", "Payment session not found.");
    const customer = await getSessionFromRequest(context);
    if (customer?.user.id !== session.userId && context.req.query("token") !== session.guestOrderToken) return publicError(context, 403, "PAYMENT_SESSION_DENIED", "Payment session access is denied.");
    return context.json({ data: { id: session.id, status: session.status, total: money(session.totalCents, session.currency), expiresAt: session.expiresAt.toISOString() } });
  });

  routes.post("/payments/callback", async (context) => {
    const body = (await context.req.json().catch(() => null)) as { sessionId?: unknown; providerPaymentId?: unknown; ticket?: unknown; status?: unknown } | null;
    const sessionId = optionalString(body?.sessionId);
    const providerPaymentId = optionalString(body?.providerPaymentId);
    const ticket = optionalString(body?.ticket);
    const provider = getPaymentProvider();
    if (!sessionId || body?.status !== "paid" || (provider.name === "manual" && !providerPaymentId)) {
      return publicError(context, 400, "COMMERCE_INVALID", "paid sessionId and providerPaymentId are required.");
    }
    const paymentSession = await prisma.paymentSession.findUnique({ where: { id: sessionId } });
    if (!paymentSession) return publicError(context, 404, "PAYMENT_SESSION_NOT_FOUND", "Payment session not found.");
    const verification = await provider.verify({
      paymentSessionId: sessionId,
      amountCents: paymentSession.totalCents,
      currency: paymentSession.currency,
      providerPaymentId,
      ticket,
      signature: context.req.header("x-payment-signature")
    });
    if (!verification.ok) return publicError(context, 401, "COMMERCE_ACCESS_DENIED", "Payment signature is invalid.");
    const confirmedProviderPaymentId = verification.providerPaymentId;
    const result = await prisma.$transaction(async (transaction) => {
      const session = await transaction.paymentSession.findUnique({ where: { id: sessionId } });
      if (!session) return undefined;
      const existingOrder = await transaction.order.findUnique({ where: { paymentSessionId: session.id }, include: { items: true } });
      if (existingOrder) return existingOrder;
      if (session.status !== "pending" || session.expiresAt <= new Date()) return null;
      const claimedSession = await transaction.paymentSession.updateMany({
        where: { id: session.id, status: "pending", expiresAt: { gt: new Date() } },
        data: { status: "paid", providerPaymentId: confirmedProviderPaymentId, paidAt: new Date() }
      });
      if (claimedSession.count === 0) {
        return transaction.order.findUnique({ where: { paymentSessionId: session.id }, include: { items: true } });
      }
      const items = session.items as unknown as CheckoutItem[];
      const order = await transaction.order.create({
        data: {
          userId: session.userId,
          email: session.guestEmail,
          firstName: session.guestFirstName,
          lastName: session.guestLastName,
          phone: session.guestPhone,
          guestOrderToken: session.guestOrderToken,
          paymentSessionId: session.id,
          fulfillment: session.fulfillment,
          paymentMethod: session.paymentMethod,
          notes: session.notes,
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
      const activeReservations = await transaction.inventoryReservation.findMany({
        where: { paymentSessionId: session.id, status: "active" }
      });
      for (const reservation of activeReservations) {
        const snapshot = await transaction.inventorySnapshot.findFirst({
          where: { skuId: reservation.skuId, dealerLocationId: reservation.dealerLocationId }
        });
        if (snapshot) {
          await transaction.inventorySnapshot.update({
            where: { id: snapshot.id },
            data: { quantityReserved: { decrement: reservation.quantity } }
          });
        }
      }
      await transaction.inventoryReservation.updateMany({ where: { paymentSessionId: session.id, status: "active" }, data: { status: "consumed" } });
      await transaction.orderStatusEvent.create({ data: { orderId: order.id, status: "paid", source: "payment_callback", payload: { providerPaymentId } } });
      await queueCustomerEmail(transaction, {
        templateKey: "order_confirmation",
        toEmail: session.guestEmail,
        payload: {
          orderId: order.id,
          firstName: session.guestFirstName,
          totalCents: order.totalCents,
          totalDisplay: `${(order.totalCents / 100).toFixed(2)} ${order.currency}`,
          currency: order.currency,
          fulfillment: order.fulfillment
        }
      });
      await transaction.erpSyncJob.create({ data: { type: "order_create", payload: { orderId: order.id, paymentSessionId: session.id } } });
      // Sync registered customers into the ERP CRM after their first paid order.
      if (session.userId) {
        await transaction.erpSyncJob.create({ data: { type: "customer_sync", payload: { userId: session.userId, orderId: order.id } } });
      }
      return order;
    });
    if (result === undefined) return publicError(context, 404, "PAYMENT_SESSION_NOT_FOUND", "Payment session not found.");
    if (result === null) return publicError(context, 409, "COMMERCE_INVALID", "Payment session cannot be paid.");
    return context.json({ data: formatOrder(result) });
  });

  routes.get("/orders/:id/status", async (context) => {
    const order = await prisma.order.findUnique({ where: { id: context.req.param("id") }, include: { items: true } });
    if (!order) return publicError(context, 404, "COMMERCE_NOT_FOUND", "Order not found.");
    const session = await getSessionFromRequest(context);
    if (session?.user.id !== order.userId && context.req.query("token") !== order.guestOrderToken) return publicError(context, 403, "COMMERCE_ACCESS_DENIED", "Order access is denied.");
    return context.json({ data: { id: order.id, status: order.status, createdAt: order.createdAt.toISOString() } });
  });

  routes.get("/orders/:id", async (context) => {
    const order = await prisma.order.findUnique({ where: { id: context.req.param("id") }, include: { items: true } });
    if (!order) return publicError(context, 404, "COMMERCE_NOT_FOUND", "Order not found.");
    const session = await getSessionFromRequest(context);
    if (session?.user.id !== order.userId && context.req.query("token") !== order.guestOrderToken) return publicError(context, 403, "COMMERCE_ACCESS_DENIED", "Order access is denied.");
    return context.json({ data: formatOrder(order) });
  });

  routes.post("/inventory/reservations", async (context) => {
    const body = (await context.req.json().catch(() => null)) as { productId?: unknown; quantity?: unknown; dealerLocationId?: unknown } | null;
    const sku = await findSku(optionalString(body?.productId) ?? "");
    const quantity = Number(body?.quantity);
    if (!sku || !Number.isInteger(quantity) || quantity < 1) return publicError(context, 400, "COMMERCE_INVALID", "productId and positive quantity are required.");
    const dealerLocationId = optionalString(body?.dealerLocationId);
    if (!dealerLocationId) return publicError(context, 400, "COMMERCE_INVALID", "dealerLocationId is required.");
    const snapshot = await prisma.inventorySnapshot.findFirst({ where: { skuId: sku.id, dealerLocationId } });
    if (!snapshot || snapshot.quantityOnHand - snapshot.quantityReserved < quantity) return publicError(context, 409, "INVENTORY_INSUFFICIENT", "Insufficient inventory.");
    const ownerToken = randomBytes(24).toString("base64url");
    let reservation;
    try {
      reservation = await prisma.$transaction(async (transaction) => {
        const reserved = await transaction.$executeRaw`
          UPDATE "inventory_snapshots"
          SET "quantityReserved" = "quantityReserved" + ${quantity}
          WHERE "id" = ${snapshot.id}
            AND "quantityOnHand" - "quantityReserved" >= ${quantity}
        `;
        if (reserved !== 1) throw new InventoryConflictError("Inventory is no longer available.", "INVENTORY_INSUFFICIENT");
        return transaction.inventoryReservation.create({ data: { skuId: sku.id, dealerLocationId, ownerToken, quantity, expiresAt: new Date(Date.now() + 30 * 60 * 1000) } });
      });
    } catch (error) {
      if (error instanceof InventoryConflictError) {
        return publicError(context, 409, error.code, error.message);
      }
      throw error;
    }
    return context.json({ data: { reservationId: reservation.id, reservationToken: ownerToken, expiresAt: reservation.expiresAt.toISOString() } }, 201);
  });

  routes.delete("/inventory/reservations/:id", async (context) => {
    const reservation = await prisma.inventoryReservation.findUnique({ where: { id: context.req.param("id") } });
    if (!reservation || reservation.status !== "active" || !reservation.ownerToken || context.req.header("x-reservation-token") !== reservation.ownerToken) return publicError(context, 404, "COMMERCE_NOT_FOUND", "Active reservation not found.");
    await prisma.$transaction(async (transaction) => {
      await transaction.inventoryReservation.update({ where: { id: reservation.id }, data: { status: "released" } });
      const snapshot = await transaction.inventorySnapshot.findFirst({ where: { skuId: reservation.skuId, dealerLocationId: reservation.dealerLocationId } });
      if (snapshot) await transaction.inventorySnapshot.update({ where: { id: snapshot.id }, data: { quantityReserved: { decrement: reservation.quantity } } });
    });
    return context.json({ data: { ok: true } });
  });

  routes.get("/products/:identifier/inventory", async (context) => {
    const sku = await findSku(context.req.param("identifier"));
    if (!sku) return publicError(context, 404, "COMMERCE_NOT_FOUND", "Product not found.");
    const snapshots = await prisma.inventorySnapshot.findMany({ where: { skuId: sku.id }, include: { dealerLocation: { include: { dealer: true } } } });
    const locations = snapshots.map((snapshot) => ({ dealerLocationId: snapshot.dealerLocationId, dealerId: snapshot.dealerLocation?.dealerId, dealerName: snapshot.dealerLocation?.dealer.name, quantityOnHand: snapshot.quantityOnHand, quantityReserved: snapshot.quantityReserved, quantityAvailable: Math.max(0, snapshot.quantityOnHand - snapshot.quantityReserved), updatedAt: snapshot.updatedAt.toISOString() }));
    return context.json({ data: { productId: sku.productId, sku: sku.skuCode, locations, totalAvailable: locations.reduce((total, location) => total + location.quantityAvailable, 0) } });
  });

  routes.post("/products/inventory", async (context) => {
    const body = (await context.req.json().catch(() => null)) as { productIds?: unknown } | null;
    const productIds = Array.isArray(body?.productIds) ? body.productIds.filter((id): id is string => typeof id === "string") : [];
    if (productIds.length > MAX_BULK_INVENTORY_PRODUCTS) {
      return publicError(context, 400, "COMMERCE_INVALID", `productIds cannot contain more than ${MAX_BULK_INVENTORY_PRODUCTS} items.`);
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
    if (!session) return publicError(context, 401, "AUTH_REQUIRED", "Customer authentication is required.");
    const customer = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id }, include: { customerProfile: true } });
    return context.json({ data: { id: customer.id, email: customer.email, firstName: customer.customerProfile?.firstName, lastName: customer.customerProfile?.lastName, phone: customer.customerProfile?.phone } });
  });

  routes.patch("/account/me", async (context) => {
    const session = await requireCustomer(context);
    if (!session) return publicError(context, 401, "AUTH_REQUIRED", "Customer authentication is required.");
    const body = (await context.req.json().catch(() => null)) as { firstName?: unknown; lastName?: unknown; phone?: unknown } | null;
    const profile = await prisma.customerProfile.upsert({ where: { userId: session.user.id }, update: { firstName: optionalString(body?.firstName), lastName: optionalString(body?.lastName), phone: optionalString(body?.phone) }, create: { userId: session.user.id, firstName: optionalString(body?.firstName), lastName: optionalString(body?.lastName), phone: optionalString(body?.phone) } });
    return context.json({ data: profile });
  });

  routes.get("/account/addresses", async (context) => {
    const session = await requireCustomer(context);
    if (!session) return publicError(context, 401, "AUTH_REQUIRED", "Customer authentication is required.");
    return context.json({ data: await prisma.customerAddress.findMany({ where: { userId: session.user.id }, orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] }) });
  });

  routes.post("/account/addresses", async (context) => {
    const session = await requireCustomer(context);
    if (!session) return publicError(context, 401, "AUTH_REQUIRED", "Customer authentication is required.");
    const body = (await context.req.json().catch(() => null)) as Record<string, unknown> | null;
    const required = ["firstName", "lastName", "addressLine1", "city", "province", "postalCode"] as const;
    if (required.some((key) => !optionalString(body?.[key]))) return publicError(context, 400, "COMMERCE_INVALID", "Address name, line 1, city, province and postalCode are required.");
    const address = await prisma.customerAddress.create({ data: { userId: session.user.id, label: optionalString(body?.label), firstName: optionalString(body?.firstName)!, lastName: optionalString(body?.lastName)!, phone: optionalString(body?.phone), addressLine1: optionalString(body?.addressLine1)!, addressLine2: optionalString(body?.addressLine2), city: optionalString(body?.city)!, province: optionalString(body?.province)!, postalCode: optionalString(body?.postalCode)!, country: optionalString(body?.country) ?? "CA", isDefault: body?.isDefault === true } });
    return context.json({ data: address }, 201);
  });

  routes.patch("/account/addresses/:id", async (context) => {
    const session = await requireCustomer(context);
    if (!session) return publicError(context, 401, "AUTH_REQUIRED", "Customer authentication is required.");
    const address = await prisma.customerAddress.findFirst({ where: { id: context.req.param("id"), userId: session.user.id } });
    if (!address) return publicError(context, 404, "COMMERCE_NOT_FOUND", "Address not found.");
    const body = (await context.req.json().catch(() => null)) as Record<string, unknown> | null;
    return context.json({ data: await prisma.customerAddress.update({ where: { id: address.id }, data: { label: optionalString(body?.label), firstName: optionalString(body?.firstName), lastName: optionalString(body?.lastName), phone: optionalString(body?.phone), addressLine1: optionalString(body?.addressLine1), addressLine2: optionalString(body?.addressLine2), city: optionalString(body?.city), province: optionalString(body?.province), postalCode: optionalString(body?.postalCode), country: optionalString(body?.country), isDefault: typeof body?.isDefault === "boolean" ? body.isDefault : undefined } }) });
  });

  routes.delete("/account/addresses/:id", async (context) => {
    const session = await requireCustomer(context);
    if (!session) return publicError(context, 401, "AUTH_REQUIRED", "Customer authentication is required.");
    await prisma.customerAddress.deleteMany({ where: { id: context.req.param("id"), userId: session.user.id } });
    return context.json({ data: { ok: true } });
  });

  routes.get("/account/favorites", async (context) => {
    const session = await requireCustomer(context);
    if (!session) return publicError(context, 401, "AUTH_REQUIRED", "Customer authentication is required.");
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
    if (!session) return publicError(context, 401, "AUTH_REQUIRED", "Customer authentication is required.");
    const body = (await context.req.json().catch(() => null)) as { productId?: unknown } | null;
    const productId = optionalString(body?.productId);
    if (!productId || !await prisma.product.findFirst({ where: { id: productId, status: "active" } })) return publicError(context, 404, "COMMERCE_NOT_FOUND", "Active product not found.");
    const favorite = await prisma.favorite.upsert({
      where: { userId_productId: { userId: session.user.id, productId } },
      update: {},
      create: { userId: session.user.id, productId },
      include: favoriteInclude
    });
    const formatted = formatFavorite(favorite);
    if (!formatted) return publicError(context, 409, "COMMERCE_NOT_FOUND", "Active product pricing was not found.");
    return context.json({ data: formatted }, 201);
  });

  routes.delete("/account/favorites/:productId", async (context) => {
    const session = await requireCustomer(context);
    if (!session) return publicError(context, 401, "AUTH_REQUIRED", "Customer authentication is required.");
    await prisma.favorite.deleteMany({ where: { userId: session.user.id, productId: context.req.param("productId") } });
    return context.json({ data: { ok: true } });
  });

  routes.get("/account/orders", async (context) => {
    const session = await requireCustomer(context);
    if (!session) return publicError(context, 401, "AUTH_REQUIRED", "Customer authentication is required.");
    const orders = await prisma.order.findMany({ where: { userId: session.user.id }, include: { items: true }, orderBy: { createdAt: "desc" } });
    return context.json({ data: orders.map(formatOrder) });
  });

  routes.get("/account/orders/:id", async (context) => {
    const session = await requireCustomer(context);
    if (!session) return publicError(context, 401, "AUTH_REQUIRED", "Customer authentication is required.");
    const order = await prisma.order.findFirst({ where: { id: context.req.param("id"), userId: session.user.id }, include: { items: true } });
    if (!order) return publicError(context, 404, "COMMERCE_NOT_FOUND", "Order not found.");
    return context.json({ data: formatOrder(order) });
  });

  routes.post("/integrations/erp/webhooks/order-status", async (context) => {
    const body = (await context.req.json().catch(() => null)) as { orderId?: unknown; status?: unknown; externalId?: unknown; erpSystem?: unknown } | null;
    const orderId = optionalString(body?.orderId);
    const status = body?.status;
    const externalId = optionalString(body?.externalId);
    const erpSystem = optionalString(body?.erpSystem) ?? "erp";
    const secret = config.erpWebhookSecret;
    // Fail closed: without a configured secret we cannot verify authenticity, so
    // never process the webhook (including in development) rather than trusting it.
    if (!secret) return publicError(context, 401, "COMMERCE_ACCESS_DENIED", "ERP webhook signature is invalid.");
    const expected = orderId && externalId ? createHmac("sha256", secret).update(`${orderId}:${externalId}:${status}`).digest("hex") : undefined;
    if (!signaturesMatch(expected, context.req.header("x-erp-signature"))) return publicError(context, 401, "COMMERCE_ACCESS_DENIED", "ERP webhook signature is invalid.");
    if (!orderId || !["processing", "fulfilled", "cancelled"].includes(String(status))) return publicError(context, 400, "COMMERCE_INVALID", "Valid orderId and order status are required.");
    const normalizedStatus = status as ErpOrderStatus;
    const payload = erpOrderStatusPayload({ orderId, status: normalizedStatus, externalId: externalId!, erpSystem });
    const existingEvent = await database.erpWebhookEvent.findFirst({ where: { erpSystem, eventType: "order-status", externalId } });
    if (existingEvent) return context.json({ data: { ok: true, duplicate: true } });
    const order = await database.order.findUnique({ where: { id: orderId } });
    if (!order) return publicError(context, 404, "COMMERCE_NOT_FOUND", "Order not found.");
    try {
      await database.$transaction(async (transaction) => {
        await transaction.erpWebhookEvent.create({ data: { erpSystem, eventType: "order-status", externalId, payload, processedAt: new Date() } });
        await transaction.order.update({ where: { id: order.id }, data: { status: normalizedStatus } });
        await transaction.orderStatusEvent.create({ data: { orderId: order.id, status: normalizedStatus, source: `erp:${erpSystem}`, payload } });
      });
    } catch (error) {
      // The unique key is the transaction-safe idempotency authority. A concurrent
      // delivery can pass the preflight read but lose the insert race; only that
      // exact conflict is normalized to duplicate success.
      if (isDuplicateErpWebhookEventConflict(error)) {
        return context.json({ data: { ok: true, duplicate: true } });
      }
      throw error;
    }
    return context.json({ data: { ok: true } });
  });

  routes.post("/integrations/erp/webhooks/shipment", async (context) => {
    const body = (await context.req.json().catch(() => null)) as {
      orderId?: unknown;
      shipmentId?: unknown;
      status?: unknown;
      trackingNumber?: unknown;
      erpSystem?: unknown;
    } | null;
    const orderId = optionalString(body?.orderId);
    const shipmentId = optionalString(body?.shipmentId);
    const status = optionalString(body?.status);
    const trackingNumber = optionalString(body?.trackingNumber);
    const erpSystem = optionalString(body?.erpSystem) ?? "erp";
    const secret = config.erpWebhookSecret;
    if (!secret) return publicError(context, 401, "COMMERCE_ACCESS_DENIED", "ERP webhook signature is invalid.");
    const expected = orderId && shipmentId
      ? createHmac("sha256", secret).update(`${orderId}:${shipmentId}:${status ?? ""}`).digest("hex")
      : undefined;
    if (!signaturesMatch(expected, context.req.header("x-erp-signature"))) {
      return publicError(context, 401, "COMMERCE_ACCESS_DENIED", "ERP webhook signature is invalid.");
    }
    if (!orderId || !shipmentId) {
      return publicError(context, 400, "COMMERCE_INVALID", "orderId and shipmentId are required.");
    }
    const externalId = shipmentId;
    const existingEvent = await database.erpWebhookEvent.findFirst({
      where: { erpSystem, eventType: "shipment", externalId }
    });
    if (existingEvent) return context.json({ data: { ok: true, duplicate: true } });
    const order = await database.order.findUnique({ where: { id: orderId } });
    if (!order) return publicError(context, 404, "COMMERCE_NOT_FOUND", "Order not found.");
    const payload = { orderId, shipmentId, status, trackingNumber, erpSystem };
    try {
      await database.$transaction(async (transaction) => {
        await transaction.erpWebhookEvent.create({
          data: { erpSystem, eventType: "shipment", externalId, payload, processedAt: new Date() }
        });
        if (status === "shipped" || status === "delivered") {
          await transaction.order.update({
            where: { id: order.id },
            data: { status: status === "delivered" ? "fulfilled" : "processing" }
          });
          await transaction.orderStatusEvent.create({
            data: {
              orderId: order.id,
              status: status === "delivered" ? "fulfilled" : "processing",
              source: `erp:${erpSystem}:shipment`,
              payload
            }
          });
        }
      });
    } catch (error) {
      if (isDuplicateErpWebhookEventConflict(error)) {
        return context.json({ data: { ok: true, duplicate: true } });
      }
      throw error;
    }
    return context.json({ data: { ok: true } });
  });

  return routes;
}
