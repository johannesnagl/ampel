// src/ui/week-view.js
import { h } from "./render.js";
import { t } from "../i18n.js";
import { isoWeekIdFromKey, fmtDayShort, fmtDateGerman, addDays, mondayOf, dateKey } from "../util/dates.js";

export function renderWeekView({ week, verdict, settings, dishes, today, activeDate, onDayClick, onPrevWeek, onNextWeek, onSlotClick, onSlotLongPress, onJumpToToday, onPrevDay, onNextDay, pulseFirstTime }) {
  const monday = new Date(`${week.monday}T12:00:00Z`);
  const sunday = addDays(monday, 6);
  const weekId = isoWeekIdFromKey(week.monday);
  const weekNumber = parseInt(weekId.split("-W")[1], 10);
  const dishById = new Map(dishes.map((d) => [d.id, d]));
  const activeDay = week.days[activeDate] ?? Object.values(week.days)[0];
  const activeDateKey = activeDate ?? Object.keys(week.days)[0];

  const todayMonday = mondayOf(new Date(`${today}T12:00:00Z`));
  const isCurrentWeek = week.monday === dateKey(todayMonday);

  return h("div", { class: "wk" },
    header(weekNumber, monday, sunday, isCurrentWeek, onPrevWeek, onNextWeek, onJumpToToday),
    summary(verdict, week, dishById, today, activeDateKey, onDayClick, pulseFirstTime),
    daySlots(activeDay, activeDateKey, verdict, dishById, settings, onSlotClick, onSlotLongPress, onPrevDay, onNextDay),
  );
}

function header(weekNumber, monday, sunday, isCurrentWeek, onPrev, onNext, onJumpToToday) {
  return h("div", { class: "wk-header" },
    h("button", { class: "wk-nav", "aria-label": "Vorherige Woche", onclick: onPrev }, "◀"),
    h("div", { class: "wk-title" },
      `${t.week_n(weekNumber)} · ${fmtDateGerman(monday)}–${fmtDateGerman(sunday)}`,
    ),
    !isCurrentWeek ? h("button", { class: "wk-today-btn", onclick: onJumpToToday }, "Heute") : null,
    h("button", { class: "wk-nav", "aria-label": "Nächste Woche", onclick: onNext }, "▶"),
  );
}

function summary(verdict, week, dishById, today, activeDate, onDayClick, pulseFirstTime) {
  const { used, budget, status } = verdict.weeklyPoints;
  const pct = Math.min(100, Math.round((used / budget) * 100));
  const dist = verdict.weeklyDistribution;

  return h("div", { class: "wk-summary" },
    h("div", { class: `wk-bar ${status === "over" ? "over" : status === "warn" ? "warn" : ""} ${status === "over" && !pulseFirstTime ? "no-pulse" : ""}`.trim() },
      h("div", { class: "wk-bar-fill", style: { width: `${pct}%` } }),
    ),
    h("div", { class: "wk-points" },
      h("span", {}, h("b", {}, used), ` / ${budget} Punkte`),
      h("span", {}, status === "over" ? "über Budget" : status === "warn" ? "knapp" : "im Plan"),
    ),
    h("div", { class: "wk-stats" },
      h("span", {}, `🟢 ${dist.green}`),
      h("span", {}, `🟡 ${dist.yellow}`),
      h("span", {}, `🔴 ${dist.red}`),
      h("span", {}, `${dist.empty} leer`),
    ),
    miniGrid(week, dishById, today, activeDate, onDayClick),
  );
}

function miniGrid(week, dishById, today, activeDate, onDayClick) {
  const dates = Object.keys(week.days).sort();
  return h("div", { class: "wk-mini-grid" },
    ...dates.map((date) => miniDay(date, week, dishById, today, activeDate, onDayClick)),
  );
}

function miniDay(date, week, dishById, today, activeDate, onDayClick) {
  const day = week.days[date];
  const dayDate = new Date(`${date}T12:00:00Z`);
  const isActive = date === activeDate;
  const isToday = date === today;
  const isPast = date < today && !isToday;
  return h("button", {
      class: `wk-mini-day ${isActive ? "active" : ""} ${isToday ? "today" : ""} ${isPast ? "past" : ""}`,
      onclick: () => onDayClick(date),
      "aria-label": `${fmtDayShort(dayDate)} ${fmtDateGerman(dayDate)}`,
    },
    h("div", { class: "name" }, fmtDayShort(dayDate)),
    h("div", { class: "wk-mini-dots" },
      ...day.slots.map((s) => h("span", { class: `wk-mini-dot ${dotClass(s, dishById)}` })),
    ),
  );
}

function dotClass(slot, dishById) {
  if (!slot.dishId) return "empty";
  const dish = dishById.get(slot.dishId);
  if (!dish) return "empty";
  return dish.category; // "green" | "yellow" | "red"
}

// ---- Day slots area ----

function daySlots(day, date, verdict, dishById, settings, onSlotClick, onSlotLongPress, onPrevDay, onNextDay) {
  if (!day) return h("div", { class: "wk-day-empty" }, "Tag nicht geladen");
  const dv = verdict.perDay[date];
  const dayDate = new Date(`${date}T12:00:00Z`);

  let pointerStart = null;
  const handlePointerDown = (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    pointerStart = { x: e.clientX, y: e.clientY, t: Date.now() };
  };
  const handlePointerUp = (e) => {
    if (!pointerStart) return;
    const dx = e.clientX - pointerStart.x;
    const dy = e.clientY - pointerStart.y;
    const dt = Date.now() - pointerStart.t;
    pointerStart = null;
    if (dt > 600) return;                      // too slow, treat as not a swipe
    if (Math.abs(dx) < 60) return;             // too small
    if (Math.abs(dy) > Math.abs(dx)) return;   // mostly vertical (scrolling)
    if (dx < 0) { if (onNextDay) onNextDay(); } else { if (onPrevDay) onPrevDay(); }
  };
  const handlePointerCancel = () => { pointerStart = null; };

  return h("div", { class: "wk-day",
    onpointerdown: handlePointerDown,
    onpointerup:   handlePointerUp,
    onpointercancel: handlePointerCancel,
  },
    h("div", { class: "wk-day-header" },
      h("div", {},
        `${fmtDayShort(dayDate)} · ${fmtDateGerman(dayDate)}`,
        dv?.bestCombo ? h("span", { class: "wk-day-combo", title: dv.bestCombo }, "  ✨") : null,
      ),
      h("div", { class: "wk-day-points" }, `${dv?.points ?? 0} Pkt · ${dv?.label ?? "leichter Tag"}`),
    ),
    ...day.slots.map((slot, i) => slotRow(slot, i, date, dv, dishById, settings, onSlotClick, onSlotLongPress)),
    dv?.warnings?.length ? h("details", { class: "wk-day-warnings-details" },
      h("summary", { class: "wk-day-warnings" }, t.warnings_n(dv.warnings.length)),
      h("ul", { class: "wk-day-warnings-list" },
        ...dv.warnings.map((w) => h("li", {}, w.message)),
      ),
    ) : null,
  );
}

function slotRow(slot, idx, date, dv, dishById, settings, onSlotClick, onSlotLongPress) {
  const slotCfg = settings.slotsPerDay[idx];
  const v = dv?.slots?.[idx];
  const dish = slot.dishId ? dishById.get(slot.dishId) : null;
  if (!dish) {
    return h("button", {
        class: "wk-slot empty",
        onclick: () => onSlotClick(date, idx, "empty"),
        "aria-label": `${slotCfg.label} planen`,
      },
      h("span", { class: "wk-slot-label" }, slotCfg.label),
      h("span", { class: "wk-slot-add" }, t.add),
    );
  }
  const verdictClass = v?.verdict === "warn" ? "warn" : "";

  let pressTimer = null;
  let longPressed = false;
  const handlePointerDown = () => {
    longPressed = false;
    pressTimer = setTimeout(() => {
      longPressed = true;
      if (onSlotLongPress) onSlotLongPress(date, idx);
    }, 500);
  };
  const handlePointerUp = () => { if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; } };
  const handleClick = (e) => {
    if (longPressed) { e.preventDefault(); return; }
    onSlotClick(date, idx, "filled");
  };

  return h("button", {
      class: `wk-slot filled ${dish.category} ${verdictClass}`,
      onclick: handleClick,
      onpointerdown: handlePointerDown,
      onpointerup: handlePointerUp,
      onpointercancel: handlePointerUp,
      onpointerleave: handlePointerUp,
      "aria-label": `${slotCfg.label}: ${dish.name}${v?.reason ? ` – Hinweis: ${v.reason}` : ""}`,
    },
    h("div", { class: "wk-slot-meta" },
      h("span", { class: "wk-slot-emoji" }, emojiFor(dish.category)),
      h("span", { class: "wk-slot-label" }, slotCfg.label),
      slot.loggedAt ? h("span", { class: "wk-slot-logged", title: "geloggt" }, "⏱") : null,
      v?.verdict === "warn" ? h("span", { class: "wk-slot-warn" }, "⚠️") : null,
    ),
    h("div", { class: "wk-slot-name" }, dish.name),
    v?.reason ? h("div", { class: "wk-slot-reason" }, v.reason) : null,
  );
}

function emojiFor(category) {
  return { green: "🟢", yellow: "🟡", red: "🔴" }[category] ?? "·";
}
