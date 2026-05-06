import { test } from "node:test";
import assert from "node:assert/strict";
import { checkNoTwoHeavyInRow } from "../../src/rules/heavy.js";
import { buildWeek, DISHES, SLOTS_5 } from "../helpers/fixtures.mjs";

const week = buildWeek({
  "2026-05-04": [null, null, "falafel", null, "pizza"],
});

test("fires when two heavy slots are adjacent", () => {
  // Slots: [breakfast, snack, lunch, snack, dinner]
  // falafel (heavy yellow) at lunch (idx 2), pizza (heavy red) at dinner (idx 4)
  // Adjacent meaningful slots = lunch(2) and dinner(4). Empty snack(3) doesn't break adjacency
  // because we only consider filled slots in order.
  const day = week.days["2026-05-04"];
  const w = checkNoTwoHeavyInRow(day, "2026-05-04", DISHES, SLOTS_5);
  assert.equal(w.length, 1);
  assert.equal(w[0].ruleId, "no-two-heavy-in-a-row");
  assert.equal(w[0].where.slotIndex, 4);
});

test("does not fire when only one heavy in a day", () => {
  const day = buildWeek({ "2026-05-04": [null, null, "falafel", null, null] }).days["2026-05-04"];
  assert.equal(checkNoTwoHeavyInRow(day, "2026-05-04", DISHES, SLOTS_5).length, 0);
});

test("does not fire when a non-heavy slot separates them", () => {
  const day = buildWeek({ "2026-05-04": [null, null, "falafel", "skyr", "pizza"] }).days["2026-05-04"];
  // falafel at lunch, skyr (green) at snack, pizza at dinner.
  // Filled-and-heavy adjacency? skyr is between but it's not heavy.
  // Per the spec, "adjacent" = adjacent in the slot sequence; a non-heavy
  // slot between them counts as a break.
  assert.equal(checkNoTwoHeavyInRow(day, "2026-05-04", DISHES, SLOTS_5).length, 0);
});
