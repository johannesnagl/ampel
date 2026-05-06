// src/rules/evaluate.js
//
// Orchestrates every rule into a single verdict object.

import { calcPoints } from "./points.js";
import { calcDistribution } from "./distribution.js";
import { checkNoTwoHeavyInRow } from "./heavy.js";
import { checkNoTwoCheatsSameDay } from "./cheats.js";
import { checkNoThreeYellowHeavy } from "./yellowHeavy.js";
import { checkCheatSnackPolicy } from "./cheatSnack.js";
import { checkLightDayEveningEscalation } from "./lightDay.js";
import { checkBestCombo } from "./bestCombo.js";
import { checkFrequency } from "./frequency.js";

const DAY_RULES = [
  checkNoTwoHeavyInRow,
  checkNoTwoCheatsSameDay,
  checkNoThreeYellowHeavy,
  checkCheatSnackPolicy,
  checkLightDayEveningEscalation,
];

export function evaluateWeek(week, otherWeeks, dishes, settings) {
  const points = calcPoints(week, dishes, settings.weeklyPointBudget);
  const distribution = calcDistribution(week, dishes);

  const allWarnings = [];
  const perDay = {};

  for (const [date, day] of Object.entries(week.days)) {
    const dayWarnings = [];
    for (const rule of DAY_RULES) {
      const ws = rule(day, date, dishes, settings.slotsPerDay);
      dayWarnings.push(...ws);
    }
    const combo = checkBestCombo(day, date, dishes, settings.slotsPerDay);

    // Build per-slot verdict
    const verdictBySlot = new Map();
    for (const w of dayWarnings) {
      const idx = w.where.slotIndex;
      if (idx == null) continue;
      const cur = verdictBySlot.get(idx) ?? "ok";
      verdictBySlot.set(idx, cur === "block" ? cur : (w.severity === "block" ? "block" : "warn"));
    }
    const slots = day.slots.map((s, i) => ({
      dishId: s.dishId,
      verdict: verdictBySlot.get(i) ?? "ok",
      reason: dayWarnings.find((w) => w.where.slotIndex === i)?.message ?? null,
    }));

    perDay[date] = {
      points: points.perDay[date]?.points ?? 0,
      label: points.perDay[date]?.label ?? "leichter Tag",
      slots,
      bestCombo: combo.matched ? combo.combo : null,
      warnings: dayWarnings,
    };

    allWarnings.push(...dayWarnings);
  }

  // Frequency runs week-level
  allWarnings.push(...checkFrequency(week, otherWeeks, dishes));

  return {
    weeklyPoints: { used: points.used, budget: points.budget, status: points.status },
    weeklyDistribution: distribution,
    perDay,
    warnings: allWarnings,
  };
}
