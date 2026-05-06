// src/rules/yellowHeavy.js
//
// "Maximal 2 schwere gelbe Mahlzeiten pro Tag."
// Fires on the day when 3+ yellow + heavy slots exist.

export function checkNoThreeYellowHeavy(day, date, dishes, _slots) {
  const byId = new Map(dishes.map((d) => [d.id, d]));
  let count = 0;
  for (const slot of day.slots) {
    if (!slot.dishId) continue;
    const dish = byId.get(slot.dishId);
    if (!dish) continue;
    if (dish.category === "yellow" && dish.heavy) count++;
  }
  if (count < 3) return [];
  return [{
    severity: "warn",
    ruleId: "no-three-yellow-heavy",
    where: { date, slotIndex: null },
    message: "3+ schwere gelbe Mahlzeiten an einem Tag",
  }];
}
