import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const component = await readFile(
  new URL("./OrderDetailClient.tsx", import.meta.url),
  "utf8"
);
const styles = await readFile(new URL("../../app/globals.css", import.meta.url), "utf8");

test("Order Detail summary keeps product copy and amount in separate direct children", () => {
  assert.match(
    component,
    /className="mini-line order-summary-line"[\s\S]*?<span><strong>\{item\.productName\}<\/strong><small>[\s\S]*?<\/span>[\s\S]*?<strong>\{item\.lineTotal/
  );
});

test("Order Detail product names wrap without splitting the amount", () => {
  assert.match(styles, /\.order-summary-line > span \{[\s\S]*?min-width: 0;[\s\S]*?\}/);
  assert.match(
    styles,
    /\.order-summary-line > span > strong \{[\s\S]*?overflow-wrap: anywhere;[\s\S]*?white-space: normal;[\s\S]*?\}/
  );
  assert.match(styles, /\.order-summary-line > strong \{[\s\S]*?white-space: nowrap;[\s\S]*?\}/);
});
