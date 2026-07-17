import type {
  ApiResult,
  AuthSession,
  Cart,
  CheckoutSession,
  CurrencyCode,
  Dealer,
  FavoriteItem,
  Money,
  ProductSummary,
  WebsiteApiProduct
} from "./api-contract";

export type RuntimeValidator<T> = (value: unknown, path?: string) => T;

export class ApiValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiValidationError";
  }
}

function fail(path: string, expectation: string): never {
  throw new ApiValidationError(`${path} must be ${expectation}.`);
}

export function objectValue(value: unknown, path = "value"): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return fail(path, "an object");
  }
  return value as Record<string, unknown>;
}

export function stringValue(value: unknown, path = "value"): string {
  if (typeof value !== "string" || !value.trim()) return fail(path, "a non-empty string");
  return value;
}

export function numberValue(value: unknown, path = "value"): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fail(path, "a finite number");
  return value;
}

export function booleanValue(value: unknown, path = "value"): boolean {
  if (typeof value !== "boolean") return fail(path, "a boolean");
  return value;
}

export function arrayOf<T>(validator: RuntimeValidator<T>): RuntimeValidator<T[]> {
  return (value, path = "value") => {
    if (!Array.isArray(value)) return fail(path, "an array");
    return value.map((item, index) => validator(item, `${path}[${index}]`));
  };
}

export function validateApiResult<T>(
  value: unknown,
  validateData: RuntimeValidator<T>
): ApiResult<T> {
  const result = objectValue(value, "response");
  if (!("data" in result)) return fail("response.data", "present");

  if (result.meta !== undefined) objectValue(result.meta, "response.meta");

  return {
    data: validateData(result.data, "response.data"),
    ...(result.meta === undefined ? {} : { meta: result.meta as ApiResult<T>["meta"] })
  };
}

function validateMoney(value: unknown, path = "money"): Money {
  const money = objectValue(value, path);
  const currencyValue = stringValue(money.currency, `${path}.currency`);
  if (currencyValue !== "CAD" && currencyValue !== "USD") {
    return fail(`${path}.currency`, "CAD or USD");
  }
  const currency: CurrencyCode = currencyValue;
  return { amount: numberValue(money.amount, `${path}.amount`), currency };
}

function validateImage(value: unknown, path = "image") {
  const image = objectValue(value, path);
  return {
    url: stringValue(image.url, `${path}.url`),
    alt: stringValue(image.alt, `${path}.alt`),
    ...(typeof image.width === "number" ? { width: image.width } : {}),
    ...(typeof image.height === "number" ? { height: image.height } : {})
  };
}

function validateCartProduct(value: unknown, path = "product") {
  const product = objectValue(value, path);
  const images = arrayOf(validateImage)(product.images, `${path}.images`);
  if (images.length === 0) return fail(`${path}.images`, "a non-empty image array");
  return {
    id: stringValue(product.id, `${path}.id`),
    slug: stringValue(product.slug, `${path}.slug`),
    sku: stringValue(product.sku, `${path}.sku`),
    name: stringValue(product.name, `${path}.name`),
    ...(typeof product.category === "string" && product.category.trim()
      ? { category: product.category }
      : {}),
    unit: stringValue(product.unit, `${path}.unit`),
    dimensions: typeof product.dimensions === "string" ? product.dimensions : "",
    images,
    inStock: booleanValue(product.inStock, `${path}.inStock`)
  };
}

export const validateCart: RuntimeValidator<Cart> = (value, path = "cart") => {
  const cart = objectValue(value, path);
  return {
    id: stringValue(cart.id, `${path}.id`),
    items: arrayOf((itemValue, itemPath = "item") => {
      const item = objectValue(itemValue, itemPath);
      return {
        id: stringValue(item.id, `${itemPath}.id`),
        product: validateCartProduct(item.product, `${itemPath}.product`),
        quantity: numberValue(item.quantity, `${itemPath}.quantity`),
        unitPrice: validateMoney(item.unitPrice, `${itemPath}.unitPrice`),
        lineTotal: validateMoney(item.lineTotal, `${itemPath}.lineTotal`)
      };
    })(cart.items, `${path}.items`),
    subtotal: validateMoney(cart.subtotal, `${path}.subtotal`)
  };
};

export const validateProductSummary: RuntimeValidator<ProductSummary> = (
  value,
  path = "product"
) => {
  const product = objectValue(value, path);
  const images = arrayOf(validateImage)(product.images, `${path}.images`);
  if (images.length === 0) return fail(`${path}.images`, "a non-empty image array");
  return {
    id: stringValue(product.id, `${path}.id`),
    slug: stringValue(product.slug, `${path}.slug`),
    sku: stringValue(product.sku, `${path}.sku`),
    name: stringValue(product.name, `${path}.name`),
    category: stringValue(product.category, `${path}.category`),
    price: validateMoney(product.price, `${path}.price`),
    unit: stringValue(product.unit, `${path}.unit`),
    dimensions: typeof product.dimensions === "string" ? product.dimensions : "",
    images,
    inStock: booleanValue(product.inStock, `${path}.inStock`)
  };
};

export const validateFavoriteItem: RuntimeValidator<FavoriteItem> = (
  value,
  path = "favorite"
) => {
  const favorite = objectValue(value, path);
  return {
    id: stringValue(favorite.id, `${path}.id`),
    product: validateProductSummary(favorite.product, `${path}.product`)
  };
};

export const validateWebsiteApiProduct: RuntimeValidator<WebsiteApiProduct> = (
  value,
  path = "product"
) => {
  const product = objectValue(value, path);
  const primarySku = product.primarySku == null
    ? null
    : objectValue(product.primarySku, `${path}.primarySku`);

  return {
    ...(product as WebsiteApiProduct),
    id: stringValue(product.id, `${path}.id`),
    slug: stringValue(product.slug, `${path}.slug`),
    name: stringValue(product.name, `${path}.name`),
    primarySku: primarySku
      ? {
          ...(primarySku as WebsiteApiProduct["primarySku"]),
          id: stringValue(primarySku.id, `${path}.primarySku.id`),
          skuCode: stringValue(primarySku.skuCode, `${path}.primarySku.skuCode`),
          name: stringValue(primarySku.name, `${path}.primarySku.name`)
        }
      : null
  };
};

export const validateCheckoutSession: RuntimeValidator<CheckoutSession> = (
  value,
  path = "checkoutSession"
) => {
  const session = objectValue(value, path);
  const status = stringValue(session.status, `${path}.status`);
  if (!["pending", "paid", "expired", "cancelled", "failed"].includes(status)) {
    return fail(`${path}.status`, "a supported checkout status");
  }
  return {
    id: stringValue(session.id, `${path}.id`),
    status: status as CheckoutSession["status"],
    expiresAt: stringValue(session.expiresAt, `${path}.expiresAt`),
    total: validateMoney(session.total, `${path}.total`),
    ...(typeof session.guestOrderToken === "string"
      ? { guestOrderToken: session.guestOrderToken }
      : {})
  };
};

export const validateAuthSession: RuntimeValidator<AuthSession> = (
  value,
  path = "authSession"
) => {
  const session = objectValue(value, path);
  const user = objectValue(session.user, `${path}.user`);
  return {
    user: {
      id: stringValue(user.id, `${path}.user.id`),
      email: stringValue(user.email, `${path}.user.email`),
      ...(typeof user.firstName === "string" ? { firstName: user.firstName } : {}),
      ...(typeof user.lastName === "string" ? { lastName: user.lastName } : {}),
      ...(user.role === "customer" || user.role === "dealer" || user.role === "admin"
        ? { role: user.role }
        : {})
    },
    ...(typeof session.accessToken === "string" ? { accessToken: session.accessToken } : {})
  };
};

export const validateDealer: RuntimeValidator<Dealer> = (value, path = "dealer") => {
  const dealer = objectValue(value, path);
  return {
    id: stringValue(dealer.id, `${path}.id`),
    name: stringValue(dealer.name, `${path}.name`),
    address: stringValue(dealer.address, `${path}.address`),
    city: stringValue(dealer.city, `${path}.city`),
    province: stringValue(dealer.province, `${path}.province`),
    postalCode: typeof dealer.postalCode === "string" ? dealer.postalCode : "",
    phone: typeof dealer.phone === "string" ? dealer.phone : "",
    availableForPickup: booleanValue(
      dealer.availableForPickup,
      `${path}.availableForPickup`
    )
  };
};

export function validateOk(value: unknown, path = "result") {
  const result = objectValue(value, path);
  if (result.ok !== true) return fail(`${path}.ok`, "true");
  return { ok: true as const };
}

export function validateIdStatus(value: unknown, path = "result") {
  const result = objectValue(value, path);
  const idEntry = ["leadId", "applicationId", "reviewId"].find(
    (key) => typeof result[key] === "string" && Boolean((result[key] as string).trim())
  );
  if (!idEntry) return fail(path, "an identified submission result");
  return {
    [idEntry]: result[idEntry],
    status: stringValue(result.status, `${path}.status`)
  } as Record<string, string>;
}

export function validateContactLeadResult(
  value: unknown,
  path = "result"
): { leadId: string; status: "new" | "routed" } {
  const result = objectValue(value, path);
  const status = stringValue(result.status, `${path}.status`);
  if (status !== "new" && status !== "routed") {
    return fail(`${path}.status`, "new or routed");
  }
  return {
    leadId: stringValue(result.leadId, `${path}.leadId`),
    status
  };
}

export function validateDealerApplicationResult(
  value: unknown,
  path = "result"
): { applicationId: string; status: "submitted" | "under_review" } {
  const result = objectValue(value, path);
  const status = stringValue(result.status, `${path}.status`);
  if (status !== "submitted" && status !== "under_review") {
    return fail(`${path}.status`, "submitted or under_review");
  }
  return {
    applicationId: stringValue(result.applicationId, `${path}.applicationId`),
    status
  };
}
