// src/rules/heavy.js
//
// "Nicht zwei schwere Mahlzeiten direkt hintereinander."
// Two heavy slots are adjacent if no non-empty, non-heavy slot lies
// between them in the day's slot order.

export function checkNoTwoHeavyInRow(day, date, dishes, slotsPerDay) {
  const byId = new Map(dishes.map((d) => [d.id, d]));
  const warnings = [];
  let prevHeavyIdx = -1;
  for (let i = 0; i < day.slots.length; i++) {
    const slot = day.slots[i];
    if (!slot.dishId) continue;
    const dish = byId.get(slot.dishId);
    if (!dish) continue;
    const heavy = dish.heavy && (dish.category === "yellow" || dish.category === "red");
    if (heavy) {
      if (prevHeavyIdx >= 0) {
        warnings.push({
          severity: "warn",
          ruleId: "no-two-heavy-in-a-row",
          where: { date, slotIndex: i },
          message: "Zwei schwere Mahlzeiten direkt hintereinander",
        });
      }
      prevHeavyIdx = i;
    } else {
      // Any non-heavy filled slot resets adjacency
      prevHeavyIdx = -1;
    }
  }
  return warnings;
}
