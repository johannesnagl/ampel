// src/rules/frequency.js
//
// Per-dish frequency cap.
//
//   weekly  → count occurrences of dishId within the active week.
//   monthly → count occurrences within the active week + any other
//             supplied weeks whose `monday` falls in the same calendar month.
//
// Both planned and logged slots count.
//
// `otherWeeks` is an array of week objects (already loaded from storage)
// — typically the 5 weeks around the active week is enough lookback.

export function checkFrequency(activeWeek, otherWeeks, dishes) {
  const byId = new Map(dishes.map((d) => [d.id, d]));
  const warnings = [];

  // Pass 1: count weekly occurrences and warn on over-limits.
  const weeklyCounts = countByDishId(activeWeek);
  for (const [dishId, count] of weeklyCounts) {
    const dish = byId.get(dishId);
    if (!dish || dish.frequency.type !== "weekly") continue;
    if (count > dish.frequency.max) {
      // Find the nth (max+1) occurrence position to attach the warning
      const offending = findNthOccurrence(activeWeek, dishId, dish.frequency.max + 1);
      warnings.push({
        severity: "warn",
        ruleId: "frequency-limit",
        where: offending,
        message: `${dish.name} überschreitet ${dish.frequency.max}×/Woche`,
      });
    }
  }

  // Pass 2: count monthly occurrences across activeWeek + sameMonth(otherWeeks).
  const activeMonth = activeWeek.monday.slice(0, 7); // YYYY-MM
  const sameMonthWeeks = [activeWeek, ...otherWeeks.filter((w) => w.monday.slice(0, 7) === activeMonth)];
  const monthlyCounts = new Map();
  for (const w of sameMonthWeeks) {
    for (const [id, n] of countByDishId(w)) {
      monthlyCounts.set(id, (monthlyCounts.get(id) ?? 0) + n);
    }
  }
  for (const [dishId, count] of monthlyCounts) {
    const dish = byId.get(dishId);
    if (!dish || dish.frequency.type !== "monthly") continue;
    if (count > dish.frequency.max) {
      const offending = findNthOccurrence(activeWeek, dishId, 1);
      warnings.push({
        severity: "warn",
        ruleId: "frequency-limit",
        where: offending,
        message: `${dish.name} überschreitet ${dish.frequency.max}×/Monat`,
      });
    }
  }

  return warnings;
}

function countByDishId(week) {
  const m = new Map();
  for (const day of Object.values(week.days)) {
    for (const slot of day.slots) {
      if (!slot.dishId) continue;
      m.set(slot.dishId, (m.get(slot.dishId) ?? 0) + 1);
    }
  }
  return m;
}

function findNthOccurrence(week, dishId, n) {
  let count = 0;
  const dates = Object.keys(week.days).sort();
  for (const date of dates) {
    const day = week.days[date];
    for (let i = 0; i < day.slots.length; i++) {
      if (day.slots[i].dishId === dishId) {
        count += 1;
        if (count === n) return { date, slotIndex: i };
      }
    }
  }
  return { date: null, slotIndex: null };
}
