import { test } from "node:test";
import assert from "node:assert/strict";
import { checkBestCombo } from "../../src/rules/bestCombo.js";
import { buildWeek, DISHES, SLOTS_5 } from "../helpers/fixtures.mjs";

test("recognises Grün-Grün-Gelb (standard day)", () => {
  const day = buildWeek({ "2026-05-04": ["porridge", null, "porridge", null, "couscous"] }).days["2026-05-04"];
  const r = checkBestCombo(day, "2026-05-04", DISHES, SLOTS_5);
  assert.equal(r.matched, true);
  assert.equal(r.combo, "gruen-gruen-gelb");
});

test("recognises Grün-Gelb(leicht)-Rot (cheat day)", () => {
  const day = buildWeek({ "2026-05-04": ["porridge", null, "couscous", null, "pizza"] }).days["2026-05-04"];
  const r = checkBestCombo(day, "2026-05-04", DISHES, SLOTS_5);
  assert.equal(r.matched, true);
  assert.equal(r.combo, "gruen-gelb-rot");
});

test("returns matched=false when no combo applies", () => {
  const day = buildWeek({ "2026-05-04": ["porridge", null, "pizza", null, "pizza"] }).days["2026-05-04"];
  const r = checkBestCombo(day, "2026-05-04", DISHES, SLOTS_5);
  assert.equal(r.matched, false);
});
