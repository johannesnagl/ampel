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
