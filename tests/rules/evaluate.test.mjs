import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluateWeek } from "../../src/rules/evaluate.js";
import { buildWeek, DISHES, DEFAULT_SETTINGS } from "../helpers/fixtures.mjs";

test("returns shape with weeklyPoints, weeklyDistribution, perDay, warnings", () => {
  const week = buildWeek({ "2026-05-04": ["porridge", "skyr", "couscous", null, null] });
  const v = evaluateWeek(week, [], DISHES, DEFAULT_SETTINGS);
  assert.ok(v.weeklyPoints);
  assert.ok(v.weeklyDistribution);
  assert.ok(v.perDay);
  assert.ok(Array.isArray(v.warnings));
});

test("collects warnings from every rule", () => {
  // Day with two heavy in a row → triggers heavy rule
  const week = buildWeek({
    "2026-05-04": [null, null, "falafel", null, "pizza"],
    "2026-05-05": [null, null, "pizza",   null, null],   // pizza weekly max 1 violated
  });
  const v = evaluateWeek(week, [], DISHES, DEFAULT_SETTINGS);
  const ids = v.warnings.map((w) => w.ruleId);
  assert.ok(ids.includes("no-two-heavy-in-a-row"));
  assert.ok(ids.includes("frequency-limit"));
});

test("perDay includes points, label, and slot verdicts", () => {
  const week = buildWeek({ "2026-05-04": [null, null, "falafel", null, "pizza"] });
  const v = evaluateWeek(week, [], DISHES, DEFAULT_SETTINGS);
  const day = v.perDay["2026-05-04"];
  assert.equal(day.points, 1 + 3);
  assert.ok(Array.isArray(day.slots));
  assert.equal(day.slots.length, 5);
  // The dinner slot (idx 4) has a heavy warning
  assert.equal(day.slots[4].verdict, "warn");
});

test("perDay marks bestCombo when a day matches", () => {
  const week = buildWeek({ "2026-05-04": ["porridge", null, "porridge", null, "couscous"] });
  const v = evaluateWeek(week, [], DISHES, DEFAULT_SETTINGS);
  assert.equal(v.perDay["2026-05-04"].bestCombo, "gruen-gruen-gelb");
});
