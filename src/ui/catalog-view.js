// src/ui/catalog-view.js
import { h, clear } from "./render.js";
import { t } from "../i18n.js";
import { matchDish } from "../util/search.js";

export function renderCatalogView({ catalog, onAdd, onEdit }) {
  let q = "";
  let cat = "all";
  let heavyOnly = false;

  const root = h("section", { class: "cat" });

  // Build stable elements ONCE. The search input keeps focus across
  // keystrokes because it's never replaced — only the list (and the
  // chip "on" state) re-render.
  const inputEl = h("input", {
    type: "search",
    class: "picker-search",
    placeholder: t.search,
    value: "",
    oninput: (e) => { q = e.target.value; renderList(); },
  });
  const filtersEl = h("div", { class: "cat-filters" });
  const listEl = h("div", { class: "cat-list" });

  function renderFilters() {
    clear(filtersEl);
    filtersEl.append(
      chip("all",    "Alle",    () => { cat = "all";    renderFilters(); renderList(); }),
      chip("green",  "🟢",      () => { cat = "green";  renderFilters(); renderList(); }),
      chip("yellow", "🟡",      () => { cat = "yellow"; renderFilters(); renderList(); }),
      chip("red",    "🔴",      () => { cat = "red";    renderFilters(); renderList(); }),
    );
    if (cat !== "green") {
      filtersEl.append(
        h("button", {
          class: `cat-chip ${heavyOnly ? "on" : ""}`,
          onclick: () => { heavyOnly = !heavyOnly; renderFilters(); renderList(); },
        }, t.heavy),
      );
    } else {
      // Green never has heavy dishes — also clear the heavy-only filter
      heavyOnly = false;
    }
  }

  function renderList() {
    clear(listEl);
    for (const d of filtered()) listEl.append(row(d));
  }

  function chip(value, label, onClick) {
    return h("button", { class: `cat-chip ${cat === value ? "on" : ""}`, onclick: onClick }, label);
  }

  function filtered() {
    const order = { green: 0, yellow: 1, red: 2 };
    return catalog.dishes
      .filter((d) => cat === "all" || d.category === cat)
      .filter((d) => !heavyOnly || d.heavy)
      .filter((d) => matchDish(d, q))
      .sort((a, b) => {
        // Primary: category (green → yellow → red). Secondary: name A→Z.
        const co = (order[a.category] ?? 99) - (order[b.category] ?? 99);
        if (co !== 0) return co;
        return a.name.localeCompare(b.name, "de");
      });
  }

  function row(d) {
    return h("button", { class: `cat-row ${d.category}`, onclick: () => onEdit(d) },
      h("span", { class: "cat-row-emoji" }, emojiFor(d.category)),
      h("span", { class: "cat-row-body" },
        h("div", { class: "cat-row-name" }, d.name, d.heavy ? h("span", { class: "picker-row-pill" }, t.heavy) : null),
        h("div", { class: "cat-row-meta" },
          d.slotTypes.join(" · "),
          " · ",
          freqText(d.frequency),
        ),
      ),
      h("span", { class: "cat-row-arrow" }, "›"),
    );
  }

  function freqText(f) {
    return f.type === "weekly" ? `${f.max}×/Woche` : `${f.max}×/Monat`;
  }

  function emojiFor(c) { return { green: "🟢", yellow: "🟡", red: "🔴" }[c] ?? "·"; }

  // One-time build of the screen's skeleton
  root.replaceChildren(
    h("div", { class: "cat-header" },
      h("h1", {}, t.catalog.title),
      h("button", { class: "cat-add slot-action primary", onclick: onAdd }, t.catalog.new),
    ),
    inputEl,
    filtersEl,
    listEl,
  );
  renderFilters();
  renderList();
  return root;
}
