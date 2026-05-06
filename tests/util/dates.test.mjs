import { test } from "node:test";
import assert from "node:assert/strict";
import { isoWeekId, mondayOf, addDays, fmtDayShort, dateKey, isoWeekIdFromKey } from "../../src/util/dates.js";

test("isoWeekId for 2026-05-04 (Mon) is 2026-W19", () => {
  assert.equal(isoWeekId(new Date("2026-05-04T12:00:00Z")), "2026-W19");
});

test("isoWeekId for 2026-05-10 (Sun) is still 2026-W19", () => {
  assert.equal(isoWeekId(new Date("2026-05-10T12:00:00Z")), "2026-W19");
});

test("isoWeekId for 2026-12-31 falls into 2026-W53 or 2027-W01 per ISO rule", () => {
  // 2026-12-31 is a Thursday; week 53 of 2026 by ISO rules
  assert.equal(isoWeekId(new Date("2026-12-31T12:00:00Z")), "2026-W53");
});

test("mondayOf returns Monday of the same ISO week", () => {
  assert.equal(mondayOf(new Date("2026-05-08T12:00:00Z")).toISOString().slice(0, 10), "2026-05-04");
  assert.equal(mondayOf(new Date("2026-05-04T12:00:00Z")).toISOString().slice(0, 10), "2026-05-04");
});

test("addDays adds positive and negative days", () => {
  const d = new Date("2026-05-04T00:00:00Z");
  assert.equal(addDays(d, 3).toISOString().slice(0, 10), "2026-05-07");
  assert.equal(addDays(d, -1).toISOString().slice(0, 10), "2026-05-03");
});

test("dateKey returns YYYY-MM-DD", () => {
  assert.equal(dateKey(new Date("2026-05-04T23:59:59Z")), "2026-05-04");
});

test("fmtDayShort returns localized German short day", () => {
  assert.match(fmtDayShort(new Date("2026-05-04T12:00:00Z")), /^Mo|Di|Mi|Do|Fr|Sa|So\b/);
});

test("isoWeekIdFromKey converts a date key to an ISO week id", () => {
  assert.equal(isoWeekIdFromKey("2026-05-04"), "2026-W19");
});
