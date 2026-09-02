import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeSlots } from "../../src/state/slots.js";

const S = (type, dishId = null, note = "") => ({ type, dishId, loggedAt: null, note });
const C = (...types) => types.map((type) => ({ type, label: type }));

const GEPLANT = [
  S("breakfast", "porridge"), S("snack", "skyr"), S("lunch", "couscous"),
  S("snack", "apfel"),        S("dinner", "lachs"),
];

test("eingefügte Dessert-Slots verschieben keine geplanten Gerichte", () => {
  // Der Migrationsfall 5 → 7: Dessert wird hinter Mittag und Abend eingefügt.
  // Bei reiner Index-Zuordnung landete der Apfel-Snack im Dessert-Slot, der
  // Lachs im Snack-Slot und das Abendessen fiel ganz raus.
  const out = normalizeSlots(GEPLANT, C("breakfast", "snack", "lunch", "dessert", "snack", "dinner", "dessert"));
  assert.deepEqual(out.map((s) => [s.type, s.dishId]), [
    ["breakfast", "porridge"], ["snack", "skyr"], ["lunch", "couscous"],
    ["dessert", null],         ["snack", "apfel"], ["dinner", "lachs"],
    ["dessert", null],
  ]);
});

test("gleiche Anzahl: Typwechsel behält das Gericht im Slot", () => {
  // Nutzer stellt Slot 3 in den Settings von Mittag auf Snack um.
  const out = normalizeSlots(GEPLANT, C("breakfast", "snack", "snack", "snack", "dinner"));
  assert.deepEqual(out.map((s) => [s.type, s.dishId]), [
    ["breakfast", "porridge"], ["snack", "skyr"], ["snack", "couscous"],
    ["snack", "apfel"],        ["dinner", "lachs"],
  ]);
});

test("entfernter Slot: nachfolgende Gerichte bleiben an ihrem Typ", () => {
  const out = normalizeSlots(GEPLANT, C("breakfast", "lunch", "snack", "dinner"));
  assert.deepEqual(out.map((s) => [s.type, s.dishId]), [
    ["breakfast", "porridge"], ["lunch", null], ["snack", "skyr"], ["dinner", null],
  ]);
});

test("angehängter Slot lässt bestehende Gerichte unberührt", () => {
  const out = normalizeSlots(GEPLANT, C("breakfast", "snack", "lunch", "snack", "dinner", "dessert"));
  assert.deepEqual(out.map((s) => s.dishId), ["porridge", "skyr", "couscous", "apfel", "lachs", null]);
});

test("Notiz und Log-Zeitstempel überleben das Einfügen", () => {
  const mit = [S("breakfast", "porridge"), S("lunch", "couscous"), S("dinner", "lachs")];
  mit[2].loggedAt = "2026-05-04T18:00:00.000Z";
  mit[2].note = "mit Ofengemüse";
  const out = normalizeSlots(mit, C("breakfast", "lunch", "dessert", "dinner", "dessert"));
  assert.equal(out[3].dishId, "lachs");
  assert.equal(out[3].loggedAt, "2026-05-04T18:00:00.000Z");
  assert.equal(out[3].note, "mit Ofengemüse");
});

test("leerer Tag wird zur vollen Slot-Konfiguration aufgefüllt", () => {
  const out = normalizeSlots([], C("breakfast", "lunch", "dessert"));
  assert.equal(out.length, 3);
  assert.ok(out.every((s) => s.dishId === null && s.note === ""));
});
