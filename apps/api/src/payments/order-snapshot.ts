import type { PaymentSession, Prisma } from "@vanstro/db";

export type CheckoutItem = {
  skuId: string;
  skuCode: string;
  productName: string;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
  currency: string;
};

/**
 * Immutable Order snapshot taken from a PaymentSession + its checkout items.
 * The same data is written once at checkout (status `pending_payment`) and
 * promoted to `paid` by the payment callback, so the snapshot must be shared
 * between the two paths to keep price/tax/address/dealer/items identical.
 */
export function orderSnapshotData(
  session: PaymentSession,
  items: CheckoutItem[],
  status: "pending_payment" | "paid"
): Prisma.OrderUncheckedCreateInput {
  return {
    userId: session.userId,
    email: session.guestEmail,
    firstName: session.guestFirstName,
    lastName: session.guestLastName,
    phone: session.guestPhone,
    guestOrderToken: session.guestOrderToken,
    guestTokenExpiresAt: session.userId ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    paymentSessionId: session.id,
    status,
    fulfillment: session.fulfillment,
    paymentMethod: session.paymentMethod,
    notes: session.notes,
    shippingAddressLine1: session.shippingAddressLine1,
    shippingAddressLine2: session.shippingAddressLine2,
    shippingCity: session.shippingCity,
    shippingProvince: session.shippingProvince,
    shippingPostalCode: session.shippingPostalCode,
    shippingCountry: session.shippingCountry,
    dealerLocationId: session.dealerLocationId,
    subtotalCents: session.subtotalCents,
    discountCents: session.discountCents,
    promotionKey: session.promotionKey,
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
  };
}
