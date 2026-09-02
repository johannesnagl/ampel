import { test } from "node:test";
import assert from "node:assert/strict";
import { checkCheatSnackPolicy } from "../../src/rules/cheatSnack.js";
import { buildWeek, DISHES, SLOTS_5 } from "../helpers/fixtures.mjs";

test("fires when cheat in main + non-green snack", () => {
  // Pizza (red main) + couscous (yellow at snack slot)
  // For test we'll inject couscous into a snack slot.
  const day = buildWeek({ "2026-05-04": [null, "couscous", "pizza", null, null] }).days["2026-05-04"];
  const w = checkCheatSnackPolicy(day, "2026-05-04", DISHES, SLOTS_5);
  assert.equal(w.length, 1);
  assert.equal(w[0].ruleId, "no-cheat-plus-extra-snack");
  assert.equal(w[0].where.slotIndex, 1); // the offending snack
});

test("does not fire when cheat is alone or all snacks are green", () => {
  const day = buildWeek({ "2026-05-04": [null, "skyr", "pizza", "skyr", null] }).days["2026-05-04"];
  assert.equal(checkCheatSnackPolicy(day, "2026-05-04", DISHES, SLOTS_5).length, 0);
});

test("respects current slotsPerDay when stored slot.type is stale", () => {
  // Regression test for the "settings changed but week data still has
  // old slot.type" bug. User changed slot 2 from "lunch" to "snack" in
  // Settings. The week was saved before that change, so the stored
  // slot.type is still "lunch". The rule must use slotsPerDay[i].type,
  // not slot.type, so it correctly classifies index 2 as a snack.
  const day = buildWeek({ "2026-05-04": [null, null, "couscous", null, "pizza"] }).days["2026-05-04"];
  // Sanity: with the original slot config (idx 2 = lunch), no warning fires
  // because the only snack slots (1 and 3) are empty.
  assert.equal(checkCheatSnackPolicy(day, "2026-05-04", DISHES, SLOTS_5).length, 0);
  // After settings change: slot 2 is now a snack. Same stored week data,
  // new slotsPerDay says index 2 is snack. With Pizza (red) in the day,
  // the (now-)snack at index 2 holding a non-green dish should fire.
  const NEW_SLOTS = [
    { type: "breakfast", label: "Frühstück" },
    { type: "snack",     label: "Snack 1" },
    { type: "snack",     label: "Snack 2" }, // was "lunch"
    { type: "lunch",     label: "Mittag" },  // was "snack"
    { type: "dinner",    label: "Abend" },
  ];
  const w = checkCheatSnackPolicy(day, "2026-05-04", DISHES, NEW_SLOTS);
  assert.equal(w.length, 1);
  assert.equal(w[0].where.slotIndex, 2);
});

// --- Dessert-Slot (Masterpost §12: eigene Komponente) ---

const SLOTS_7 = [
  { type: "breakfast", label: "Frühstück" },
  { type: "snack",     label: "Snack 1" },
  { type: "lunch",     label: "Mittag" },
  { type: "dessert",   label: "Dessert", optional: true },
  { type: "snack",     label: "Snack 2" },
  { type: "dinner",    label: "Abend" },
  { type: "dessert",   label: "Dessert", optional: true },
];
const day7 = (map) => ({
  slots: SLOTS_7.map((c, i) => ({ type: c.type, dishId: map[i] ?? null, loggedAt: null, note: "" })),
});

test("meldet sich nicht selbst, wenn der Snack selbst der Cheat ist", () => {
  // Kuchenjause statt Snack: das 🔴 liegt IM Snack-Slot, sonst nichts.
  // No-Go 4 zielt auf „Cheat + zusätzlicher Snack obendrauf“ – hier gibt es
  // kein Obendrauf, also darf nichts gemeldet werden.
  const day = day7({ 4: "pizza" });
  assert.equal(checkCheatSnackPolicy(day, "2026-05-04", DISHES, SLOTS_7).length, 0);
});

test("meldet einen zusätzlichen Snack, wenn der Cheat woanders liegt", () => {
  // 🔴 im Dessert-Slot, zusätzlich ein gelber Snack → genau der No-Go-Fall
  const day = day7({ 6: "pizza", 1: "couscous" });
  const w = checkCheatSnackPolicy(day, "2026-05-04", DISHES, SLOTS_7);
  assert.equal(w.length, 1);
  assert.equal(w[0].where.slotIndex, 1);
});

test("ein Dessert im Dessert-Slot wird nie als regelwidriger Snack gemeldet", () => {
  // Cheat im Mittag, Dessert (gelb) im Dessert-Slot dahinter.
  // Der Dessert-Slot ist kein Snack → keine Meldung auf Index 3.
  const day = day7({ 2: "pizza", 3: "couscous" });
  const w = checkCheatSnackPolicy(day, "2026-05-04", DISHES, SLOTS_7);
  assert.equal(w.filter((x) => x.where.slotIndex === 3).length, 0);
});
