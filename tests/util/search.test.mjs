import { test } from "node:test";
import assert from "node:assert/strict";
import { matchDish } from "../../src/util/search.js";

const dish = {
  name: "Couscoussalat (Feta, Tomate, Gurke)",
  tags: ["couscous", "feta", "tomate", "gurke", "salat"],
  notes: "C-MODERAT — leichtes Mittag",
};

test("empty query matches everything", () => {
  assert.equal(matchDish(dish, ""), true);
  assert.equal(matchDish(dish, "   "), true);
});

test("matches name (case-insensitive)", () => {
  assert.equal(matchDish(dish, "couscous"), true);
  assert.equal(matchDish(dish, "COUSCOUS"), true);
});

test("matches tags", () => {
  assert.equal(matchDish(dish, "feta"), true);
  assert.equal(matchDish(dish, "gurke"), true);
});

test("matches notes", () => {
  assert.equal(matchDish(dish, "moderat"), true);
});

test("multi-token query — all tokens must match somewhere", () => {
  assert.equal(matchDish(dish, "feta tomate"), true);
  assert.equal(matchDish(dish, "feta avocado"), false);
});

test("non-match returns false", () => {
  assert.equal(matchDish(dish, "pizza"), false);
});

test("German umlauts match equivalents", () => {
  const d = { name: "Käsekuchen", tags: [], notes: "" };
  assert.equal(matchDish(d, "kase"), true);
  assert.equal(matchDish(d, "käse"), true);
});
