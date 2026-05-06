// src/rules/cheats.js
//
// "Nicht 2 Cheats am selben Tag — auch nicht klein."
// Fires on the second (and any later) 🔴 slot of the day.

export function checkNoTwoCheatsSameDay(day, date, dishes, _slots) {
  const byId = new Map(dishes.map((d) => [d.id, d]));
  const warnings = [];
  let count = 0;
  for (let i = 0; i < day.slots.length; i++) {
    const slot = day.slots[i];
    if (!slot.dishId) continue;
    const dish = byId.get(slot.dishId);
    if (!dish || dish.category !== "red") continue;
    count += 1;
    if (count >= 2) {
      warnings.push({
        severity: "warn",
        ruleId: "no-cheat-plus-cheat-same-day",
        where: { date, slotIndex: i },
        message: "Zweiter Cheat am selben Tag",
      });
    }
  }
  return warnings;
}
