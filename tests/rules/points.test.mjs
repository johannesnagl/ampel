import { test } from "node:test";
import assert from "node:assert/strict";
import { calcPoints } from "../../src/rules/points.js";
import { buildWeek, DISHES, SLOTS_5 } from "../helpers/fixtures.mjs";

test("empty week is 0 / 12 (default budget)", () => {
  const week = buildWeek({ "2026-05-04": [null, null, null, null, null] });
  const r = calcPoints(week, DISHES, 12);
  assert.equal(r.used, 0);
  assert.equal(r.budget, 12);
  assert.equal(r.status, "ok");
});

test("3 yellow + 1 red = 6 points", () => {
  const week = buildWeek({
    "2026-05-04": [null, null, "couscous", null, "couscous"],
    "2026-05-05": [null, null, "couscous", null, "pizza"],
  });
  const r = calcPoints(week, DISHES, 12);
  assert.equal(r.used, 1 + 1 + 1 + 3); // 3 yellow=3, 1 red=3
  assert.equal(r.status, "ok");
});

test("status flips to warn at >=80% of budget", () => {
  const week = buildWeek({
    "2026-05-04": [null, null, "pizza", null, "couscous"], // 4
    "2026-05-05": [null, null, "couscous", null, "pizza"], // 4 → 8
    "2026-05-06": [null, null, "couscous", null, "couscous"], // 2 → 10
  });
  const r = calcPoints(week, DISHES, 12);
  assert.equal(r.used, 10);
  assert.equal(r.status, "warn"); // 10/12 = 83%
});

test("status flips to over above budget", () => {
  const week = buildWeek({
    "2026-05-04": [null, null, "pizza", null, "pizza"],
    "2026-05-05": [null, null, "pizza", null, "pizza"],
    "2026-05-06": [null, null, "pizza", null, "pizza"],
  });
  const r = calcPoints(week, DISHES, 12);
  assert.equal(r.used, 18);
  assert.equal(r.status, "over");
});

test("perDay points + label", () => {
  const week = buildWeek({
    "2026-05-04": ["porridge", "skyr", "couscous", null, null], // 1 → normal
    "2026-05-05": ["porridge", "skyr", "pizza", null, null],     // 3 → cheat
    "2026-05-06": ["porridge", null, null, null, null],          // 0 → light
  });
  const r = calcPoints(week, DISHES, 12);
  assert.equal(r.perDay["2026-05-04"].points, 1);
  assert.equal(r.perDay["2026-05-04"].label, "normaler Tag");
  assert.equal(r.perDay["2026-05-05"].points, 3);
  assert.equal(r.perDay["2026-05-05"].label, "Cheat-Tag");
  assert.equal(r.perDay["2026-05-06"].points, 0);
  assert.equal(r.perDay["2026-05-06"].label, "leichter Tag");
});
