// src/ui/picker.js
//
// Half-sheet modal that opens when a slot is tapped. Lists all dishes
// whose `slotTypes` includes the slot's type and that match the search
// query. Each row shows a live verdict computed by simulating placement.

import { h, mount, clear } from "./render.js";
import { t } from "../i18n.js";
import { matchDish } from "../util/search.js";

export function openPicker({ slotType, slotLabel, date, week, dishes, settings, evaluateWith, onPick, onClose }) {
  const overlay = h("div", { class: "picker-overlay", onclick: (e) => {
    if (e.target === overlay) { cleanup(); onClose(); }
  }});
  const sheet = h("div", { class: "picker-sheet", role: "dialog", "aria-modal": "true" });
  overlay.append(sheet);
  document.body.append(overlay);

  function onKeyDown(e) {
    if (e.key === "Escape") { cleanup(); onClose(); }
  }
  document.addEventListener("keydown", onKeyDown);

  let query = "";
  function rerender() {
    clear(sheet);
    sheet.append(
      h("div", { class: "picker-handle" }),
      h("div", { class: "picker-title" }, `${slotLabel} · ${date}`),
      h("input", {
        type: "search",
        class: "picker-search",
        placeholder: t.search,
        autofocus: "true",
        oninput: (e) => { query = e.target.value; rerender(); },
        value: query,
      }),
      h("div", { class: "picker-list" },
        ...candidates(query).map((dish) => row(dish)),
      ),
    );
  }

  function candidates(q) {
    return dishes
      .filter((d) => d.slotTypes.includes(slotType))
      .filter((d) => matchDish(d, q));
  }

  function row(dish) {
    const verdict = simulate(dish);
    return h("button", { class: `picker-row ${dish.category}`, onclick: () => { onPick(dish.id); cleanup(); } },
      h("span", { class: "picker-row-emoji" }, emojiFor(dish.category)),
      h("span", { class: "picker-row-body" },
        h("div", { class: "picker-row-name" },
          dish.name,
          dish.heavy ? h("span", { class: "picker-row-pill" }, t.heavy) : null,
        ),
        verdict.message
          ? h("div", { class: `picker-row-verdict ${verdict.severity}` }, `${icon(verdict.severity)} ${verdict.message}`)
          : h("div", { class: "picker-row-verdict ok" }, "✓ Passt"),
      ),
    );
  }

  function simulate(dish) {
    const cloned = structuredClone(week);
    const day = cloned.days[date];
    const slotIdx = day.slots.findIndex((s) => s.type === slotType && !s.dishId);
    const targetIdx = slotIdx >= 0 ? slotIdx : day.slots.findIndex((s) => s.type === slotType);
    day.slots[targetIdx].dishId = dish.id;
    const newVerdict = evaluateWith(cloned);
    const dayWarnings = newVerdict.perDay[date]?.warnings ?? [];
    const slotWarning = dayWarnings.find((w) => w.where.slotIndex === targetIdx);
    const freqOver = newVerdict.warnings.find((w) => w.ruleId === "frequency-limit" && w.where?.date === date && w.where?.slotIndex === targetIdx);
    if (slotWarning) return { severity: "warn", message: slotWarning.message };
    if (freqOver)    return { severity: "warn", message: freqOver.message };
    return { severity: "ok", message: null };
  }

  function emojiFor(category) {
    return { green: "🟢", yellow: "🟡", red: "🔴" }[category];
  }

  function icon(sev) {
    return sev === "warn" ? "⚠" : sev === "block" ? "🚫" : "✓";
  }

  function cleanup() {
    document.removeEventListener("keydown", onKeyDown);
    if (overlay.parentElement) document.body.removeChild(overlay);
  }

  rerender();
  return cleanup;
}
