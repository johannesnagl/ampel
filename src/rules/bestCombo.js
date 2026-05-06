// src/rules/bestCombo.js
//
// Recognises the 3 best main-meal sequences from the doc:
//   Grün – Grün – Gelb       (standard)
//   Grün – Gelb (leicht) – Rot (perfect cheat day)
//   Grün – Gelb – Grün        (stable)
//
// Looks at the main meals only (breakfast, lunch, dinner) in order.
// Snacks are ignored.

const MAIN_TYPES = ["breakfast", "lunch", "dinner"];
const COMBOS = [
  { combo: "gruen-gruen-gelb", pattern: ["green", "green", "yellow"] },
  { combo: "gruen-gelb-rot",   pattern: ["green", "yellow", "red"], lightYellowOnly: true },
  { combo: "gruen-gelb-gruen", pattern: ["green", "yellow", "green"] },
];

export function checkBestCombo(day, _date, dishes, _slots) {
  const byId = new Map(dishes.map((d) => [d.id, d]));
  const mains = MAIN_TYPES.map((type) => {
    const slot = day.slots.find((s) => s.type === type);
    if (!slot || !slot.dishId) return null;
    return byId.get(slot.dishId) ?? null;
  });
  if (mains.some((m) => m == null)) return { matched: false, combo: null };
  for (const c of COMBOS) {
    const fits = c.pattern.every((cat, i) => mains[i].category === cat);
    if (!fits) continue;
    if (c.lightYellowOnly && mains[1].heavy) continue;
    return { matched: true, combo: c.combo };
  }
  return { matched: false, combo: null };
}
