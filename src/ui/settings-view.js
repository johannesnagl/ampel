// src/ui/settings-view.js
import { h } from "./render.js";
import { t } from "../i18n.js";

export function renderSettingsView({ settings, onSave, onExport, onImport, onResetCatalog, onResetAll }) {
  let draft = structuredClone(settings);
  const root = h("section", { class: "set" });

  function rerender() {
    root.replaceChildren(
      h("h1", {}, t.settings.title),
      slotsEditor(),
      budgetEditor(),
      ioSection(),
    );
  }

  function slotsEditor() {
    // Slot type options, sorted alphabetically by label (German collation).
    const SLOT_TYPE_OPTIONS = [
      { value: "breakfast", label: "Frühstück" },
      { value: "snack",     label: "Snack" },
      { value: "lunch",     label: "Mittag" },
      { value: "dinner",    label: "Abend" },
    ].sort((a, b) => a.label.localeCompare(b.label, "de"));

    return h("section", { class: "set-card" },
      h("h2", {}, "Slots pro Tag"),
      ...draft.slotsPerDay.map((s, i) => h("div", { class: "set-slot-row" },
        h("select", { onchange: (e) => { draft.slotsPerDay[i].type = e.target.value; save(); rerender(); } },
          ...SLOT_TYPE_OPTIONS.map((opt) =>
            h("option", { value: opt.value, selected: s.type === opt.value ? "selected" : null }, opt.label),
          ),
        ),
        h("input", { value: s.label, oninput: (e) => { draft.slotsPerDay[i].label = e.target.value; save(); } }),
        h("button", { class: "set-slot-rm", onclick: () => { draft.slotsPerDay.splice(i, 1); save(); rerender(); } }, "✕"),
      )),
      h("button", { class: "slot-action", onclick: () => {
        draft.slotsPerDay.push({ type: "snack", label: `Snack ${draft.slotsPerDay.filter((x) => x.type === "snack").length + 1}` });
        save(); rerender();
      } }, "+ Slot"),
    );
  }

  function budgetEditor() {
    return h("section", { class: "set-card" },
      h("h2", {}, t.settings.budget),
      h("input", { type: "range", min: "8", max: "20", value: draft.weeklyPointBudget, oninput: (e) => { draft.weeklyPointBudget = parseInt(e.target.value, 10); save(); rerender(); } }),
      h("div", {}, `${draft.weeklyPointBudget} Punkte / Woche`),
    );
  }

  function ioSection() {
    return h("section", { class: "set-card" },
      h("button", { class: "slot-action", onclick: onExport }, t.settings.export),
      h("label", { class: "slot-action", style: { textAlign: "center" } },
        t.settings.import,
        h("input", { type: "file", accept: ".json", style: { display: "none" }, onchange: (e) => onImport(e.target.files[0]) }),
      ),
      h("button", { class: "slot-action danger", onclick: onResetCatalog }, t.settings.resetCatalog),
      h("button", { class: "slot-action danger", onclick: onResetAll }, t.settings.resetAll),
    );
  }

  function save() { onSave(structuredClone(draft)); }

  rerender();
  return root;
}
