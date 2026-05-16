import { test } from "node:test";
import assert from "node:assert/strict";
import { parseNotes } from "../../src/ui/cooking-view.js";

test("parseNotes on empty / whitespace returns empty list", () => {
  assert.deepEqual(parseNotes(""), []);
  assert.deepEqual(parseNotes("   \n\n  "), []);
  assert.deepEqual(parseNotes(undefined), []);
});

test("parseNotes splits 'Zutaten:...; Zubereitung:...' into two heading sections", () => {
  const blocks = parseNotes("Zutaten: 200g Quinoa, 1 Avocado; Zubereitung: Quinoa kochen, alles mischen");
  const kinds = blocks.map((b) => b.kind);
  assert.deepEqual(kinds, ["h", "p", "h", "p"]);
  assert.equal(blocks[0].text, "Zutaten");
  assert.equal(blocks[2].text, "Zubereitung");
});

test("parseNotes recognises numbered steps as an ordered list", () => {
  const blocks = parseNotes(`Zubereitung:
1. Quinoa kochen
2. Avocado schneiden
3. Mischen`);
  const ol = blocks.find((b) => b.kind === "ol");
  assert.ok(ol);
  assert.deepEqual(ol.items, ["Quinoa kochen", "Avocado schneiden", "Mischen"]);
});

test("parseNotes recognises hyphen bullets as an unordered list", () => {
  const blocks = parseNotes(`Schritt 3 – Airfryer
- 190–200 °C
- 15–20 Minuten
- nach 8–10 Minuten einmal schütteln`);
  const ul = blocks.find((b) => b.kind === "ul");
  assert.ok(ul);
  assert.equal(ul.items.length, 3);
  assert.equal(ul.items[0], "190–200 °C");
});

test("parseNotes captures 👉 lines as tip blocks", () => {
  const blocks = parseNotes("Schritt 2\nKartoffeln würzen.\n👉 Je trockener die Oberfläche, desto knuspriger.");
  const tip = blocks.find((b) => b.kind === "tip");
  assert.ok(tip);
  assert.equal(tip.text, "Je trockener die Oberfläche, desto knuspriger.");
});

test("parseNotes treats 'Schritt N – title' as a heading", () => {
  const blocks = parseNotes("Schritt 1 – Vorkochen (wichtig!)\n\n1. Kartoffeln schneiden");
  assert.equal(blocks[0].kind, "h");
  assert.match(blocks[0].text, /Schritt 1/);
});
