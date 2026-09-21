import assert from "node:assert/strict";
import { formatDisplayMeasurement, formatMoney, formatUnitPrice } from "../src/lib/i18n/display-format.ts";

const nbsp = " ";

assert.equal(formatMoney({ amount: 302, currency: "CAD" }, "fr-CA"), `302,00${nbsp}$`);
assert.equal(formatMoney({ amount: 302, currency: "CAD" }, "en-CA"), "$302.00");

assert.equal(
  formatDisplayMeasurement('12" W × 34½" H × 24" D', "fr-CA"),
  `12${nbsp}po L × 34,5${nbsp}po H × 24${nbsp}po P`
);
assert.equal(formatDisplayMeasurement('12" W × 34½" H × 24" D', "en-CA"), '12" W × 34½" H × 24" D');
assert.equal(formatDisplayMeasurement("11.7 mm", "fr-CA"), `11,7${nbsp}mm`);
assert.equal(formatDisplayMeasurement("20%", "fr-CA"), `20${nbsp}%`);
assert.equal(formatDisplayMeasurement("11.7 mm", "en-CA"), "11.7 mm");
assert.equal(formatDisplayMeasurement("20%", "en-CA"), "20%");
assert.equal(
  formatDisplayMeasurement('H2-½" × W ½" × 10ft', "fr-CA"),
  `2,5${nbsp}po (H) × 0,5${nbsp}po (L) × 10${nbsp}pi`
);
assert.equal(
  formatDisplayMeasurement('H4-9⁄16" ／ W 11／16" ＊ 7ft', "fr-CA"),
  `4,5625${nbsp}po (H) × 0,6875${nbsp}po (L) × 7${nbsp}pi`
);
assert.equal(
  formatDisplayMeasurement('H3－1/2＂，W 1/2＂★10ｆｔ', "fr-CA"),
  `3,5${nbsp}po (H) × 0,5${nbsp}po (L) × 10${nbsp}pi`
);
assert.equal(
  formatDisplayMeasurement('H2-1 / 2" × W 1 ／ 2" × 10ft', "fr-CA"),
  `2,5${nbsp}po (H) × 0,5${nbsp}po (L) × 10${nbsp}pi`
);
assert.equal(
  formatDisplayMeasurement('(H × L)H3-½" × W ½" × 10ft', "fr-CA"),
  `3,5${nbsp}po (H) × 0,5${nbsp}po (L) × 10${nbsp}pi`
);
assert.doesNotMatch(formatDisplayMeasurement('(H × L)H3-½" × W ½" × 10ft', "fr-CA"), /\(H × L\)H/);

assert.equal(formatUnitPrice({ amount: 302, currency: "CAD" }, "each", "fr-CA"), `302,00${nbsp}$ l’unité`);
assert.equal(formatUnitPrice({ amount: 302, currency: "CAD" }, "each", "en-CA"), "$302.00/ea");

console.log("fr-CA display formatting checks passed");
