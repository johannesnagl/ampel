import { test } from "node:test";
import assert from "node:assert/strict";
import { calcDistribution } from "../../src/rules/distribution.js";
import { buildWeek, DISHES } from "../helpers/fixtures.mjs";

test("counts categories across the week, target=35", () => {
  const week = buildWeek({
    "2026-05-04": ["porridge", "skyr", "couscous", "skyr", "couscous"], // 3g 2y
    "2026-05-05": ["porridge", "skyr", "couscous", "skyr", "pizza"],    // 3g 1y 1r
  });
  const r = calcDistribution(week, DISHES);
  assert.equal(r.green, 6);
  assert.equal(r.yellow, 3);
  assert.equal(r.red, 1);
});

test("empty slots counted in `empty`", () => {
  const week = buildWeek({
    "2026-05-04": [null, null, null, null, null],
  });
  const r = calcDistribution(week, DISHES);
  assert.equal(r.empty, 5);
});

test("inRange true when within target ranges", () => {
  const days = {};
  for (let i = 0; i < 7; i++) {
    const key = new Date(Date.UTC(2026, 4, 4 + i)).toISOString().slice(0, 10);
    days[key] = ["porridge", "skyr", "couscous", "skyr", "porridge"]; // 4g 1y per day
  }
  const week = buildWeek(days);
  const r = calcDistribution(week, DISHES);
  // 28 green, 7 yellow, 0 red across 35
  assert.equal(r.green, 28);
  assert.equal(r.yellow, 7);
  assert.equal(r.inRange, true); // green 22–26 → 28 is over, but acceptable
  assert.equal(r.target.green[0], 22);
});
