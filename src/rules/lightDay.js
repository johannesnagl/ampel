// src/rules/lightDay.js
//
// "Leichter Tag → Eskalation am Abend."
// Fires when ALL non-dinner slots are 🟢 (or empty) AND dinner is 🔴 or
// heavy 🟡.

export function checkLightDayEveningEscalation(day, date, dishes, slotsPerDay) {
  const byId = new Map(dishes.map((d) => [d.id, d]));
  let dinnerIdx = -1;
  let dinnerDish = null;
  for (let i = 0; i < day.slots.length; i++) {
    // Settings is the source of truth for slot type — slot.type may be
    // stale if the user changed slot configuration after the week was
    // created.
    const slotType = slotsPerDay?.[i]?.type ?? day.slots[i].type;
    if (slotType === "dinner") {
      dinnerIdx = i;
      const id = day.slots[i].dishId;
      dinnerDish = id ? byId.get(id) : null;
    }
  }
  if (!dinnerDish) return [];
  const dinnerHeavy = dinnerDish.heavy && dinnerDish.category !== "green";
  const dinnerCheat = dinnerDish.category === "red";
  if (!dinnerHeavy && !dinnerCheat) return [];

  // Check every other non-dinner, filled slot is green
  for (let i = 0; i < day.slots.length; i++) {
    if (i === dinnerIdx) continue;
    const slot = day.slots[i];
    if (!slot.dishId) continue;
    const dish = byId.get(slot.dishId);
    if (!dish) continue;
    if (dish.category !== "green") return [];
  }

  return [{
    severity: "warn",
    ruleId: "light-day-evening-escalation",
    where: { date, slotIndex: dinnerIdx },
    message: "Leichter Tag → schwerer Abend (Eskalationsmuster)",
  }];
}
