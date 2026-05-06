import { test } from "node:test";
import assert from "node:assert/strict";
import { checkLightDayEveningEscalation } from "../../src/rules/lightDay.js";
import { buildWeek, DISHES, SLOTS_5 } from "../helpers/fixtures.mjs";

test("fires when day starts very light and ends with cheat", () => {
  const day = buildWeek({ "2026-05-04": ["porridge", "skyr", "porridge", "skyr", "pizza"] }).days["2026-05-04"];
  const w = checkLightDayEveningEscalation(day, "2026-05-04", DISHES, SLOTS_5);
  assert.equal(w.length, 1);
  assert.equal(w[0].ruleId, "light-day-evening-escalation");
});

test("does not fire when other meals are also yellow/red", () => {
  const day = buildWeek({ "2026-05-04": ["porridge", "skyr", "couscous", "skyr", "pizza"] }).days["2026-05-04"];
  // lunch=yellow, so day is not "very light"
  assert.equal(checkLightDayEveningEscalation(day, "2026-05-04", DISHES, SLOTS_5).length, 0);
});
