import {
  ArticleDetail,
  ArticleSummary,
  Banner,
  Cart,
  Dealer,
  FavoriteItem,
  ProductDetail,
  ProductSummary
} from "@/lib/api/api-contract";
import { assetPath } from "@/lib/assets";

export const banners: Banner[] = [
  {
    id: "home-kitchen-cabinets",
    title: "Kitchen cabinets and home materials across Canada",
    subtitle:
      "Shop ready-to-order cabinets, vanities and baseboards with local stock, pickup options and dealer support.",
    href: "/products",
    image: {
      url: assetPath("/assets/generated/vanstro-hero-white-v1.png"),
      alt: "White VanStro kitchen cabinets and showroom sample doors"
    }
  }
];

export const products: ProductSummary[] = [
  {
    id: "269",
    slug: "base-cabinet-b33",
    sku: "011090130",
    name: "Base Cabinet B33",
    category: "Kitchen Cabinets",
    dimensions: "33 in W, MDF + PVC white, 18 mm plywood",
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
    dimensions: "24 in W x 96 in H x 24 in D, MDF + PVC",
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
      }
    ],
    inStock: true
  }
];

export const productDetails: ProductDetail[] = products.map((product) => ({
  ...product,
  description:
    "Ready-to-order home material for Canadian renovation projects, stocked for pickup and checkout workflows.",
  specifications: {
    SKU: product.sku,
    Category: product.category,
    Dimensions: product.dimensions,
    Finish: product.finish ?? "Painted or stained finish",
    Color: product.colorName ?? "White",
    Warranty: "Standard VanStro product warranty"
  },
  inventory: Object.entries(
    product.dealerStock ?? {
      toronto: 14,
      vancouver: 7,
      calgary: 3
    }
  ).map(([dealerId, quantity]) => ({
    dealerId,
    quantity,
    status:
      quantity <= 0 ? "out_of_stock" : quantity <= 3 ? "low_stock" : "in_stock"
  }))
}));

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
    title: "What finishes are available?",
    excerpt: "Compare painted, stained and primed materials before starting your order.",
    publishedAt: "2026-06-11T12:00:00.000Z",
    image: {
      url: assetPath("/assets/original-site/img-b02.gif"),
      alt: "Cabinet finish materials"
    }
  },
  {
    id: "pickup-delivery",
    slug: "pickup-and-delivery-options",
    title: "Pickup and delivery options",
    excerpt: "Understand store pickup, local stock checks and delivery coordination.",
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
    id: "toronto",
    name: "VanStro Toronto",
    address: "15 Provost Drive",
    city: "Toronto",
    province: "ON",
    postalCode: "M2K 2X9",
    phone: "+1 416 000 0000",
    availableForPickup: true
  },
  {
    id: "vancouver",
    name: "VanStro Vancouver",
    address: "3320 Jacombs Road",
    city: "Richmond",
    province: "BC",
    postalCode: "V6V 1Z6",
    phone: "+1 604 000 0000",
    availableForPickup: true
  },
  {
    id: "calgary",
    name: "VanStro Calgary",
    address: "8000 11th Street S.E.",
    city: "Calgary",
    province: "AB",
    postalCode: "T2H 3B2",
    phone: "+1 403 000 0000",
    availableForPickup: true
  },
  {
    id: "montreal",
    name: "VanStro Montreal",
    address: "9191 Boulevard Cavendish",
    city: "Montreal",
    province: "QC",
    postalCode: "H4T 1M8",
    phone: "+1 514 000 0000",
    availableForPickup: true
  }
];

export const mockCart: Cart = {
  id: "cart-demo",
  items: [
    {
      id: "cart-item-1",
      product: products[0],
      quantity: 2,
      lineTotal: { amount: products[0].price.amount * 2, currency: "CAD" }
    },
    {
      id: "cart-item-2",
      product: products[3],
      quantity: 10,
      lineTotal: { amount: products[3].price.amount * 10, currency: "CAD" }
    }
  ],
  subtotal: { amount: products[0].price.amount * 2 + products[3].price.amount * 10, currency: "CAD" }
};

export const mockFavorites: FavoriteItem[] = [
  { id: "favorite-1", product: products[1] },
  { id: "favorite-2", product: products[2] }
];
