// src/rules/points.js
//
// Points: green=0, yellow=1, red=3.
// Per-day label: 0–1 = leichter Tag, 1–2 = normaler Tag, 3+ = Genuss-Tag.

const POINTS = { green: 0, yellow: 1, red: 3 };

function pointsFor(dish) {
  return POINTS[dish?.category] ?? 0;
}

export function calcPoints(week, dishes, budget) {
  const byId = new Map(dishes.map((d) => [d.id, d]));
  let used = 0;
  const perDay = {};
  for (const [date, day] of Object.entries(week.days)) {
    let dayPoints = 0;
    for (const slot of day.slots) {
      if (!slot.dishId) continue;
      const dish = byId.get(slot.dishId);
      if (!dish) continue;
      dayPoints += pointsFor(dish);
    }
    used += dayPoints;
    perDay[date] = { points: dayPoints, label: dayLabel(dayPoints) };
  }
  let status = "ok";
  if (used > budget) status = "over";
  else if (used >= Math.floor(budget * 0.8)) status = "warn";
  return { used, budget, status, perDay };
}

function dayLabel(points) {
  if (points <= 1) return points === 0 ? "leichter Tag" : "normaler Tag";
  if (points >= 3) return "Genuss-Tag";
  return "normaler Tag";
}
