// src/app.js — bootstrap and screen routing
import { t } from "./i18n.js";
import { h, mount } from "./ui/render.js";
import { renderWeekView } from "./ui/week-view.js";
import { makeSettingsStore } from "./state/settings.js";
import { makeWeeksStore } from "./state/weeks.js";
import { makeCatalogStore } from "./state/catalog.js";
import { evaluateWeek } from "./rules/evaluate.js";
import { isoWeekId, isoWeekIdFromKey, mondayOf, dateKey, addDays } from "./util/dates.js";
import { openPicker } from "./ui/picker.js";
import { openSlotDetail } from "./ui/slot-detail.js";
import { renderCatalogView } from "./ui/catalog-view.js";
import { openDishForm } from "./ui/dish-form.js";
import { renderSettingsView } from "./ui/settings-view.js";

const root = document.getElementById("root");

const settingsStore = makeSettingsStore(localStorage);
const weeksStore    = makeWeeksStore(localStorage);
const catalogStore  = makeCatalogStore(localStorage);

const state = {
  settings: settingsStore.load(),
  catalog: { version: 1, dishes: [] },
  week: null,
  activeDate: null,
};

async function init() {
  const cat = await catalogStore.load();
  state.catalog = cat;
  const today = dateKey(new Date());
  loadWeek(today);
  state.activeDate = today;
  render();
}

function loadWeek(anchorDateKey) {
  const anchor = new Date(`${anchorDateKey}T12:00:00Z`);
  const monday = mondayOf(anchor);
  const mondayKey = dateKey(monday);
  const weekId = isoWeekId(anchor);
  const week = weeksStore.getWeek(weekId, mondayKey, state.settings.slotsPerDay);
  // Normalize each day's slot array against current settings.
  // Sync slot.type by index, preserve dish/log/note, append empty slots
  // when settings grew, drop trailing slots when settings shrank.
  for (const date of Object.keys(week.days)) {
    week.days[date].slots = normalizeSlots(week.days[date].slots, state.settings.slotsPerDay);
  }
  state.week = week;
  weeksStore.saveWeek(weekId, week);
}

function normalizeSlots(existingSlots, slotsPerDay) {
  return slotsPerDay.map((cfg, i) => {
    const existing = existingSlots[i];
    return {
      type: cfg.type,
      dishId: existing?.dishId ?? null,
      loggedAt: existing?.loggedAt ?? null,
      note: existing?.note ?? "",
    };
  });
}

function shiftWeek(deltaDays) {
  const anchor = new Date(`${state.activeDate}T12:00:00Z`);
  const newAnchor = addDays(anchor, deltaDays);
  const newKey = dateKey(newAnchor);
  loadWeek(newKey);
  state.activeDate = dateKey(mondayOf(newAnchor));
  render();
}

function setActiveDate(date) {
  state.activeDate = date;
  render();
}

function setScreen(name) {
  document.body.dataset.screen = name;
  render();
}

const screens = {
  week: () => {
    if (!state.week) return h("p", { class: "loading" }, t.app.loading);
    const verdict = evaluateWeek(state.week, getOtherWeeksInSameMonth(), state.catalog.dishes, state.settings);
    return renderWeekView({
      week: state.week,
      verdict,
      settings: state.settings,
      dishes: state.catalog.dishes,
      today: dateKey(new Date()),
      activeDate: state.activeDate,
      onDayClick: setActiveDate,
      onPrevWeek: () => shiftWeek(-7),
      onNextWeek: () => shiftWeek(+7),
      onJumpToToday: () => {
        const today = dateKey(new Date());
        loadWeek(today);
        state.activeDate = today;
        render();
      },
      onSlotLongPress: (date, slotIdx) => {
        const slot = state.week.days[date].slots[slotIdx];
        if (!slot.dishId) return;
        slot.loggedAt = slot.loggedAt ? null : new Date().toISOString();
        saveWeek();
        render();
        // Briefly add a CSS class to the slot button for the pulse animation
        const rootEl = document.getElementById("root");
        if (rootEl) {
          const buttons = rootEl.querySelectorAll(".wk-slot.filled");
          // Find the slot button by position: day slots are rendered in order
          const daySlots = Array.from(rootEl.querySelectorAll(".wk-day .wk-slot"));
          const btn = daySlots[slotIdx];
          if (btn) {
            btn.classList.add("just-logged");
            setTimeout(() => btn.classList.remove("just-logged"), 300);
          }
        }
      },
      onSlotClick: (date, slotIdx, kind) => {
        if (kind === "filled") {
          openSlotDetail_proxy(date, slotIdx);
          return;
        }
        const slotCfg = state.settings.slotsPerDay[slotIdx];
        openPicker({
          slotType: slotCfg.type, // settings is source of truth, not stale slot.type
          slotLabel: slotCfg.label,
          date,
          week: state.week,
          dishes: state.catalog.dishes,
          settings: state.settings,
          evaluateWith: (w) => evaluateWeek(w, getOtherWeeksInSameMonth(), state.catalog.dishes, state.settings),
          onPick: (dishId) => {
            state.week.days[date].slots[slotIdx].dishId = dishId;
            saveWeek();
            render();
          },
          onClose: () => render(),
        });
      },
    });
  },
  catalog: () => renderCatalogView({
    catalog: state.catalog,
    onAdd:  () => openDishForm({
      dish: null,
      onSave: (draft) => {
        if (state.catalog.dishes.some((d) => d.id === draft.id)) {
          alert(`ID "${draft.id}" bereits vorhanden`);
          return;
        }
        state.catalog.dishes.push(draft);
        catalogStore.save(state.catalog);
        render();
      },
      onDelete: () => {},
      onClose: () => render(),
    }),
    onEdit: (dish) => openDishForm({
      dish,
      onSave: (draft) => {
        state.catalog.dishes = state.catalog.dishes.map((d) => d.id === draft.id ? draft : d);
        catalogStore.save(state.catalog);
        render();
      },
      onDelete: (id) => {
        state.catalog.dishes = state.catalog.dishes.filter((d) => d.id !== id);
        catalogStore.save(state.catalog);
        render();
      },
      onClose: () => render(),
    }),
  }),
  settings: () => renderSettingsView({
    settings: state.settings,
    onSave: (next) => {
      state.settings = next;
      settingsStore.save(next);
      // Re-load the active week so its slot array gets re-normalized
      // against the new slotsPerDay (type changes, add/remove slots).
      if (state.activeDate) loadWeek(state.activeDate);
      render();
    },
    onExport: exportData,
    onImport: importData,
    onResetCatalog: async () => {
      if (!confirm("Vorrat wirklich zurücksetzen? Alle eigenen Mahlzeiten gehen verloren.")) return;
      state.catalog = await catalogStore.reset();
      render();
    },
    onResetAll: () => {
      if (!confirm("Wirklich alle Daten löschen?")) return;
      localStorage.removeItem("ampel.weeks");
      localStorage.removeItem("ampel.dishes");
      localStorage.removeItem("ampel.settings");
      location.reload();
    },
  }),
};

function render() {
  const which = document.body.dataset.screen || "week";
  const screen = screens[which] || screens.week;
  mount(root, screen());
}

function tabBar() {
  return h("nav", { class: "tab-bar" },
    h("button", { class: "tab", onclick: () => setScreen("week") },     t.screens.week),
    h("button", { class: "tab", onclick: () => setScreen("catalog") },  t.screens.catalog),
    h("button", { class: "tab", onclick: () => setScreen("settings") }, t.screens.settings),
  );
}

document.body.append(tabBar());
init().catch((e) => {
  console.error(e);
  mount(root, h("p", { class: "error" }, `Fehler beim Laden: ${e.message}`));
});

function saveWeek() {
  try {
    const weekId = isoWeekIdFromKey(state.week.monday);
    weeksStore.saveWeek(weekId, state.week);
  } catch (e) {
    console.error(e);
    alert(e.message);
  }
}

function getOtherWeeksInSameMonth() {
  if (!state.week) return [];
  const all = weeksStore.loadAll();
  const currentMonth = state.week.monday.slice(0, 7); // YYYY-MM
  const result = [];
  for (const [weekId, w] of Object.entries(all)) {
    // Skip the active week (compare by mondayDate to be safe — weekId may differ)
    if (w.monday === state.week.monday) continue;
    if (w.monday.slice(0, 7) === currentMonth) result.push(w);
  }
  return result;
}

function openSlotDetail_proxy(date, slotIdx) {
  openSlotDetail({
    date,
    slotIdx,
    week: state.week,
    settings: state.settings,
    dishes: state.catalog.dishes,
    onLog: () => {
      state.week.days[date].slots[slotIdx].loggedAt = new Date().toISOString();
      saveWeek(); render();
    },
    onUnlog: () => {
      state.week.days[date].slots[slotIdx].loggedAt = null;
      saveWeek(); render();
    },
    onSwap: () => {
      const slotCfg = state.settings.slotsPerDay[slotIdx];
      openPicker({
        slotType: slotCfg.type, // settings is source of truth
        slotLabel: slotCfg.label,
        date, week: state.week, dishes: state.catalog.dishes, settings: state.settings,
        evaluateWith: (w) => evaluateWeek(w, getOtherWeeksInSameMonth(), state.catalog.dishes, state.settings),
        onPick: (dishId) => {
          state.week.days[date].slots[slotIdx].dishId = dishId;
          state.week.days[date].slots[slotIdx].loggedAt = null;
          saveWeek(); render();
        },
        onClose: () => render(),
      });
    },
    onDelete: () => {
      state.week.days[date].slots[slotIdx].dishId = null;
      state.week.days[date].slots[slotIdx].loggedAt = null;
      state.week.days[date].slots[slotIdx].note = "";
      saveWeek(); render();
    },
    onNoteChange: (text) => {
      state.week.days[date].slots[slotIdx].note = text;
      saveWeek();
    },
    onClose: () => render(),
  });
}

function exportData() {
  const blob = new Blob([JSON.stringify({
    settings: state.settings,
    catalog: state.catalog,
    weeks: weeksStore.loadAll(),
    exportedAt: new Date().toISOString(),
  }, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ampel-export-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

async function importData(file) {
  if (!file) return;
  const text = await file.text();
  let data;
  try { data = JSON.parse(text); } catch (e) { alert("Ungültige JSON-Datei"); return; }
  if (!data.settings || !data.catalog || !data.weeks) {
    alert("Ungültiges Export-Format");
    return;
  }
  if (!Array.isArray(data.settings.slotsPerDay) || data.settings.slotsPerDay.length === 0) {
    alert("Ungültige Slot-Konfiguration");
    return;
  }
  if (typeof data.settings.weeklyPointBudget !== "number" || data.settings.weeklyPointBudget < 1) {
    alert("Ungültiges Wochenbudget");
    return;
  }
  if (!Array.isArray(data.catalog.dishes)) {
    alert("Ungültiger Vorrat");
    return;
  }
  if (typeof data.weeks !== "object" || data.weeks === null) {
    alert("Ungültige Wochen-Daten");
    return;
  }
  if (!confirm("Aktuelle Daten überschreiben?")) return;
  state.settings = data.settings;
  state.catalog = data.catalog;
  settingsStore.save(state.settings);
  catalogStore.save(state.catalog);
  weeksStore.saveAll(data.weeks);
  location.reload();
}
