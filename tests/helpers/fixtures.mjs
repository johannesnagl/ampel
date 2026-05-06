// tests/helpers/fixtures.mjs
export const SLOTS_5 = [
  { type: "breakfast", label: "Frühstück" },
  { type: "snack",     label: "Snack 1" },
  { type: "lunch",     label: "Mittag" },
  { type: "snack",     label: "Snack 2" },
  { type: "dinner",    label: "Abend" },
];

export const DEFAULT_SETTINGS = {
  slotsPerDay: SLOTS_5,
  weeklyPointBudget: 12,
  weekStartsOn: "monday",
  language: "de",
};

export const DISHES = [
  { id: "porridge",  name: "Porridge",         category: "green",  heavy: false, frequency: { type: "weekly", max: 7 }, slotTypes: ["breakfast"], tags: ["frühstück", "haferflocken"], notes: "" },
  { id: "skyr",      name: "Skyr + Apfel",     category: "green",  heavy: false, frequency: { type: "weekly", max: 7 }, slotTypes: ["snack"],     tags: ["snack", "obst"],            notes: "" },
  { id: "couscous",  name: "Couscoussalat",    category: "yellow", heavy: false, frequency: { type: "weekly", max: 3 }, slotTypes: ["lunch", "dinner"], tags: ["couscous", "feta"],   notes: "" },
  { id: "falafel",   name: "Falafel + Hummus", category: "yellow", heavy: true,  frequency: { type: "weekly", max: 3 }, slotTypes: ["lunch", "dinner"], tags: ["falafel", "hummus"],  notes: "" },
  { id: "pizza",     name: "Pizza",            category: "red",    heavy: true,  frequency: { type: "weekly", max: 1 }, slotTypes: ["lunch", "dinner"], tags: ["pizza"],              notes: "" },
  { id: "risotto",   name: "Risotto",          category: "red",    heavy: false, frequency: { type: "weekly", max: 1 }, slotTypes: ["lunch", "dinner"], tags: ["risotto"],            notes: "" },
];

export function findDish(id) {
  const d = DISHES.find((x) => x.id === id);
  if (!d) throw new Error(`fixture dish not found: ${id}`);
  return d;
}

// Build a week from a compact spec: { "2026-05-04": ["porridge", "skyr", "couscous", null, null], ... }
export function buildWeek(spec, slotsPerDay = SLOTS_5) {
  const days = {};
  const dates = Object.keys(spec).sort();
  const monday = dates[0];
  for (const date of dates) {
    days[date] = {
      slots: spec[date].map((dishId, i) => ({
        type: slotsPerDay[i].type,
        dishId,
        loggedAt: null,
        note: "",
      })),
    };
  }
  return { monday, days };
}
