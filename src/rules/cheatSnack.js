// src/rules/cheatSnack.js
//
// "Wenn an einem Tag ein 🔴 ist, müssen alle Snacks 🟢 sein."

export function checkCheatSnackPolicy(day, date, dishes, slotsPerDay) {
  const byId = new Map(dishes.map((d) => [d.id, d]));
  const hasCheat = day.slots.some((s) => {
    if (!s.dishId) return false;
    const d = byId.get(s.dishId);
    return d && d.category === "red";
  });
  if (!hasCheat) return [];
  const warnings = [];
  for (let i = 0; i < day.slots.length; i++) {
    // Settings is the source of truth for slot type — slot.type may be
    // stale if the user changed slot configuration after the week was
    // created.
    const slotType = slotsPerDay?.[i]?.type ?? day.slots[i].type;
    if (slotType !== "snack") continue;
    const slot = day.slots[i];
    if (!slot.dishId) continue;
    const dish = byId.get(slot.dishId);
    if (!dish) continue;
    if (dish.category !== "green") {
      warnings.push({
        severity: "warn",
        ruleId: "no-cheat-plus-extra-snack",
        where: { date, slotIndex: i },
        message: "Genuss-Tag: Snacks sollten grün sein",
      });
    }
  }
  return warnings;
}
