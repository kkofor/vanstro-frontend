import assert from "node:assert/strict";
import test from "node:test";
import {
  CanadaPostAddressCompleteClient,
  normalizeCanadianPostalCode
} from "./address-complete.js";

test("normalizeCanadianPostalCode formats valid codes", () => {
  assert.equal(normalizeCanadianPostalCode("r3c1a1"), "R3C 1A1");
  assert.equal(normalizeCanadianPostalCode("R3C 1A1"), "R3C 1A1");
  assert.equal(normalizeCanadianPostalCode("invalid"), undefined);
});

test("canada post find returns suggestions", async () => {
  const fetchMock = async () =>
    new Response(
      JSON.stringify({
        Items: [{ Id: "ca-1", Text: "123 Main St", Description: "Winnipeg MB" }]
      }),
      { status: 200 }
    );
  const client = new CanadaPostAddressCompleteClient("test-key", fetchMock as typeof fetch);
  const suggestions = await client.find("123 Main");
  assert.equal(suggestions.length, 1);
  assert.equal(suggestions[0]?.id, "ca-1");
});

test("canada post retrieve maps address fields", async () => {
  const fetchMock = async () =>
    new Response(
      JSON.stringify({
        Items: [{
          Line1: "123 Main St",
          Line2: "Unit 4",
          City: "Winnipeg",
          ProvinceCode: "MB",
          PostalCode: "R3C1A1",
          CountryIso2: "CA"
        }]
      }),
      { status: 200 }
    );
  const client = new CanadaPostAddressCompleteClient("test-key", fetchMock as typeof fetch);
  const address = await client.retrieve("ca-1");
  assert.ok(address);
  assert.equal(address?.line1, "123 Main St");
  assert.equal(address?.postalCode, "R3C 1A1");
});

test("canada post find returns empty for short queries", async () => {
  const fetchMock = async () => {
    throw new Error("should not fetch");
  };
  const client = new CanadaPostAddressCompleteClient("test-key", fetchMock as typeof fetch);
  const suggestions = await client.find("ab");
  assert.deepEqual(suggestions, []);
});
