import assert from "node:assert/strict";
import test from "node:test";
import { ErpProductClient } from "./erp-product/client.js";

function mockFetch(response: unknown, status = 200) {
  return async () =>
    new Response(JSON.stringify(response), {
      status,
      headers: { "content-type": "application/json" }
    });
}

test("ErpProductClient parses successful colorList envelope", async () => {
  const client = new ErpProductClient(
    "http://erp.test/api/Product",
    mockFetch({
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
    }) as typeof fetch
  );

  const data = await client.colorList({ productId: 12, productSkuId: 1001, dealerId: 1 });
  assert.equal(data.list.length, 1);
  assert.equal(data.list[0]?.color_name_en, "White");
});

test("ErpProductClient throws when ERP returns code 0", async () => {
  const client = new ErpProductClient(
    "http://erp.test/api/Product",
    mockFetch({
      code: 0,
      msg: "product not found",
      time: 1719999999,
      data: null
    }) as typeof fetch
  );

  await assert.rejects(() => client.productList(), /product not found/);
});
