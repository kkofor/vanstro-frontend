import { prisma, Prisma } from "./index.js";
import { hashPassword } from "./password.js";
import { INITIAL_PERMISSIONS } from "./permissions.js";

const SUPER_ADMIN_ROLE = "super_admin";
const MIN_SUPER_ADMIN_PASSWORD_LENGTH = 12;
const PUBLIC_PLACEHOLDER_PASSWORDS = new Set([
  "admin",
  "changeme",
  "change-me-before-production",
  "password",
  "password123",
  "replace-before-seeding",
  "replace_before_seeding_not_a_real_password",
  "superadmin"
]);

function getRequiredSuperAdminPassword() {
  const password = process.env.SUPER_ADMIN_PASSWORD;

  const normalizedPassword = password?.trim();

  if (
    !normalizedPassword ||
    normalizedPassword.length < MIN_SUPER_ADMIN_PASSWORD_LENGTH ||
    PUBLIC_PLACEHOLDER_PASSWORDS.has(normalizedPassword.toLowerCase())
  ) {
    throw new Error(
      `SUPER_ADMIN_PASSWORD must be at least ${MIN_SUPER_ADMIN_PASSWORD_LENGTH} characters and must not be a public placeholder.`
    );
  }

  return password!;
}

async function seedPermissions() {
  for (const key of INITIAL_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key },
      update: {},
      create: {
        key,
        description: `Initial permission: ${key}`
      }
    });
  }
}

async function seedSuperAdmin(superAdminPassword: string) {
  const email = process.env.SUPER_ADMIN_EMAIL ?? "admin@vanstro.local";
  const shouldResetPassword =
    process.env.RESET_SUPER_ADMIN_PASSWORD === "true";

  const role = await prisma.role.upsert({
    where: { key: SUPER_ADMIN_ROLE },
    update: { name: "Super Admin", isSystem: true },
    create: {
      key: SUPER_ADMIN_ROLE,
      name: "Super Admin",
      isSystem: true
    }
  });

  const permissions = await prisma.permission.findMany({
    where: { key: { in: [...INITIAL_PERMISSIONS] } },
    select: { id: true }
  });

  for (const permission of permissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: role.id,
          permissionId: permission.id
        }
      },
      update: {},
      create: {
        roleId: role.id,
        permissionId: permission.id
      }
    });
  }

  const user = await prisma.user.upsert({
    where: { email },
    update: { status: "active" },
    create: {
      email,
      status: "active",
      kind: "admin",
      emailVerifiedAt: new Date()
    }
  });

  await prisma.adminProfile.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id, displayName: "Super Admin" }
  });

  const existingCredential = await prisma.passwordCredential.findUnique({
    where: { userId: user.id }
  });

  if (!existingCredential || shouldResetPassword) {
    const passwordData = hashPassword(superAdminPassword);

    await prisma.passwordCredential.upsert({
      where: { userId: user.id },
      update: shouldResetPassword ? passwordData : {},
      create: {
        userId: user.id,
        ...passwordData
      }
    });
  }

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: user.id,
        roleId: role.id
      }
    },
    update: {},
    create: {
      userId: user.id,
      roleId: role.id
    }
  });
}

async function seedDealers() {
  const dealer = await prisma.dealer.upsert({
    where: { code: "VANSTRO-DEMO-WPG" },
    update: {},
    create: {
      code: "VANSTRO-DEMO-WPG",
      name: "VanStro Demo Winnipeg Dealer",
      status: "active",
      phone: "+1-204-000-0000"
    }
  });

  const location = await prisma.dealerLocation.upsert({
    where: {
      dealerId_code: {
        dealerId: dealer.id,
        code: "WPG-MAIN"
      }
    },
    update: {},
    create: {
      dealerId: dealer.id,
      code: "WPG-MAIN",
      name: "Winnipeg Main",
      city: "Winnipeg",
      province: "MB",
      country: "CA",
      pickupAvailable: true,
      deliveryAvailable: true
    }
  });

  await prisma.dealerServiceArea.upsert({
    where: {
      dealerLocationId_areaType_areaCode: {
        dealerLocationId: location.id,
        areaType: "province",
        areaCode: "MB"
      }
    },
    update: {},
    create: {
      dealerLocationId: location.id,
      areaType: "province",
      areaCode: "MB"
    }
  });

  await prisma.dealerServiceArea.upsert({
    where: {
      dealerLocationId_areaType_areaCode: {
        dealerLocationId: location.id,
        areaType: "fsa",
        areaCode: "R3C"
      }
    },
    update: {},
    create: {
      dealerLocationId: location.id,
      areaType: "fsa",
      areaCode: "R3C"
    }
  });

  await prisma.dealerErpLink.upsert({
    where: {
      erpSystem_erpLocationId: {
        erpSystem: "vanstro-erp",
        erpLocationId: "1"
      }
    },
    update: {
      dealerId: dealer.id,
      dealerLocationId: location.id
    },
    create: {
      dealerId: dealer.id,
      dealerLocationId: location.id,
      erpSystem: "vanstro-erp",
      erpLocationId: "1"
    }
  });
}

async function seedCatalog() {
  const categories = [
    {
      slug: "kitchen-cabinets",
      name: "Kitchen Cabinets",
      description: "Ready-to-order cabinet boxes and accessories.",
      sortOrder: 10
    },
    {
      slug: "bathroom-vanities",
      name: "Bathroom Vanities",
      description: "Vanity cabinets and related bath storage products.",
      sortOrder: 20
    },
    {
      slug: "baseboards",
      name: "Baseboards & Mouldings",
      description: "Interior trim, baseboards and moulding profiles.",
      sortOrder: 30
    }
  ];

  const categoryBySlug = new Map<string, { id: string }>();

  for (const category of categories) {
    const record = await prisma.category.upsert({
      where: { slug: category.slug },
      update: category,
      create: category
    });

    categoryBySlug.set(category.slug, { id: record.id });
  }

  const products = [
    {
      slug: "base-cabinet-b33",
      name: "Base Cabinet B33",
      shortDescription: "33 inch base cabinet for kitchen layouts.",
      description:
        "A stocked kitchen cabinet SKU prepared for dealer pickup and local delivery workflows.",
      categorySlug: "kitchen-cabinets",
      skuCode: "011090130",
      priceCents: 52500,
      specs: {
        Width: "33 in",
        Category: "Kitchen Cabinets"
      }
    },
    {
      slug: "bath-vanity-v30",
      name: "Bath Vanity V30",
      shortDescription: "30 inch vanity cabinet for bathroom projects.",
      description:
        "A bathroom vanity SKU for quote, pickup and delivery planning.",
      categorySlug: "bathroom-vanities",
      skuCode: "023021412",
      priceCents: 42000,
      specs: {
        Width: "30 in",
        Category: "Bathroom Vanities"
      }
    },
    {
      slug: "primed-mdf-baseboard",
      name: "Primed MDF Baseboard",
      shortDescription: "Primed MDF baseboard profile for interior finishing.",
      description:
        "A trim SKU suited for quantity planning and dealer stock workflows.",
      categorySlug: "baseboards",
      skuCode: "034114222",
      priceCents: 1100,
      specs: {
        Material: "Primed MDF",
        Category: "Baseboards & Mouldings"
      }
    }
  ];

  for (const product of products) {
    const category = categoryBySlug.get(product.categorySlug);

    if (!category) {
      throw new Error(`Missing seeded category: ${product.categorySlug}`);
    }

    const productRecord = await prisma.product.upsert({
      where: { slug: product.slug },
      update: {
        name: product.name,
        shortDescription: product.shortDescription,
        description: product.description,
        status: "active",
        categoryId: category.id,
        ...(product.slug === "base-cabinet-b33"
          ? {
              brand: "VanStro",
              manufacturerPartNumber: "B33-WHT",
              subCategoryKey: "base-cabinets",
              unit: "each",
              dimensions: '33" W x 34.5" H x 24" D',
              finish: "White",
              colorName: "White",
              colorHex: "#f4f2ee",
              packageQuantity: { each: 1, displayLabel: "1 cabinet" },
              finishOptions: [
                {
                  name: "White",
                  sku: product.skuCode,
                  manufacturerPartNumber: "B33-WHT",
                  colorHex: "#f4f2ee",
                  active: true
                },
                {
                  name: "Grey",
                  sku: `${product.skuCode}-GRY`,
                  manufacturerPartNumber: "B33-GRY",
                  colorHex: "#d9d5cf",
                  active: false
                }
              ],
              productHighlights: ["Soft-close hinges", "Ready for local pickup", "Dealer stock supported"],
              certificationRequired: false
            }
          : {})
      },
      create: {
        slug: product.slug,
        name: product.name,
        shortDescription: product.shortDescription,
        description: product.description,
        status: "active",
        categoryId: category.id,
        ...(product.slug === "base-cabinet-b33"
          ? {
              brand: "VanStro",
              manufacturerPartNumber: "B33-WHT",
              subCategoryKey: "base-cabinets",
              unit: "each",
              dimensions: '33" W x 34.5" H x 24" D',
              finish: "White",
              colorName: "White",
              colorHex: "#f4f2ee",
              packageQuantity: { each: 1, displayLabel: "1 cabinet" },
              finishOptions: [
                {
                  name: "White",
                  sku: product.skuCode,
                  manufacturerPartNumber: "B33-WHT",
                  colorHex: "#f4f2ee",
                  active: true
                }
              ],
              productHighlights: ["Soft-close hinges", "Ready for local pickup"],
              certificationRequired: false
            }
          : {})
      }
    });

    const sku = await prisma.platformSku.upsert({
      where: { skuCode: product.skuCode },
      update: {
        name: product.name,
        status: "active",
        productId: productRecord.id,
        manufacturerPartNumber: product.slug === "base-cabinet-b33" ? "B33-WHT" : undefined
      },
      create: {
        productId: productRecord.id,
        skuCode: product.skuCode,
        name: product.name,
        status: "active",
        manufacturerPartNumber: product.slug === "base-cabinet-b33" ? "B33-WHT" : undefined
      }
    });

    await prisma.price.upsert({
      where: { key: `retail:${product.skuCode}` },
      update: {
        amountCents: product.priceCents,
        currency: "CAD",
        status: "active"
      },
      create: {
        key: `retail:${product.skuCode}`,
        skuId: sku.id,
        amountCents: product.priceCents,
        currency: "CAD",
        status: "active"
      }
    });

    await prisma.productAsset.upsert({
      where: {
        productId_url: {
          productId: productRecord.id,
          url: `/images/products/${product.slug}.jpg`
        }
      },
      update: {
        altText: product.name,
        kind: "image",
        sortOrder: 0
      },
      create: {
        productId: productRecord.id,
        url: `/images/products/${product.slug}.jpg`,
        altText: product.name,
        kind: "image",
        sortOrder: 0
      }
    });

    for (const [key, value] of Object.entries(product.specs)) {
      await prisma.productSpecification.upsert({
        where: {
          productId_key: {
            productId: productRecord.id,
            key
          }
        },
        update: { value },
        create: {
          productId: productRecord.id,
          key,
          value
        }
      });
    }

    await prisma.productSkuErpMapping.upsert({
      where: {
        skuId_erpSystem: {
          skuId: sku.id,
          erpSystem: "demo-erp"
        }
      },
      update: {
        erpSkuKey: product.skuCode,
        ...(product.slug === "base-cabinet-b33"
          ? { erpProductId: 12, erpSkuId: 1001 }
          : {})
      },
      create: {
        skuId: sku.id,
        erpSystem: "demo-erp",
        erpSkuKey: product.skuCode,
        ...(product.slug === "base-cabinet-b33"
          ? { erpProductId: 12, erpSkuId: 1001 }
          : {})
      }
    });

    const dealerLocation = await prisma.dealerLocation.findFirst({
      where: { code: "WPG-MAIN" }
    });

    if (dealerLocation) {
      await prisma.inventorySnapshot.upsert({
        where: {
          skuId_dealerLocationId: {
            skuId: sku.id,
            dealerLocationId: dealerLocation.id
          }
        },
        update: { quantityOnHand: 100 },
        create: {
          skuId: sku.id,
          dealerLocationId: dealerLocation.id,
          quantityOnHand: 100
        }
      });
    }
  }

  await prisma.promotion.upsert({
    where: { key: "cabinet-project-july" },
    update: {
      name: "Cabinet Project Promo",
      description: "Demo active promotion for P1a pricing reads.",
      discountLabel: "Project promo",
      status: "active"
    },
    create: {
      key: "cabinet-project-july",
      name: "Cabinet Project Promo",
      description: "Demo active promotion for P1a pricing reads.",
      discountLabel: "Project promo",
      status: "active"
    }
  });
}

// Official Canadian sales tax standard rates (2026). Rates are decimals of subtotal.
// gst/pst/hst are informational components; combined is what checkout applies.
// Business/finance may adjust these rows at any time; they are not tax advice.
const CANADIAN_TAX_RATES: Array<{
  province: string;
  label: string;
  gst: string;
  pst: string;
  hst: string;
}> = [
  { province: "AB", label: "Alberta", gst: "0.05000", pst: "0.00000", hst: "0.00000" },
  { province: "BC", label: "British Columbia", gst: "0.05000", pst: "0.07000", hst: "0.00000" },
  { province: "MB", label: "Manitoba", gst: "0.05000", pst: "0.07000", hst: "0.00000" },
  { province: "NB", label: "New Brunswick", gst: "0.00000", pst: "0.00000", hst: "0.15000" },
  { province: "NL", label: "Newfoundland and Labrador", gst: "0.00000", pst: "0.00000", hst: "0.15000" },
  { province: "NS", label: "Nova Scotia", gst: "0.00000", pst: "0.00000", hst: "0.14000" },
  { province: "NT", label: "Northwest Territories", gst: "0.05000", pst: "0.00000", hst: "0.00000" },
  { province: "NU", label: "Nunavut", gst: "0.05000", pst: "0.00000", hst: "0.00000" },
  { province: "ON", label: "Ontario", gst: "0.00000", pst: "0.00000", hst: "0.13000" },
  { province: "PE", label: "Prince Edward Island", gst: "0.00000", pst: "0.00000", hst: "0.15000" },
  { province: "QC", label: "Quebec", gst: "0.05000", pst: "0.09975", hst: "0.00000" },
  { province: "SK", label: "Saskatchewan", gst: "0.05000", pst: "0.06000", hst: "0.00000" },
  { province: "YT", label: "Yukon", gst: "0.05000", pst: "0.00000", hst: "0.00000" }
];

async function seedTaxRates() {
  for (const rate of CANADIAN_TAX_RATES) {
    const combined = (Number(rate.gst) + Number(rate.pst) + Number(rate.hst)).toFixed(5);
    await prisma.taxRate.upsert({
      where: { province: rate.province },
      update: {
        label: rate.label,
        gstRate: rate.gst,
        pstRate: rate.pst,
        hstRate: rate.hst,
        combinedRate: combined,
        isActive: true
      },
      create: {
        province: rate.province,
        label: rate.label,
        gstRate: rate.gst,
        pstRate: rate.pst,
        hstRate: rate.hst,
        combinedRate: combined,
        isActive: true
      }
    });
  }
}

async function seedContentModule(moduleKey: string, locale: string, payload: Prisma.InputJsonValue) {
  await prisma.siteContentModule.upsert({
    where: { moduleKey_locale: { moduleKey, locale } },
    update: { status: "published", payload },
    create: { moduleKey, locale, status: "published", payload }
  });
}

async function seedLegalPage(
  slug: string,
  locale: string,
  title: string,
  summary: string,
  sections: Prisma.InputJsonValue
) {
  await prisma.legalPage.upsert({
    where: { slug_locale: { slug, locale } },
    update: { title, summary, sections, status: "published" },
    create: { slug, locale, title, summary, sections, status: "published" }
  });
}

async function seedArticle(
  slug: string,
  locale: string,
  title: string,
  excerpt: string,
  body: Prisma.InputJsonValue,
  category: string
) {
  await prisma.article.upsert({
    where: { slug_locale: { slug, locale } },
    update: { title, excerpt, body, category, status: "published", publishedAt: new Date() },
    create: { slug, locale, title, excerpt, body, category, status: "published", publishedAt: new Date() }
  });
}

async function seedContent() {
  // Home page (hero/banners). Banner id kept stable for storefront continuity.
  await seedContentModule("home-page", "en-CA", {
    hero: {
      id: "p1a-demo-hero",
      title: "Kitchen cabinets and home materials across Canada",
      subtitle: "Shop ready-to-order cabinets, vanities, trim and supplies.",
      href: "/products",
      ctaLabel: "Shop Products"
    },
    banners: [{ id: "p1a-demo-hero", title: "Kitchen cabinets and home materials across Canada", href: "/products" }],
    contentRails: []
  });
  await seedContentModule("home-page", "fr-CA", {
    hero: {
      id: "p1a-demo-hero",
      title: "Armoires de cuisine et matériaux résidentiels au Canada",
      subtitle: "Commandez armoires, meubles-lavabos, moulures et fournitures.",
      href: "/fr/products",
      ctaLabel: "Magasiner les produits"
    },
    banners: [{ id: "p1a-demo-hero", title: "Armoires de cuisine et matériaux résidentiels au Canada", href: "/fr/products" }],
    contentRails: []
  });

  // Navigation
  await seedContentModule("navigation", "en-CA", {
    primaryItems: [
      { label: "Products", href: "/products", order: 1, visible: true },
      { label: "Find a Dealer", href: "/dealers/map", order: 2, visible: true },
      { label: "Dealer Program", href: "/dealer-program", order: 3, visible: true },
      { label: "About", href: "/about", order: 4, visible: true },
      { label: "Contact", href: "/contact", order: 5, visible: true }
    ],
    productMenuItems: [],
    utilityItems: []
  });
  await seedContentModule("navigation", "fr-CA", {
    primaryItems: [
      { label: "Produits", href: "/fr/products", order: 1, visible: true },
      { label: "Trouver un détaillant", href: "/fr/dealers/map", order: 2, visible: true },
      { label: "Programme détaillant", href: "/fr/dealer-program", order: 3, visible: true },
      { label: "À propos", href: "/fr/about", order: 4, visible: true },
      { label: "Contact", href: "/fr/contact", order: 5, visible: true }
    ],
    productMenuItems: [],
    utilityItems: []
  });

  await seedContentModule("catalog", "en-CA", {
    locale: "en-CA",
    categories: [
      { slug: "kitchen-cabinets", label: "Kitchen Cabinets", order: 1, visible: true },
      { slug: "bathroom-vanities", label: "Bathroom Vanities", order: 2, visible: true },
      { slug: "baseboards", label: "Baseboards & Mouldings", order: 3, visible: true }
    ],
    filters: [
      { key: "inStock", label: "In stock", type: "checkbox", enabled: true, order: 1 },
      { key: "category", label: "Category", type: "select", enabled: true, order: 2 }
    ],
    defaultSort: "featured",
    pageSize: 24
  });
  await seedContentModule("storefront_config", "en-CA", {
    defaultLocale: "en-CA",
    contactEmail: "hello@vanstro.ca",
    featureFlags: { reviewsEnabled: true, dealerLookupEnabled: true }
  });
  await seedContentModule("dealer_portal", "en-CA", {
    headline: "Join the VanStro dealer network",
    summary: "Apply to become an authorized dealer and access local inventory tools.",
    ctaHref: "/dealers/apply",
    ctaLabel: "Apply now"
  });

  // Footer
  await seedContentModule("footer", "en-CA", {
    contactLines: ["VanStro Global Supply", "Winnipeg, MB"],
    linkGroups: [
      { title: "Company", links: [{ label: "About", href: "/about", order: 1, visible: true }, { label: "Careers", href: "/careers", order: 2, visible: true }] }
    ],
    socialChannels: [],
    legalLinks: [{ label: "Privacy Policy", href: "/privacy", order: 1, visible: true }, { label: "Terms and Conditions", href: "/terms-and-conditions", order: 2, visible: true }]
  });
  await seedContentModule("footer", "fr-CA", {
    contactLines: ["VanStro Global Supply", "Winnipeg, MB"],
    linkGroups: [
      { title: "Entreprise", links: [{ label: "À propos", href: "/fr/about", order: 1, visible: true }, { label: "Carrières", href: "/fr/careers", order: 2, visible: true }] }
    ],
    socialChannels: [],
    legalLinks: [{ label: "Politique de confidentialité", href: "/fr/privacy", order: 1, visible: true }, { label: "Conditions générales", href: "/fr/terms-and-conditions", order: 2, visible: true }]
  });

  // Legal pages (informational seed content; authoritative legal review pending).
  await seedLegalPage("privacy", "en-CA", "Privacy Policy", "How VanStro handles personal information.", [
    { title: "Overview", body: ["This informational policy describes how personal information is collected and used."], order: 1 }
  ]);
  await seedLegalPage("privacy", "fr-CA", "Politique de confidentialité", "Traitement des renseignements personnels par VanStro.", [
    { title: "Aperçu", body: ["Cette politique informative décrit la collecte et l’utilisation des renseignements personnels."], order: 1 }
  ]);
  await seedLegalPage("terms-and-conditions", "en-CA", "Terms and Conditions", "Terms governing use of the VanStro website.", [
    { title: "Acceptance", body: ["By using this website you agree to these informational terms."], order: 1 }
  ]);
  await seedLegalPage("terms-and-conditions", "fr-CA", "Conditions générales", "Conditions régissant l’utilisation du site VanStro.", [
    { title: "Acceptation", body: ["En utilisant ce site, vous acceptez ces conditions informatives."], order: 1 }
  ]);

  // Articles (resource center sample)
  await seedArticle("choosing-kitchen-cabinets", "en-CA", "Choosing Kitchen Cabinets", "A quick guide to selecting cabinets for your project.", {
    blocks: [{ type: "paragraph", text: "Consider layout, finish and delivery coverage before ordering." }]
  }, "guides");
  await seedArticle("choosing-kitchen-cabinets", "fr-CA", "Choisir ses armoires de cuisine", "Un guide rapide pour choisir vos armoires.", {
    blocks: [{ type: "paragraph", text: "Tenez compte de l’aménagement, du fini et de la couverture de livraison." }]
  }, "guides");
}

const EMAIL_TEMPLATES: Array<{ key: string; name: string; subject: string; bodyText: string }> = [
  {
    key: "contact_lead_received",
    name: "Contact lead received",
    subject: "New VanStro contact lead: {{topic}}",
    bodyText: "A new contact lead was submitted.\n\nName: {{name}}\nEmail: {{email}}\nTopic: {{topic}}\nMessage: {{message}}"
  },
  {
    key: "contact_lead_ack",
    name: "Contact lead acknowledgement",
    subject: "We received your VanStro inquiry",
    bodyText: "Hi {{name}},\n\nThank you for contacting VanStro. We received your message about {{topic}} and will respond soon.\n\nReference: {{contactLeadId}}"
  },
  {
    key: "dealer_application_received",
    name: "Dealer application received",
    subject: "New VanStro dealer application: {{companyName}}",
    bodyText: "A new dealer application was submitted.\n\nCompany: {{companyName}}\nContact: {{contactName}}\nEmail: {{email}}"
  },
  {
    key: "dealer_application_ack",
    name: "Dealer application acknowledgement",
    subject: "We received your VanStro dealer application",
    bodyText: "Hi {{contactName}},\n\nThank you for applying to the VanStro dealer program for {{companyName}}. Our team will review your application and follow up.\n\nReference: {{dealerApplicationId}}"
  },
  {
    key: "product_review_pending",
    name: "Product review pending moderation",
    subject: "New VanStro product review pending: {{productName}}",
    bodyText: "A new product review is pending moderation.\n\nProduct: {{productName}}\nRating: {{rating}}\nReviewer: {{nickname}}"
  },
  {
    key: "order_confirmation",
    name: "Order confirmation",
    subject: "Your VanStro order {{orderId}} is confirmed",
    bodyText: "Hi {{firstName}},\n\nThank you for your order.\n\nOrder: {{orderId}}\nTotal: {{totalDisplay}}\nFulfillment: {{fulfillment}}\n\nWe will notify you when your dealer prepares your order."
  },
  {
    key: "welcome",
    name: "Welcome email",
    subject: "Welcome to VanStro, {{firstName}}",
    bodyText: "Hi {{firstName}},\n\nYour VanStro account is ready. You can save addresses, track orders, and shop with your local dealer.\n\nSigned in as {{email}}."
  },
  {
    key: "shipment_notification",
    name: "Shipment notification",
    subject: "Your VanStro order {{orderId}} has shipped",
    bodyText: "Hi {{firstName}},\n\nYour order {{orderId}} has shipped.\n\nTracking: {{trackingNumber}}\nStatus: {{shipmentStatus}}\n\nYou can check progress anytime with your order number and access token."
  },
  {
    key: "order_delivered",
    name: "Order delivered",
    subject: "Your VanStro order {{orderId}} was delivered",
    bodyText: "Hi {{firstName}},\n\nYour order {{orderId}} was marked as delivered. Thank you for shopping with VanStro."
  },
  {
    key: "support_handoff_received",
    name: "Support handoff received",
    subject: "New VanStro support handoff from {{channel}}",
    bodyText: "A customer requested human support.\n\nHandoff: {{handoffId}}\nChannel: {{channel}}\nSource: {{sourcePath}}\nMessages: {{messageCount}}"
  }
];

async function seedEmailTemplates() {
  for (const template of EMAIL_TEMPLATES) {
    const record = await prisma.emailTemplate.upsert({
      where: { key: template.key },
      update: { name: template.name },
      create: { key: template.key, name: template.name }
    });
    await prisma.emailTemplateVersion.upsert({
      where: { templateId_version: { templateId: record.id, version: 1 } },
      update: { subject: template.subject, bodyText: template.bodyText, isPublished: true },
      create: { templateId: record.id, version: 1, subject: template.subject, bodyText: template.bodyText, isPublished: true }
    });
  }
}

async function main() {
  const superAdminPassword = getRequiredSuperAdminPassword();

  await seedPermissions();
  await seedSuperAdmin(superAdminPassword);
  await seedDealers();
  await seedCatalog();
  await seedTaxRates();
  await seedContent();
  await seedEmailTemplates();
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log("Seed complete.");
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
