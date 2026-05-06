// src/ui/dish-form.js
import { h, clear } from "./render.js";
import { t } from "../i18n.js";

export function openDishForm({ dish, onSave, onDelete, onClose }) {
  const draft = dish ? structuredClone(dish) : {
    id: "",
    name: "",
    category: "green",
    heavy: false,
    frequency: { type: "weekly", max: 3 },
    slotTypes: ["lunch", "dinner"],
    tags: [],
    notes: "",
  };
  const isNew = !dish;

  const overlay = h("div", { class: "picker-overlay", onclick: (e) => { if (e.target === overlay) { cleanup(); onClose(); } } });
  const sheet = h("div", { class: "picker-sheet", role: "dialog", "aria-modal": "true" });
  overlay.append(sheet);
  document.body.append(overlay);

  function onKeyDown(e) {
    if (e.key === "Escape") { cleanup(); onClose(); }
  }
  document.addEventListener("keydown", onKeyDown);

  function input(label, value, onInput, opts = {}) {
    return h("label", { class: "df-row" },
      h("span", { class: "df-label" }, label),
      h("input", { type: opts.type ?? "text", value, oninput: (e) => onInput(e.target.value), min: opts.min, max: opts.max }),
    );
  }

  function select(label, value, options, onChange) {
    return h("label", { class: "df-row" },
      h("span", { class: "df-label" }, label),
      h("select", { onchange: (e) => onChange(e.target.value) },
        ...options.map((o) => h("option", { value: o.value, selected: o.value === value ? "selected" : null }, o.label)),
      ),
    );
  }

  function checkbox(label, checked, onChange) {
    return h("label", { class: "df-row df-checkbox" },
      h("input", { type: "checkbox", checked: checked ? "checked" : null, onchange: (e) => onChange(e.target.checked) }),
      h("span", {}, label),
    );
  }

  function multiCheck(label, options, selected, onToggle) {
    return h("div", { class: "df-row" },
      h("span", { class: "df-label" }, label),
      h("div", { class: "df-multi" },
        ...options.map((o) =>
          h("label", { class: `df-chip ${selected.includes(o.value) ? "on" : ""}` },
            h("input", {
              type: "checkbox",
              checked: selected.includes(o.value) ? "checked" : null,
              onchange: () => { onToggle(o.value); rerender(); },
            }),
            h("span", {}, o.label),
          ),
        ),
      ),
    );
  }

  function rerender() {
    clear(sheet);
    sheet.append(
      h("div", { class: "picker-handle" }),
      h("div", { class: "picker-title" }, isNew ? "Neue Mahlzeit" : "Mahlzeit bearbeiten"),
      h("div", { class: "df" },
        input("Name", draft.name, (v) => { draft.name = v; if (isNew) draft.id = kebab(v); }),
        select("Kategorie", draft.category, [
          { value: "green",  label: "🟢 Basis" },
          { value: "yellow", label: "🟡 Moderat" },
          { value: "red",    label: "🔴 Cheat" },
        ], (v) => { draft.category = v; rerender(); }),
        draft.category !== "green"
          ? checkbox("schwer", draft.heavy, (v) => { draft.heavy = v; })
          : null,
        select("Frequenz-Typ", draft.frequency.type, [
          { value: "weekly",  label: "pro Woche" },
          { value: "monthly", label: "pro Monat" },
        ], (v) => { draft.frequency.type = v; }),
        input("Frequenz max", draft.frequency.max, (v) => { draft.frequency.max = parseInt(v, 10) || 1; }, { type: "number", min: 1, max: 31 }),
        multiCheck("Slots", [
          { value: "breakfast", label: "Frühstück" },
          { value: "snack",     label: "Snack" },
          { value: "lunch",     label: "Mittag" },
          { value: "dinner",    label: "Abend" },
        ], draft.slotTypes, (v) => {
          if (draft.slotTypes.includes(v)) draft.slotTypes = draft.slotTypes.filter((x) => x !== v);
          else draft.slotTypes.push(v);
        }),
        input("Tags (komma-getrennt)", (draft.tags ?? []).join(", "), (v) => { draft.tags = v.split(",").map((x) => x.trim()).filter(Boolean); }),
        h("label", { class: "df-row" },
          h("span", { class: "df-label" }, "Notizen"),
          h("textarea", { oninput: (e) => { draft.notes = e.target.value; }, rows: "3" }, draft.notes ?? ""),
        ),
        h("div", { class: "slot-actions" },
          !isNew ? h("button", { class: "slot-action danger", onclick: () => { onDelete(draft.id); cleanup(); } }, t.delete) : null,
          h("button", { class: "slot-action primary", onclick: () => { onSave(draft); cleanup(); } }, isNew ? "Hinzufügen" : "Speichern"),
        ),
      ),
    );
  }

  function kebab(s) {
    return String(s).toLowerCase()
      .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }
  function cleanup() {
    document.removeEventListener("keydown", onKeyDown);
    if (overlay.parentElement) document.body.removeChild(overlay);
  }

  rerender();
  return cleanup;
}
