import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";
import { prisma } from "@vanstro/db";
import type { ErpProductClient } from "../erp-product/client.js";
import { syncCategoriesFromUpstream, syncProductsFromUpstream } from "./service.js";

function mockClient(data: {
  products?: Parameters<ErpProductClient["productList"]>;
  skus?: Awaited<ReturnType<ErpProductClient["skuList"]>>;
}) {
  return {
    productList: async () => ({
      list: [
        {
          id: 12,
          category_id: 3,
          category_name: "Cabinets",
          product_name: "Base Cabinet",
          product_material: [],
          product_image: [],
          has_color: 1
        }
      ],
      total: 1
    }),
    skuList: async () =>
      data.skus ?? {
        list: [
          {
            id: 1001,
            product_id: 12,
            sku_title: "Base Cabinet B33",
            sku_model: "B33",
            sku_code: `erp-sync-${randomBytes(4).toString("hex")}`,
            width: "33",
            length: "24",
            height: "34.5",
            bomList: []
          }
        ]
      },
    categoryList: async () => ({ list: [] })
  } as unknown as ErpProductClient;
}

test("syncProductsFromUpstream imports unmapped ERP SKU as draft product", async () => {
  const skuCode = `erp-sync-${randomBytes(4).toString("hex")}`;
  const client = mockClient({
    skus: {
      list: [
        {
          id: 1001,
          product_id: 12,
          sku_title: "Imported Cabinet",
          sku_model: "B33",
          sku_code: skuCode,
          width: "33",
          length: "24",
          height: "34.5",
          bomList: []
        }
      ]
    }
  });

  const result = await syncProductsFromUpstream(client, { erpSystem: "test-erp" });
  assert.equal(result.imported, 1);
  assert.equal(result.errors.length, 0);

  const mapping = await prisma.productSkuErpMapping.findUnique({
    where: { erpSystem_erpSkuKey: { erpSystem: "test-erp", erpSkuKey: skuCode } },
    include: { sku: { include: { product: true } } }
  });
  assert.ok(mapping);
  assert.equal(mapping.sku.skuCode, skuCode);
  assert.equal(mapping.sku.product.status, "draft");

  await prisma.productSkuErpMapping.deleteMany({ where: { erpSystem: "test-erp", erpSkuKey: skuCode } });
  await prisma.platformSku.deleteMany({ where: { skuCode } });
  await prisma.product.deleteMany({ where: { slug: { contains: skuCode.toLowerCase() } } });
});

test("syncProductsFromUpstream groups sibling ERP SKUs under one product", async () => {
  const suffix = randomBytes(4).toString("hex");
  const firstSkuCode = `erp-group-a-${suffix}`;
  const secondSkuCode = `erp-group-b-${suffix}`;
  const client = mockClient({
    skus: {
      list: [
        { id: 2001, product_id: 12, sku_title: "Cabinet A", sku_model: "A", sku_code: firstSkuCode, width: "30", length: "24", height: "34.5", bomList: [] },
        { id: 2002, product_id: 12, sku_title: "Cabinet B", sku_model: "B", sku_code: secondSkuCode, width: "36", length: "24", height: "34.5", bomList: [] }
      ]
    }
  });

  const result = await syncProductsFromUpstream(client, { erpSystem: `group-${suffix}` });
  assert.equal(result.imported, 2);
  const skus = await prisma.platformSku.findMany({ where: { skuCode: { in: [firstSkuCode, secondSkuCode] } } });
  assert.equal(skus.length, 2);
  assert.equal(new Set(skus.map((sku) => sku.productId)).size, 1);
  await prisma.productSkuErpMapping.deleteMany({ where: { erpSystem: `group-${suffix}` } });
  await prisma.platformSku.deleteMany({ where: { skuCode: { in: [firstSkuCode, secondSkuCode] } } });
  await prisma.product.deleteMany({ where: { id: skus[0]?.productId } });
});

test("syncProductsFromUpstream updates existing mapping without changing product slug", async () => {
  const skuCode = `erp-update-${randomBytes(4).toString("hex")}`;
  const product = await prisma.product.create({
    data: {
      slug: `custom-${skuCode}`,
      name: "Dashboard Name",
      status: "active"
    }
  });
  const sku = await prisma.platformSku.create({
    data: { productId: product.id, skuCode, name: "Dashboard SKU", status: "active" }
  });
  const mapping = await prisma.productSkuErpMapping.create({
    data: {
      skuId: sku.id,
      erpSystem: "test-erp",
      erpSkuKey: skuCode,
      erpProductId: 10,
      erpSkuId: 900
    }
  });

  const client = mockClient({
    skus: {
      list: [
        {
          id: 1002,
          product_id: 12,
          sku_title: "ERP Title",
          sku_model: "B33",
          sku_code: skuCode,
          width: "30",
          length: "24",
          height: "34.5",
          bomList: []
        }
      ]
    }
  });

  const result = await syncProductsFromUpstream(client, { erpSystem: "test-erp" });
  assert.equal(result.updated, 1);

  const refreshedProduct = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
  const refreshedMapping = await prisma.productSkuErpMapping.findUniqueOrThrow({ where: { id: mapping.id } });
  assert.equal(refreshedProduct.slug, `custom-${skuCode}`);
  assert.equal(refreshedProduct.name, "Dashboard Name");
  assert.equal(refreshedMapping.erpSkuId, 1002);
  assert.equal(refreshedMapping.erpProductId, 12);

  await prisma.productSkuErpMapping.delete({ where: { id: mapping.id } });
  await prisma.platformSku.delete({ where: { id: sku.id } });
  await prisma.product.delete({ where: { id: product.id } });
});

test("pull does not write VanStro-owned media, marketing copy or publish status", async () => {
  const skuCode = `erp-no-media-${randomBytes(4).toString("hex")}`;
  const client = {
    productList: async () => ({
      list: [
        {
          id: 77,
          category_id: 3,
          category_name: "Cabinets",
          product_name: "Media Cabinet",
          product_material: [{ material: "oak" }],
          product_image: ["https://cdn.example.com/77.png"],
          has_color: 1
        }
      ],
      total: 1
    }),
    skuList: async () => ({
      list: [
        {
          id: 7701,
          product_id: 77,
          sku_title: "Media Cabinet M",
          sku_model: "M77",
          sku_code: skuCode,
          width: "33",
          length: "24",
          height: "34.5",
          bomList: []
        }
      ]
    }),
    categoryList: async () => ({ list: [] })
  } as unknown as ErpProductClient;

  const result = await syncProductsFromUpstream(client, { erpSystem: "test-erp" });
  assert.equal(result.imported, 1);
  assert.equal(result.errors.length, 0);

  const mapping = await prisma.productSkuErpMapping.findUnique({
    where: { erpSystem_erpSkuKey: { erpSystem: "test-erp", erpSkuKey: skuCode } },
    include: { sku: { include: { product: { include: { assets: true, specifications: true } } } } }
  });
  assert.ok(mapping);
  // VanStro-owned fields stay untouched by pull.
  assert.equal(mapping.sku.product.assets.length, 0);
  assert.equal(mapping.sku.product.shortDescription, null);
  assert.equal(mapping.sku.product.status, "draft"); // schema default, not written by pull
  assert.equal(mapping.sku.status, "active"); // schema default, not written by pull
  // ERP-owned fields still land from pull.
  assert.equal(mapping.sku.product.name, "Media Cabinet");
  assert.equal(mapping.sku.product.dimensions, "33 x 24 x 34.5");
  assert.equal((mapping.sku.attributes as Record<string, unknown> | null)?.erpSkuModel, "M77");
  assert.equal(mapping.sku.product.specifications.length, 1);
  assert.equal(mapping.erpProductId, 77);
  assert.equal(mapping.erpSkuId, 7701);

  await prisma.productSkuErpMapping.deleteMany({ where: { erpSystem: "test-erp", erpSkuKey: skuCode } });
  await prisma.platformSku.deleteMany({ where: { skuCode } });
  await prisma.product.deleteMany({ where: { slug: { contains: skuCode.toLowerCase() } } });
});

test("pull result carries sourceSystem and a stable payload fingerprint; replays update in place", async () => {
  const skuCode = `erp-fp-${randomBytes(4).toString("hex")}`;
  const client = mockClient({
    skus: {
      list: [
        {
          id: 3301,
          product_id: 12,
          sku_title: "Fingerprint Cabinet",
          sku_model: "B33",
          sku_code: skuCode,
          width: "33",
          length: "24",
          height: "34.5",
          bomList: []
        }
      ]
    }
  });

  const first = await syncProductsFromUpstream(client, { erpSystem: "test-erp" });
  assert.equal(first.imported, 1);
  assert.equal(first.errors.length, 0);
  assert.equal(first.sourceSystem, "test-erp");
  assert.match(first.fingerprint, /^[0-9a-f]{64}$/);

  const second = await syncProductsFromUpstream(client, { erpSystem: "test-erp" });
  assert.equal(second.imported, 0);
  assert.equal(second.updated, 1);
  assert.equal(second.fingerprint, first.fingerprint);

  const mappingCount = await prisma.productSkuErpMapping.count({
    where: { erpSystem: "test-erp", erpSkuKey: skuCode }
  });
  assert.equal(mappingCount, 1);

  await prisma.productSkuErpMapping.deleteMany({ where: { erpSystem: "test-erp", erpSkuKey: skuCode } });
  await prisma.platformSku.deleteMany({ where: { skuCode } });
  await prisma.product.deleteMany({ where: { slug: { contains: skuCode.toLowerCase() } } });
});

test("category pull keeps ERP-owned name/status but not VanStro-owned display order", async () => {
  const suffix = randomBytes(4).toString("hex");
  const categoryCode = `erp-cat-${suffix}`;
  const client = {
    categoryList: async () => ({
      list: [
        {
          id: 55,
          parent_id: 0,
          pid: 0,
          category_code: categoryCode,
          category_name: `ERP Category ${suffix}`,
          sort: 7,
          status: 0
        }
      ]
    })
  } as unknown as ErpProductClient;

  const result = await syncCategoriesFromUpstream(client);
  assert.equal(result.imported, 1);

  const category = await prisma.category.findUniqueOrThrow({ where: { slug: categoryCode } });
  assert.equal(category.name, `ERP Category ${suffix}`);
  assert.equal(category.sortOrder, 0); // VanStro-owned display order not overwritten by ERP sort
  assert.equal(category.isActive, false); // ERP-owned status is applied

  await prisma.category.delete({ where: { id: category.id } });
});
