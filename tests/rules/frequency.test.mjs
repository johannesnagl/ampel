import { test } from "node:test";
import assert from "node:assert/strict";
import { checkFrequency } from "../../src/rules/frequency.js";
import { buildWeek, DISHES, SLOTS_5 } from "../helpers/fixtures.mjs";

test("fires when a weekly dish appears more than max times in same week", () => {
  // pizza freq = weekly max 1
  const week = buildWeek({
    "2026-05-04": [null, null, "pizza", null, null],
    "2026-05-06": [null, null, "pizza", null, null], // 2nd in same week
  });
  const w = checkFrequency(week, [], DISHES); // no other weeks
  assert.equal(w.some((x) => x.ruleId === "frequency-limit"), true);
  // 2 pizzas → 1 over the limit, should fire on the *second* one
});

test("counts both planned and logged equally", () => {
  const week = buildWeek({
    "2026-05-04": [null, null, "pizza", null, null],
  });
  // Set logged on the slot
  week.days["2026-05-04"].slots[2].loggedAt = "2026-05-04T18:00:00Z";
  const w = checkFrequency(week, [], DISHES);
  // Only 1 occurrence → no warning
  assert.equal(w.filter((x) => x.ruleId === "frequency-limit").length, 0);
});

test("monthly dishes count occurrences across the calendar month from supplied weeks", () => {
  // Add a fake monthly dish: nutella with max 2/month
  const dishes = [
    ...DISHES,
    { id: "nutella",  name: "Nutella Frühstück", category: "red", heavy: false, frequency: { type: "monthly", max: 2 }, slotTypes: ["breakfast"], tags: [], notes: "" },
  ];
  const wA = buildWeek({ "2026-05-04": ["nutella", null, null, null, null] });
  const wB = buildWeek({ "2026-05-11": ["nutella", null, null, null, null] });
  const wC = buildWeek({ "2026-05-18": ["nutella", null, null, null, null] }); // 3rd in May
  const w = checkFrequency(wC, [wA, wB], dishes);
  assert.equal(w.some((x) => x.ruleId === "frequency-limit"), true);
});
