import { test } from "node:test";
import assert from "node:assert/strict";
import { checkNoTwoCheatsSameDay } from "../../src/rules/cheats.js";
import { buildWeek, DISHES, SLOTS_5 } from "../helpers/fixtures.mjs";

test("fires on second 🔴 in a single day", () => {
  const day = buildWeek({ "2026-05-04": [null, null, "pizza", null, "risotto"] }).days["2026-05-04"];
  const w = checkNoTwoCheatsSameDay(day, "2026-05-04", DISHES, SLOTS_5);
  assert.equal(w.length, 1);
  assert.equal(w[0].ruleId, "no-cheat-plus-cheat-same-day");
  assert.equal(w[0].where.slotIndex, 4);
});

test("one cheat per day is fine", () => {
  const day = buildWeek({ "2026-05-04": [null, null, "pizza", null, null] }).days["2026-05-04"];
  assert.equal(checkNoTwoCheatsSameDay(day, "2026-05-04", DISHES, SLOTS_5).length, 0);
});
