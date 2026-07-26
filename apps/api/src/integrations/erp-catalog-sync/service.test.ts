import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";
import { prisma } from "@vanstro/db";
import type { ErpProductClient } from "../erp-product/client.js";
import { syncProductsFromUpstream } from "./service.js";

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
