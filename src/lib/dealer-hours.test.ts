import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { dealerHoursKind, isDealerOpen } from "./dealer-hours.ts";

describe("dealer hours (America/Winnipeg wall clock)", () => {
  // 2026-01-15 Thursday, CST UTC−6.
  it("Thu 08:59 → closed", () => {
    const now = new Date("2026-01-15T14:59:00.000Z");
    assert.equal(isDealerOpen(now), false);
    assert.equal(dealerHoursKind(now), "closed");
  });

  it("Thu 09:00 → open", () => {
    const now = new Date("2026-01-15T15:00:00.000Z");
    assert.equal(isDealerOpen(now), true);
    assert.equal(dealerHoursKind(now), "open");
  });

  it("Thu 16:59 → open", () => {
    const now = new Date("2026-01-15T22:59:00.000Z");
    assert.equal(isDealerOpen(now), true);
  });

  it("Thu 17:00 → closed (opens 9 a.m. Friday)", () => {
    const now = new Date("2026-01-15T23:00:00.000Z");
    assert.equal(dealerHoursKind(now), "closed");
  });

  // 2026-01-16 Friday, CST UTC−6.
  it("Fri 16:59 → open", () => {
    assert.equal(dealerHoursKind(new Date("2026-01-16T22:59:00.000Z")), "open");
  });

  it("Fri 17:00 → closedUntilMonday", () => {
    assert.equal(dealerHoursKind(new Date("2026-01-16T23:00:00.000Z")), "closedUntilMonday");
  });

  // 2026-01-17 Saturday, CST UTC−6. 12:00 = 18:00 UTC.
  it("Sat 12:00 → closedUntilMonday", () => {
    assert.equal(dealerHoursKind(new Date("2026-01-17T18:00:00.000Z")), "closedUntilMonday");
  });

  // 2026-01-18 Sunday, CST UTC−6. 23:00 = 05:00 Monday UTC.
  it("Sun 23:00 → closedUntilMonday", () => {
    assert.equal(dealerHoursKind(new Date("2026-01-19T05:00:00.000Z")), "closedUntilMonday");
  });

  // 2026-01-19 Monday, CST UTC−6.
  it("Mon 08:59 → closedUntilMonday", () => {
    assert.equal(dealerHoursKind(new Date("2026-01-19T14:59:00.000Z")), "closedUntilMonday");
  });

  it("Mon 09:00 → open", () => {
    assert.equal(dealerHoursKind(new Date("2026-01-19T15:00:00.000Z")), "open");
  });
});
