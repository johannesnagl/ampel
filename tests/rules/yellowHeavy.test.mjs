import { test } from "node:test";
import assert from "node:assert/strict";
import { checkNoThreeYellowHeavy } from "../../src/rules/yellowHeavy.js";
import { buildWeek, DISHES, SLOTS_5 } from "../helpers/fixtures.mjs";

test("fires when 3+ heavy yellow dishes in a single day", () => {
  // We need 3 distinct heavy-yellow slots. Use falafel for all main slots.
  const day = buildWeek({ "2026-05-04": [null, "falafel", "falafel", null, "falafel"] }).days["2026-05-04"];
  const w = checkNoThreeYellowHeavy(day, "2026-05-04", DISHES, SLOTS_5);
  assert.equal(w.length, 1);
  assert.equal(w[0].ruleId, "no-three-yellow-heavy");
});

test("two heavy yellow is fine (no fire)", () => {
  const day = buildWeek({ "2026-05-04": [null, "falafel", null, "falafel", null] }).days["2026-05-04"];
  assert.equal(checkNoThreeYellowHeavy(day, "2026-05-04", DISHES, SLOTS_5).length, 0);
});
