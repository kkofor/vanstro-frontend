import assert from "node:assert/strict";
import test from "node:test";
import { prisma } from "@vanstro/db";
import { createApp } from "../app.js";
import { mapErpColorsToFinishOptions } from "../integrations/erp-product/mappers.js";

const app = createApp();
const originalFetch = globalThis.fetch;

test.after(() => {
  globalThis.fetch = originalFetch;
});

test("mapErpColorsToFinishOptions prefers French labels", () => {
  const options = mapErpColorsToFinishOptions(
    [
      {
        id: 1,
        product_id: 12,
        color_id: 9,
        color_code: "#f4f2ee",
        color_name_en: "White",
        color_name_fr: "Blanc",
        color_name_cn: "白色",
        color_image: "",
        sort: 0
      }
    ],
    "fr-CA"
  );
  assert.equal(options[0]?.name, "Blanc");
});

test("GET /products/:identifier/erp-colors returns mapped finish options", async () => {
  globalThis.fetch = async (input) => {
    const url = String(input);
    assert.match(url, /colorList\?/);
    return new Response(
      JSON.stringify({
        code: 1,
        msg: "",
        time: 1719999999,
        data: {
          list: [
            {
              id: 1,
              product_id: 12,
              color_id: 9,
              color_code: "#f4f2ee",
              color_name_en: "White",
              color_name_fr: "Blanc",
              color_name_cn: "白色",
              color_image: "https://cdn.example.com/white.png",
              sort: 0
            }
          ]
        }
      }),
      { status: 200, headers: { "content-type": "application/json" } }
    );
  };

  const location = await prisma.dealerLocation.findFirst({ where: { code: "WPG-MAIN" } });
  assert.ok(location);

  const response = await app.request(
    `/api/v1/products/base-cabinet-b33/erp-colors?dealerLocationId=${location!.id}&locale=en-CA`
  );
  assert.equal(response.status, 200);
  const body = (await response.json()) as {
    data: Array<{ name: string; sku: string }>;
    meta: { erpProductId: number; hasColor: boolean };
  };
  assert.equal(body.meta.erpProductId, 12);
  assert.equal(body.meta.hasColor, true);
  assert.equal(body.data[0]?.name, "White");
  assert.equal(body.data[0]?.sku, "#f4f2ee");
});

test("GET /products/:identifier/erp-colors returns 409 when ERP product id is missing", async () => {
  const sku = await prisma.platformSku.findFirst({ where: { skuCode: "023021412" } });
  assert.ok(sku);
  const product = await prisma.product.findUnique({ where: { id: sku!.productId } });
  assert.ok(product);

  const response = await app.request(`/api/v1/products/${product!.slug}/erp-colors`);
  assert.equal(response.status, 409);
  const body = (await response.json()) as { code: string };
  assert.equal(body.code, "ERP_MAPPING_INCOMPLETE");
});
