// src/ui/catalog-view.js
import { h } from "./render.js";
import { t } from "../i18n.js";
import { matchDish } from "../util/search.js";

export function renderCatalogView({ catalog, onAdd, onEdit }) {
  let q = "";
  let cat = "all";
  let heavyOnly = false;

  const root = h("section", { class: "cat" });

  function rerender() {
    // If category filter is green, force-disable heavyOnly (no green dish can be heavy)
    if (cat === "green") heavyOnly = false;

    root.replaceChildren(
      h("div", { class: "cat-header" },
        h("h1", {}, t.catalog.title),
        h("button", { class: "cat-add slot-action primary", onclick: onAdd }, t.catalog.new),
      ),
      h("input", {
        type: "search",
        class: "picker-search",
        placeholder: t.search,
        value: q,
        oninput: (e) => { q = e.target.value; rerender(); },
      }),
      h("div", { class: "cat-filters" },
        chip("all",    "Alle",    () => { cat = "all"; rerender(); }),
        chip("green",  "🟢",      () => { cat = "green"; rerender(); }),
        chip("yellow", "🟡",      () => { cat = "yellow"; rerender(); }),
        chip("red",    "🔴",      () => { cat = "red"; rerender(); }),
        cat !== "green"
          ? h("button", { class: `cat-chip ${heavyOnly ? "on" : ""}`, onclick: () => { heavyOnly = !heavyOnly; rerender(); } }, t.heavy)
          : null,
      ),
      h("div", { class: "cat-list" },
        ...filtered().map((d) => row(d)),
      ),
    );
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

  rerender();
  return root;
}
