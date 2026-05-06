// src/app.js — bootstrap and screen routing
import { t } from "./i18n.js";
import { h, mount } from "./ui/render.js";

const root = document.getElementById("root");

const screens = {
  week:     () => h("section", {}, h("h1", {}, t.screens.week),     h("p", { class: "stub" }, "Wochenansicht — folgt in Phase 4")),
  catalog:  () => h("section", {}, h("h1", {}, t.screens.catalog),  h("p", { class: "stub" }, "Vorrat — folgt in Phase 6")),
  settings: () => h("section", {}, h("h1", {}, t.screens.settings), h("p", { class: "stub" }, "Einstellungen — folgt in Phase 7")),
};

function render() {
  const which = document.body.dataset.screen || "week";
  const screen = screens[which] || screens.week;
  mount(root, screen());
}

function setScreen(name) {
  document.body.dataset.screen = name;
  render();
}

// Bottom tab bar
function tabBar() {
  return h("nav", { class: "tab-bar" },
    h("button", { class: "tab", onclick: () => setScreen("week"),     "aria-label": t.screens.week     }, t.screens.week),
    h("button", { class: "tab", onclick: () => setScreen("catalog"),  "aria-label": t.screens.catalog  }, t.screens.catalog),
    h("button", { class: "tab", onclick: () => setScreen("settings"), "aria-label": t.screens.settings }, t.screens.settings),
  );
}

document.body.append(tabBar());
render();
