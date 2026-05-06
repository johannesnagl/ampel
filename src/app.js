// src/app.js — bootstrap and screen routing
import { t } from "./i18n.js";
import { h, mount } from "./ui/render.js";
import { renderWeekView } from "./ui/week-view.js";
import { makeSettingsStore } from "./state/settings.js";
import { makeWeeksStore } from "./state/weeks.js";
import { makeCatalogStore } from "./state/catalog.js";
import { evaluateWeek } from "./rules/evaluate.js";
import { isoWeekId, mondayOf, dateKey, addDays } from "./util/dates.js";

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
  state.week = week;
  // Persist immediately if it was a fresh week (idempotent if not)
  weeksStore.saveWeek(weekId, week);
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
    const verdict = evaluateWeek(state.week, [], state.catalog.dishes, state.settings);
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
      onSlotClick: (date, slotIdx, kind) => {
        // Picker hookup follows in Task 15
        console.log("slot click", { date, slotIdx, kind });
      },
    });
  },
  catalog:  () => h("section", {}, h("h1", {}, t.screens.catalog),  h("p", { class: "stub" }, "folgt")),
  settings: () => h("section", {}, h("h1", {}, t.screens.settings), h("p", { class: "stub" }, "folgt")),
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
