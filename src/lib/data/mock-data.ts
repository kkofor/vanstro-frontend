import {
  ArticleDetail,
  ArticleSummary,
  Banner,
  Cart,
  Dealer,
  FavoriteItem,
  ProductDetail,
  ProductCommerce,
  ProductInventory,
  ProductSummary
} from "@/lib/api/api-contract";
import { assetPath } from "@/lib/assets";
import { getInventoryStatus } from "@/lib/commerce/product-inventory";
import { originalSiteImageLibrary } from "@/lib/data/original-site-image-library";
import { originalSiteImportedProducts } from "@/lib/data/original-site-products";
import {
  mb01ProductMetadataById,
  mb01Products
} from "@/lib/data/mb01-products";
import { formatProductSize } from "@/lib/product/product-display";

export const banners: Banner[] = [
  {
    id: "home-kitchen-cabinets",
    title: "Kitchen cabinets, vanities and home materials delivered across Canada",
    subtitle:
      "Shop ready-to-order cabinets, vanities, trim and home improvement supplies online. VanStro coordinates nationwide delivery and local dealer service for pickup, delivery and project support.",
    href: "/products",
    image: {
      url: assetPath("/assets/generated/vanstro-hero-white-v1.png"),
      alt: "White VanStro kitchen cabinets and showroom sample doors"
    }
  }
];

const featuredProducts: ProductSummary[] = [
  {
    id: "269",
    slug: "base-cabinet-b33",
    sku: "011090130",
    name: "Base Cabinet B33",
    category: "Kitchen Cabinets",
    dimensions: "33 in W x 34 in H x 24 in D",
    finish: "MDF + PVC",
    colorName: "PVC white",
    colorHex: "#f4f2ee",
    dealerStock: {
      toronto: 14,
      vancouver: 7,
      calgary: 3,
      montreal: 6
    },
    price: { amount: 525, currency: "CAD" },
    unit: "each",
    images: [
      {
        url: assetPath("/assets/original-site/images-202605-source_img-269_P_1778653714057.JPG"),
        alt: "Base Cabinet B33"
      },
      {
        url: assetPath("/assets/original-site/images-202605-source_img-269_P_1778653752342.JPG"),
        alt: "Base Cabinet B33 alternate white cabinet view"
      }
    ],
    inStock: true
  },
  {
    id: "281",
    slug: "base-corner-cabinet-bbc36",
    sku: "011090281",
    name: "Base Corner Cabinet BBC36",
    category: "Kitchen Cabinets",
    dimensions: "36 in W x 34 in H x 24 in D",
    finish: "MDF + PVC",
    colorName: "PVC white",
    colorHex: "#f4f2ee",
    dealerStock: {
      toronto: 8,
      vancouver: 4,
      calgary: 2,
      montreal: 5
    },
    price: { amount: 640, currency: "CAD" },
    unit: "each",
    images: [
      {
        url: assetPath("/assets/original-site/images-202605-source_img-281_P_1778654984846.JPG"),
        alt: "Base Corner Cabinet BBC36"
      },
      {
        url: assetPath("/assets/original-site/images-202605-source_img-281_P_1778655020951.JPG"),
        alt: "Base Corner Cabinet BBC36 alternate view"
      }
    ],
    inStock: true
  },
  {
    id: "343",
    slug: "wall-corner-cabinet-wdc2430",
    sku: "013090343",
    name: "Wall Corner Cabinet WDC2430",
    category: "Kitchen Cabinets",
    dimensions: "24 in W x 30 in H x 12 in D",
    finish: "MDF + PVC",
    colorName: "PVC white",
    colorHex: "#f4f2ee",
    dealerStock: {
      toronto: 10,
      vancouver: 4,
      calgary: 3,
      montreal: 5
    },
    price: { amount: 385, currency: "CAD" },
    unit: "each",
    images: [
      {
        url: assetPath("/assets/original-site/images-202605-source_img-343_P_1778659060829.JPG"),
        alt: "Wall Corner Cabinet WDC2430"
      },
      {
        url: assetPath("/assets/original-site/images-202605-source_img-343_P_1778659132956.JPG"),
        alt: "Wall Corner Cabinet WDC2430 alternate view"
      }
    ],
    inStock: true
  },
  {
    id: "353",
    slug: "tall-utility-cabinet-u188424",
    sku: "017600353",
    name: "Tall Utility Cabinet U188424",
    category: "Kitchen Cabinets",
    dimensions: "18 in W x 84 in H x 24 in D",
    finish: "MDF + PVC",
    colorName: "PVC white",
    colorHex: "#f5f4f0",
    dealerStock: {
      toronto: 4,
      vancouver: 2,
      calgary: 1,
      montreal: 2
    },
    price: { amount: 760, currency: "CAD" },
    unit: "each",
    images: [
      {
        url: assetPath("/assets/original-site/images-202605-source_img-353_P_1778668472540.JPG"),
        alt: "Tall Utility Cabinet U188424"
      },
      {
        url: assetPath("/assets/original-site/images-202605-source_img-353_P_1778668533922.JPG"),
        alt: "Tall Utility Cabinet U188424 alternate view"
      }
    ],
    inStock: true
  },
  {
    id: "354",
    slug: "tall-utility-cabinet-u189024",
    sku: "017600354",
    name: "Tall Utility Cabinet U189024",
    category: "Kitchen Cabinets",
    dimensions: "18 in W x 90 in H x 24 in D",
    finish: "MDF + PVC",
    colorName: "PVC white",
    colorHex: "#f5f4f0",
    dealerStock: {
      toronto: 4,
      vancouver: 2,
      calgary: 1,
      montreal: 3
    },
    price: { amount: 815, currency: "CAD" },
    unit: "each",
    images: [
      {
        url: assetPath("/assets/original-site/images-202605-source_img-354_P_1778668574069.JPG"),
        alt: "Tall Utility Cabinet U189024"
      },
      {
        url: assetPath("/assets/original-site/images-202605-source_img-354_P_1778668627729.JPG"),
        alt: "Tall Utility Cabinet U189024 alternate view"
      }
    ],
    inStock: true
  },
  {
    id: "355",
    slug: "tall-pantry-cabinet-u248424",
    sku: "017600355",
    name: "Tall Pantry Cabinet U248424",
    category: "Kitchen Cabinets",
    dimensions: "24 in W x 84 in H x 24 in D",
    finish: "MDF + PVC",
    colorName: "PVC white",
    colorHex: "#f5f4f0",
    dealerStock: {
      toronto: 5,
      vancouver: 3,
      calgary: 1,
      montreal: 3
    },
    price: { amount: 860, currency: "CAD" },
    unit: "each",
    images: [
      {
        url: assetPath("/assets/original-site/images-202605-source_img-355_P_1778668668900.JPG"),
        alt: "Tall Pantry Cabinet U248424"
      },
      {
        url: assetPath("/assets/original-site/images-202605-source_img-355_P_1778668746084.JPG"),
        alt: "Tall Pantry Cabinet U248424 alternate view"
      }
    ],
    inStock: true
  },
  {
    id: "356",
    slug: "tall-pantry-cabinet-u249024",
    sku: "017600356",
    name: "Tall Pantry Cabinet U249024",
    category: "Kitchen Cabinets",
    dimensions: "24 in W x 90 in H x 24 in D",
    finish: "MDF + PVC",
    colorName: "PVC white",
    colorHex: "#f5f4f0",
    dealerStock: {
      toronto: 5,
      vancouver: 2,
      calgary: 1,
      montreal: 3
    },
    price: { amount: 890, currency: "CAD" },
    unit: "each",
    images: [
      {
        url: assetPath("/assets/original-site/images-202605-source_img-356_P_1778668809938.JPG"),
        alt: "Tall Pantry Cabinet U249024"
      },
      {
        url: assetPath("/assets/original-site/images-202605-source_img-356_P_1778668876401.JPG"),
        alt: "Tall Pantry Cabinet U249024 alternate view"
      }
    ],
    inStock: true
  },
  {
    id: "414",
    slug: "vanity-cabinet-v3021-doors-tdr",
    sku: "023021412",
    name: "Vanity Cabinet V3021 Doors TDR",
    category: "Bathroom Vanities",
    dimensions: "30 in W x 34 in H x 21 in D",
    finish: "Painted cabinet",
    colorName: "White",
    colorHex: "#f8f7f3",
    dealerStock: {
      toronto: 9,
      vancouver: 5,
      calgary: 2,
      montreal: 4
    },
    price: { amount: 420, currency: "CAD" },
    unit: "each",
    images: [
      {
        url: assetPath("/assets/original-site/images-202606-source_img-414_P_1781138572786.JPG"),
        alt: "Vanity Cabinet V3021 Doors TDR"
      },
      {
        url: assetPath("/assets/original-site/images-202606-source_img-414_P_1781138587010.JPG"),
        alt: "Vanity Cabinet V3021 Doors TDR alternate white cabinet view"
      }
    ],
    inStock: true
  },
  {
    id: "357",
    slug: "tall-pantry-cabinet",
    sku: "017600130",
    name: "Tall Cabinet U249624",
    category: "Kitchen Cabinets",
    dimensions: "24 in W x 96 in H x 24 in D",
    finish: "MDF + PVC",
    colorName: "PVC white",
    colorHex: "#f5f4f0",
    dealerStock: {
      toronto: 5,
      vancouver: 2,
      calgary: 1,
      montreal: 3
    },
    price: { amount: 910, currency: "CAD" },
    unit: "each",
    images: [
      {
        url: assetPath("/assets/original-site/images-202605-source_img-357_P_1778668916793.JPG"),
        alt: "Tall Cabinet U249624"
      },
      {
        url: assetPath("/assets/original-site/images-202605-source_img-357_P_1778669008466.JPG"),
        alt: "Tall Cabinet U249624 alternate white cabinet view"
      }
    ],
    inStock: true
  },
  {
    id: "407",
    slug: "primed-mdf-baseboard",
    sku: "034114222",
    name: "Baseboard 041",
    category: "Baseboards & Mouldings",
    dimensions: "2-1/2 in W",
    finish: "Primed MDF",
    colorName: "Primed white",
    colorHex: "#fbfaf7",
    dealerStock: {
      toronto: 126,
      vancouver: 82,
      calgary: 48,
      montreal: 64
    },
    price: { amount: 11, currency: "CAD" },
    unit: "ea",
    images: [
      {
        url: assetPath("/assets/original-site/images-202605-source_img-407_P_1780215642366.JPG"),
        alt: "Baseboard 041 profile"
      },
      {
        url: assetPath("/assets/original-site/images-202605-source_img-407_P_1780215664315.JPG"),
        alt: "Baseboard 041 single board profile"
      }
    ],
    inStock: true
  },
  {
    id: "364",
    slug: "oven-microwave-cabinet-omc3090",
    sku: "017600364",
    name: "Oven Microwave Cabinet OMC3090",
    category: "Kitchen Cabinets",
    dimensions: "30 in W x 90 in H x 24 in D",
    finish: "MDF + PVC",
    colorName: "PVC white",
    colorHex: "#f5f4f0",
    dealerStock: {
      toronto: 3,
      vancouver: 1,
      calgary: 1,
      montreal: 2
    },
    price: { amount: 980, currency: "CAD" },
    unit: "each",
    images: [
      {
        url: assetPath("/assets/original-site/images-202605-source_img-364_P_1778746418225.JPG"),
        alt: "Oven Microwave Cabinet OMC3090"
      },
      {
        url: assetPath("/assets/original-site/images-202605-source_img-364_P_1778746453512.JPG"),
        alt: "Oven Microwave Cabinet OMC3090 alternate view"
      }
    ],
    inStock: true
  },
  {
    id: "384",
    slug: "vanity-cabinet-v2421-doors",
    sku: "023021384",
    name: "Vanity Cabinet V2421 Doors",
    category: "Bathroom Vanities",
    dimensions: "24 in W x 34 in H x 21 in D",
    finish: "Painted cabinet",
    colorName: "White",
    colorHex: "#f8f7f3",
    dealerStock: {
      toronto: 6,
      vancouver: 3,
      calgary: 2,
      montreal: 3
    },
    price: { amount: 360, currency: "CAD" },
    unit: "each",
    images: [
      {
        url: assetPath("/assets/original-site/images-202605-source_img-384_P_1779682456404.JPG"),
        alt: "Vanity Cabinet V2421 Doors"
      },
      {
        url: assetPath("/assets/original-site/images-202605-source_img-384_P_1779682523208.JPG"),
        alt: "Vanity Cabinet V2421 Doors alternate view"
      }
    ],
    inStock: true
  },
  {
    id: "398",
    slug: "vanity-cabinet-v2421-left-drawers",
    sku: "023021398",
    name: "Vanity Cabinet V2421 Left Drawers",
    category: "Bathroom Vanities",
    dimensions: "24 in W x 34 in H x 21 in D",
    finish: "Painted cabinet",
    colorName: "White",
    colorHex: "#f8f7f3",
    dealerStock: {
      toronto: 7,
      vancouver: 4,
      calgary: 2,
      montreal: 4
    },
    price: { amount: 390, currency: "CAD" },
    unit: "each",
    images: [
      {
        url: assetPath("/assets/original-site/images-202606-source_img-398_P_1780884887561.JPG"),
        alt: "Vanity Cabinet V2421 Left Drawers"
      },
      {
        url: assetPath("/assets/original-site/images-202606-source_img-398_P_1780884893548.jpg"),
        alt: "Vanity Cabinet V2421 Left Drawers alternate view"
      }
    ],
    inStock: true
  },
  {
    id: "400",
    slug: "vanity-cabinet-v3021-right-drawers",
    sku: "023021400",
    name: "Vanity Cabinet V3021 Right Drawers",
    category: "Bathroom Vanities",
    dimensions: "30 in W x 34 in H x 21 in D",
    finish: "Painted cabinet",
    colorName: "White",
    colorHex: "#f8f7f3",
    dealerStock: {
      toronto: 7,
      vancouver: 4,
      calgary: 2,
      montreal: 4
    },
    price: { amount: 430, currency: "CAD" },
    unit: "each",
    images: [
      {
        url: assetPath("/assets/original-site/images-202606-source_img-400_P_1780888348274.JPG"),
        alt: "Vanity Cabinet V3021 Right Drawers"
      },
      {
        url: assetPath("/assets/original-site/images-202606-source_img-400_P_1780888355109.jpg"),
        alt: "Vanity Cabinet V3021 Right Drawers alternate view"
      }
    ],
    inStock: true
  },
  {
    id: "403",
    slug: "vanity-cabinet-v4821-double-doors-drawers",
    sku: "023021403",
    name: "Vanity Cabinet V4821 Double Doors Drawers",
    category: "Bathroom Vanities",
    dimensions: "48 in W x 34 in H x 21 in D",
    finish: "Painted cabinet",
    colorName: "White",
    colorHex: "#f8f7f3",
    dealerStock: {
      toronto: 5,
      vancouver: 2,
      calgary: 1,
      montreal: 3
    },
    price: { amount: 690, currency: "CAD" },
    unit: "each",
    images: [
      {
        url: assetPath("/assets/original-site/images-202605-source_img-403_P_1779952289354.JPG"),
        alt: "Vanity Cabinet V4821 Double Doors Drawers"
      },
      {
        url: assetPath("/assets/original-site/images-202605-source_img-403_P_1779952302114.JPG"),
        alt: "Vanity Cabinet V4821 Double Doors Drawers alternate view"
      }
    ],
    inStock: true
  },
  {
    id: "409",
    slug: "primed-mdf-casing-041",
    sku: "034114409",
    name: "Primed MDF Casing 041",
    category: "Baseboards & Mouldings",
    dimensions: "2-1/2 in W",
    finish: "Primed MDF",
    colorName: "Primed white",
    colorHex: "#fbfaf7",
    dealerStock: {
      toronto: 118,
      vancouver: 74,
      calgary: 42,
      montreal: 58
    },
    price: { amount: 9, currency: "CAD" },
    unit: "ea",
    images: [
      {
        url: assetPath("/assets/original-site/images-202606-source_img-409_P_1780467530017.JPG"),
        alt: "Primed MDF Casing 041 profile"
      },
      {
        url: assetPath("/assets/original-site/images-202606-source_img-409_P_1780467539816.JPG"),
        alt: "Primed MDF Casing 041 alternate profile"
      }
    ],
    inStock: true
  },
  {
    id: "411",
    slug: "primed-mdf-door-stop-041",
    sku: "034114411",
    name: "Primed MDF Door Stop 041",
    category: "Baseboards & Mouldings",
    dimensions: "1-3/8 in W",
    finish: "Primed MDF",
    colorName: "Primed white",
    colorHex: "#fbfaf7",
    dealerStock: {
      toronto: 96,
      vancouver: 61,
      calgary: 38,
      montreal: 51
    },
    price: { amount: 7, currency: "CAD" },
    unit: "ea",
    images: [
      {
        url: assetPath("/assets/original-site/images-202606-source_img-411_P_1780469866242.JPG"),
        alt: "Primed MDF Door Stop 041 profile"
      },
      {
        url: assetPath("/assets/original-site/images-202606-source_img-411_P_1780469874280.JPG"),
        alt: "Primed MDF Door Stop 041 alternate profile"
      }
    ],
    inStock: true
  }
];

const featuredProductIds = new Set(featuredProducts.map((product) => product.id));

const WHITE_CABINET_CATEGORY_LABELS: Record<string, { colorName: string; colorHex: string }> = {
  "Kitchen Cabinets": { colorName: "PVC white", colorHex: "#f4f2ee" },
  "Bathroom Vanities": { colorName: "White", colorHex: "#f8f7f3" }
};

const ACTIVE_DEALER_ID = "winnipeg";

function applyOriginalSiteImages(product: ProductSummary): ProductSummary {
  const originalImages = originalSiteImageLibrary[product.id];
  if (!originalImages?.length) return product;

  const generatedImages = product.images.filter((image) => image.url.includes("/assets/generated/"));

  return {
    ...product,
    images: [...originalImages, ...generatedImages]
  };
}

function normalizeCabinetColor<T extends ProductSummary>(product: T): T {
  const cabinetColor = WHITE_CABINET_CATEGORY_LABELS[product.category];
  if (!cabinetColor) return product;

  const whiteFinishOptions = product.finishOptions?.filter((option) =>
    /white/i.test(option.name)
  );

  return {
    ...product,
    colorName: cabinetColor.colorName,
    colorHex: cabinetColor.colorHex,
    finishOptions:
      whiteFinishOptions && whiteFinishOptions.length > 0
        ? whiteFinishOptions
        : product.finishOptions
          ? [
              {
                name: cabinetColor.colorName,
                sku: product.sku,
                manufacturerPartNumber: product.manufacturerPartNumber,
                colorHex: cabinetColor.colorHex,
                image: product.images[0],
                active: true
              }
            ]
          : product.finishOptions
  };
}

function normalizeDealerStock<T extends ProductSummary>(product: T): T {
  const totalStock = Object.values(product.dealerStock ?? {}).reduce(
    (total, quantity) => total + quantity,
    0
  );

  return {
    ...product,
    dealerStock: {
      [ACTIVE_DEALER_ID]: totalStock
    }
  };
}

export const products: ProductSummary[] = mb01Products
  .map((product) => ({
    ...product,
    subCategory: mb01ProductMetadataById[product.id]?.sourceCategory
  }))
  .map(normalizeCabinetColor)
  .map(normalizeDealerStock);

const INVENTORY_UPDATED_AT = "2026-07-03T12:00:00.000Z";

function buildMockInventory(product: ProductSummary): ProductInventory {
  const locations = Object.entries(product.dealerStock ?? {}).map(([dealerId, quantity]) => ({
    dealerId,
    quantity,
    quantityOnHand: quantity,
    quantityReserved: 0,
    safetyStock: product.category === "Baseboards & Mouldings" ? 12 : 1,
    status: getInventoryStatus(quantity),
    pickupAvailable: quantity > 0,
    deliveryAvailable: quantity > 0,
    leadTimeDays: quantity > 0 ? 0 : 7,
    updatedAt: INVENTORY_UPDATED_AT
  }));
  const totalAvailable = locations.reduce((total, location) => total + location.quantity, 0);

  return {
    productId: product.id,
    sku: product.sku,
    locations,
    totalAvailable,
    status: getInventoryStatus(totalAvailable),
    availabilityMessage: "Backend inventory can replace this mock by product, dealer, postal code, and fulfillment type.",
    updatedAt: INVENTORY_UPDATED_AT
  };
}

const mockInventoryByProductId: Record<string, ProductInventory> = Object.fromEntries(
  products.map((product) => [product.id, product.availability ?? buildMockInventory(product)])
);

const mockCommerceByProductId: Record<string, ProductCommerce> = {
  "269": {
    pricing: {
      source: "promotion",
      basePrice: { amount: 560, currency: "CAD" },
      currentPrice: { amount: 525, currency: "CAD" },
      compareAtPrice: { amount: 560, currency: "CAD" },
      savings: { amount: 35, currency: "CAD" },
      savingsPercent: 6,
      priceLabel: "Project promo price",
      validFrom: "2026-07-01T00:00:00.000Z",
      validUntil: "2026-07-31T23:59:59.000Z",
      updatedAt: "2026-07-03T12:00:00.000Z",
      promotionIds: ["cabinet-project-july"]
    },
    promotions: [
      {
        id: "cabinet-project-july",
        type: "sale",
        label: "July project pricing",
        description: "Limited-time cabinet pricing prepared for dealer fulfillment.",
        terms: "Final price is confirmed by the selected VanStro dealer.",
        startsAt: "2026-07-01T00:00:00.000Z",
        endsAt: "2026-07-31T23:59:59.000Z",
        priority: 90
      }
    ],
    priceMessage: "Promotion can be replaced by backend campaign pricing.",
    availabilityMessage: "Dealer stock and campaign eligibility are evaluated together."
  },
  "414": {
    pricing: {
      source: "catalog",
      basePrice: { amount: 420, currency: "CAD" },
      currentPrice: { amount: 420, currency: "CAD" },
      priceLabel: "Everyday price",
      updatedAt: "2026-07-03T12:00:00.000Z",
      promotionIds: ["bath-vanity-bundle"]
    },
    promotions: [
      {
        id: "bath-vanity-bundle",
        type: "dealer",
        label: "Project add-ons",
        description: "Dealer can attach faucet, top, or delivery offers from admin.",
        priority: 50
      }
    ]
  },
  "357": {
    pricing: {
      source: "catalog",
      basePrice: { amount: 910, currency: "CAD" },
      currentPrice: { amount: 910, currency: "CAD" },
      priceLabel: "Catalog price",
      updatedAt: "2026-07-03T12:00:00.000Z"
    },
    promotions: []
  },
  "407": {
    pricing: {
      source: "promotion",
      basePrice: { amount: 12, currency: "CAD" },
      currentPrice: { amount: 11, currency: "CAD" },
      compareAtPrice: { amount: 12, currency: "CAD" },
      savings: { amount: 1, currency: "CAD" },
      savingsPercent: 8,
      priceLabel: "Volume promo",
      validUntil: "2026-07-31T23:59:59.000Z",
      updatedAt: "2026-07-03T12:00:00.000Z",
      promotionIds: ["trim-volume-pricing"]
    },
    promotions: [
      {
        id: "trim-volume-pricing",
        type: "bulk",
        label: "Volume pricing",
        description: "Bulk trim pricing can be managed from the promotions backend.",
        priority: 70
      }
    ]
  }
};

function applyCommerce<T extends ProductSummary>(product: T): T {
  const commerce = mockCommerceByProductId[product.id];
  if (!commerce) return product;

  return {
    ...product,
    price: commerce.pricing.currentPrice,
    commerce
  };
}

function applyInventory<T extends ProductSummary>(product: T): T {
  const availability = mockInventoryByProductId[product.id];
  if (!availability) return product;

  return {
    ...product,
    availability,
    inStock: ["in_stock", "low_stock", "backorder"].includes(availability.status)
  };
}

function applyDynamicProductState<T extends ProductSummary>(product: T): T {
  return applyInventory(applyCommerce(product));
}

export const productsWithCommerce: ProductSummary[] = products.map((product) =>
  applyDynamicProductState(product)
);

const detailCopyById: Record<
  string,
  {
    description: string;
    manufacturerPartNumber: string;
    packageQuantity: {
      each: number;
      innerPack?: number;
      case?: number;
      pallet?: number;
    };
    finishOptions?: NonNullable<ProductDetail["finishOptions"]>;
    productHighlights: string[];
    documents: NonNullable<ProductDetail["documents"]>;
    supportLinks: NonNullable<ProductDetail["supportLinks"]>;
    specifications: Record<string, string>;
  }
> = {
  "269": {
    description:
      "A ready-to-order B33 base cabinet for kitchen runs, stocked for Canadian renovation projects that need predictable sizing and local dealer fulfillment.",
    manufacturerPartNumber: "VS-B33-011090130",
    packageQuantity: {
      each: 1,
      innerPack: 1,
      case: 1,
      pallet: 8
    },
    productHighlights: [
      "33 inch base cabinet sized for standard kitchen runs and filler planning.",
      "18 mm plywood box with MDF + PVC white exterior finish.",
      "Dealer-stocked for pickup or coordinated local delivery.",
      "Prepared for cart quantity planning before checkout."
    ],
    finishOptions: [
      {
        name: "PVC white",
        sku: "011090130",
        manufacturerPartNumber: "VS-B33-011090130",
        colorHex: "#f4f2ee",
        image: {
          url: assetPath("/assets/original-site/images-202605-source_img-269_P_1778653714057.JPG"),
          alt: "Base Cabinet B33 in PVC white"
        },
        active: true
      }
    ],
    documents: [
      {
        label: "Specification sheet",
        type: "specification",
        href: "/articles/how-to-measure-for-cabinets"
      },
      {
        label: "Warranty summary",
        type: "warranty",
        href: "/privacy"
      },
      {
        label: "Installation planning",
        type: "installation",
        href: "/articles/pickup-and-delivery-options"
      }
    ],
    supportLinks: [
      {
        label: "Measure for cabinets",
        description: "Confirm widths, clearances and fillers before ordering.",
        href: "/articles/how-to-measure-for-cabinets"
      },
      {
        label: "View kitchen cabinets",
        description: "Compare nearby cabinet sizes and stocked configurations.",
        href: "/products?category=kitchen-cabinets"
      }
    ],
    specifications: {
      "Cabinet Type": "Base cabinet",
      Material: "18 mm plywood box with MDF + PVC white finish",
      "Box Material": "18 mm plywood",
      "Exterior Material": "MDF + PVC",
      "Finish Family": "White",
      "Door Configuration": "2 doors",
      "Drawer Configuration": "1 top drawer front",
      Use: "Kitchen base cabinet run",
      Assembly: "Dealer-stocked cabinet unit",
      Fulfillment: "Pickup or dealer-coordinated delivery"
    }
  },
  "414": {
    description:
      "A 30 inch vanity cabinet for bathroom projects where buyers need a compact white cabinet with clear sizing before checkout.",
    manufacturerPartNumber: "VS-V3021-TDR-023021412",
    packageQuantity: {
      each: 1,
      innerPack: 1,
      case: 1,
      pallet: 10
    },
    finishOptions: [
      {
        name: "White",
        colorHex: "#f8f7f3",
        image: {
          url: assetPath("/assets/original-site/images-202606-source_img-414_P_1781138572786.JPG"),
          alt: "Vanity Cabinet V3021 Doors TDR in white"
        },
        active: true
      }
    ],
    productHighlights: [
      "30 inch vanity cabinet sized for compact bathroom layouts.",
      "White painted cabinet finish pairs with common fixture planning.",
      "Dealer inventory is visible before the buyer commits to checkout.",
      "Works for pickup or delivery orders coordinated through VanStro dealers."
    ],
    documents: [
      {
        label: "Vanity specification sheet",
        type: "specification",
        href: "/articles/how-to-measure-for-cabinets"
      },
      {
        label: "Warranty summary",
        type: "warranty",
        href: "/privacy"
      },
      {
        label: "Care and finish guide",
        type: "care",
        href: "/articles/what-finishes-are-available"
      }
    ],
    supportLinks: [
      {
        label: "Bathroom vanities",
        description: "See bathroom vanity stock and alternate widths.",
        href: "/products?category=bathroom-vanities"
      },
      {
        label: "Finish options",
        description: "Review painted and primed finish guidance.",
        href: "/articles/what-finishes-are-available"
      }
    ],
    specifications: {
      "Cabinet Type": "Bathroom vanity cabinet",
      Material: "Painted cabinet construction",
      "Finish Family": "White",
      "Door Configuration": "2 doors",
      "Drawer Configuration": "Left-side drawer stack shown in product imagery",
      Use: "Bathroom vanity storage",
      Assembly: "Ready for fixture planning",
      Fulfillment: "Pickup or dealer-coordinated delivery"
    }
  },
  "357": {
    description:
      "A tall pantry cabinet for full-height kitchen storage, prepared for stock-aware ordering through the selected VanStro dealer.",
    manufacturerPartNumber: "VS-U249624-017600130",
    packageQuantity: {
      each: 1,
      innerPack: 1,
      case: 1,
      pallet: 4
    },
    finishOptions: [
      {
        name: "PVC white",
        colorHex: "#f5f4f0",
        image: {
          url: assetPath("/assets/original-site/images-202605-source_img-357_P_1778668916793.JPG"),
          alt: "Tall Cabinet U249624 in PVC white"
        },
        active: true
      }
    ],
    productHighlights: [
      "Full-height cabinet for pantry, utility or appliance-adjacent storage.",
      "24 inch width and 96 inch height support tall kitchen layouts.",
      "MDF + PVC white finish aligns with the stocked cabinet program.",
      "Dealer fulfillment helps protect large-format product handling."
    ],
    documents: [
      {
        label: "Tall cabinet specification",
        type: "specification",
        href: "/articles/how-to-measure-for-cabinets"
      },
      {
        label: "Warranty summary",
        type: "warranty",
        href: "/privacy"
      },
      {
        label: "Pickup and delivery guide",
        type: "installation",
        href: "/articles/pickup-and-delivery-options"
      }
    ],
    supportLinks: [
      {
        label: "Kitchen cabinet category",
        description: "Compare base, wall and tall cabinet configurations.",
        href: "/products?category=kitchen-cabinets"
      },
      {
        label: "Pickup and delivery",
        description: "Plan fulfillment for larger cabinet orders.",
        href: "/articles/pickup-and-delivery-options"
      }
    ],
    specifications: {
      "Cabinet Type": "Tall pantry cabinet",
      Material: "MDF + PVC white cabinet finish",
      "Finish Family": "White",
      "Door Configuration": "4 doors",
      Use: "Tall pantry or utility storage",
      Assembly: "Dealer-stocked cabinet unit",
      Fulfillment: "Pickup or dealer-coordinated delivery"
    }
  },
  "407": {
    description:
      "A primed MDF baseboard profile for finishing interior renovation work, priced by unit and suited for cart quantity planning.",
    manufacturerPartNumber: "VS-BB041-034114222",
    packageQuantity: {
      each: 1,
      innerPack: 12,
      case: 48,
      pallet: 768
    },
    productHighlights: [
      "Primed MDF profile for interior trim and baseboard runs.",
      "Unit pricing supports measured room-by-room quantity planning.",
      "Higher dealer stock supports multi-room renovation orders.",
      "Ready for paint after normal site preparation."
    ],
    documents: [
      {
        label: "Baseboard specification",
        type: "specification",
        href: "/articles/how-to-measure-for-cabinets"
      },
      {
        label: "Finish guidance",
        type: "care",
        href: "/articles/what-finishes-are-available"
      },
      {
        label: "Warranty summary",
        type: "warranty",
        href: "/privacy"
      }
    ],
    supportLinks: [
      {
        label: "Baseboards and mouldings",
        description: "Review stocked profiles and trim materials.",
        href: "/products?category=baseboards"
      },
      {
        label: "Finish options",
        description: "Plan paint-ready trim finishing.",
        href: "/articles/what-finishes-are-available"
      }
    ],
    specifications: {
      "Product Type": "Baseboard moulding",
      Material: "Primed MDF",
      Application: "Interior trim and baseboard runs",
      Use: "Interior trim and baseboard runs",
      Profile: "041 baseboard profile",
      Fulfillment: "Pickup or dealer-coordinated delivery"
    }
  }
};

export const productDetails: ProductDetail[] = products.map((product) => {
  const detailCopy = detailCopyById[product.id];
  const mb01Metadata = mb01ProductMetadataById[product.id];
  const availability = mockInventoryByProductId[product.id] ?? buildMockInventory(product);
  const displayDimensions = formatProductSize(product.dimensions);

  return applyDynamicProductState({
    ...product,
    brand: "VanStro",
    manufacturerPartNumber:
      product.manufacturerPartNumber ?? detailCopy?.manufacturerPartNumber ?? `VS-${product.sku}`,
    packageQuantity: detailCopy?.packageQuantity ?? {
      each: 1,
      innerPack: 1
    },
    finishOptions:
      detailCopy?.finishOptions ?? [
        {
          name: product.colorName ?? product.finish ?? "Standard finish",
          colorHex: product.colorHex,
          active: true
        }
      ],
    certificationRequired: product.category !== "Baseboards & Mouldings",
    description:
      mb01Metadata?.description ??
      detailCopy?.description ??
      `${product.name} is a ${product.category.toLowerCase()} item with ${displayDimensions}. It is prepared from the original VanStro catalog assets for dealer stock, pickup, and local delivery workflows.`,
    productHighlights:
      mb01Metadata?.productHighlights ??
      detailCopy?.productHighlights ?? [
        `${product.name} is mapped from the original VanStro product source imagery.`,
        `${displayDimensions} shown for project planning before checkout.`,
        `${product.finish ?? product.colorName ?? "Selected finish"} finish information is ready for backend product management.`,
        "Dealer inventory can be replaced by live stock and fulfillment APIs."
      ],
    documents:
      detailCopy?.documents ?? [
        {
          label: "Specification sheet",
          type: "specification",
          href: "/articles/how-to-measure-for-cabinets"
        },
        {
          label: "Warranty summary",
          type: "warranty",
          href: "/privacy"
        }
      ],
    supportLinks:
      detailCopy?.supportLinks ?? [
        {
          label: "View category",
          description: "Compare related VanStro stocked products.",
          href: `/products?category=${product.category}`
        }
      ],
    specifications: {
      Brand: "VanStro",
      SKU: product.sku,
      "Manufacturer Part #":
        product.manufacturerPartNumber ?? detailCopy?.manufacturerPartNumber ?? `VS-${product.sku}`,
      Category: product.category,
      Dimensions: displayDimensions,
      Finish: product.finish ?? "Painted or stained finish",
      Color: product.colorName ?? "White",
      Unit: product.unit,
      ...(mb01Metadata?.specifications ?? detailCopy?.specifications ?? {})
    },
    inventory: availability.locations
  });
});

export const articles: ArticleSummary[] = [
  {
    id: "measure-cabinets",
    slug: "how-to-measure-for-cabinets",
    title: "How do I measure for cabinets?",
    excerpt: "A practical guide for planning cabinet widths, heights, clearances and filler pieces.",
    publishedAt: "2026-06-10T12:00:00.000Z",
    image: {
      url: assetPath("/assets/original-site/img-b05.gif"),
      alt: "Kitchen storage and cabinet planning"
    }
  },
  {
    id: "finish-options",
    slug: "what-finishes-are-available",
    title: "White cabinet and primed trim finishes",
    excerpt: "Review white cabinet finishes, primed trim materials and care notes before starting your order.",
    publishedAt: "2026-06-11T12:00:00.000Z",
    image: {
      url: assetPath("/assets/original-site/img-b02.gif"),
      alt: "Cabinet finish materials"
    }
  },
  {
    id: "pickup-delivery",
    slug: "pickup-and-delivery-options",
    title: "Nationwide delivery and dealer pickup",
    excerpt: "Understand delivery coverage, local dealer pickup and order handoff after checkout.",
    publishedAt: "2026-06-12T12:00:00.000Z",
    image: {
      url: assetPath("/assets/original-site/img-b03.gif"),
      alt: "Home materials prepared for pickup"
    }
  }
];

export const articleDetails: ArticleDetail[] = articles.map((article) => ({
  ...article,
  content:
    "This guide is a placeholder for the rebuilt content system. It keeps the page structure ready for the backend article detail API while preserving SEO-friendly rendering."
}));

export const dealers: Dealer[] = [
  {
    id: ACTIVE_DEALER_ID,
    name: "Yuan Construction",
    address: "856 Century St",
    city: "Winnipeg",
    province: "MB",
    postalCode: "R3H 0M5",
    phone: "+1 204 505 2288",
    availableForPickup: true
  }
];

export const mockCart: Cart = {
  id: "cart-demo",
  items: [
    {
      id: "cart-item-1",
      product: productsWithCommerce[0],
      quantity: 2,
      unitPrice: productsWithCommerce[0].price,
      lineTotal: { amount: productsWithCommerce[0].price.amount * 2, currency: "CAD" }
    },
    {
      id: "cart-item-2",
      product: productsWithCommerce[3],
      quantity: 10,
      unitPrice: productsWithCommerce[3].price,
      lineTotal: { amount: productsWithCommerce[3].price.amount * 10, currency: "CAD" }
    }
  ],
  subtotal: {
    amount: productsWithCommerce[0].price.amount * 2 + productsWithCommerce[3].price.amount * 10,
    currency: "CAD"
  }
};

export const mockFavorites: FavoriteItem[] = [
  { id: "favorite-1", product: productsWithCommerce[1] },
  { id: "favorite-2", product: productsWithCommerce[2] }
];
