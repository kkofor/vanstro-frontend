import { prisma } from "./index.js";
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
        categoryId: category.id
      },
      create: {
        slug: product.slug,
        name: product.name,
        shortDescription: product.shortDescription,
        description: product.description,
        status: "active",
        categoryId: category.id
      }
    });

    const sku = await prisma.platformSku.upsert({
      where: { skuCode: product.skuCode },
      update: {
        name: product.name,
        status: "active",
        productId: productRecord.id
      },
      create: {
        productId: productRecord.id,
        skuCode: product.skuCode,
        name: product.name,
        status: "active"
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
        erpSkuKey: product.skuCode
      },
      create: {
        skuId: sku.id,
        erpSystem: "demo-erp",
        erpSkuKey: product.skuCode
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

async function main() {
  const superAdminPassword = getRequiredSuperAdminPassword();

  await seedPermissions();
  await seedSuperAdmin(superAdminPassword);
  await seedDealers();
  await seedCatalog();
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
