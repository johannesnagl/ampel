// src/ui/slot-detail.js
import { h, clear } from "./render.js";
import { t } from "../i18n.js";

export function openSlotDetail({ date, slotIdx, week, settings, dishes, onLog, onUnlog, onSwap, onDelete, onNoteChange, onClose }) {
  const slot = week.days[date].slots[slotIdx];
  const dish = dishes.find((d) => d.id === slot.dishId);
  const slotCfg = settings.slotsPerDay[slotIdx];

  const overlay = h("div", { class: "picker-overlay", onclick: (e) => { if (e.target === overlay) { cleanup(); onClose(); } } });
  const sheet = h("div", { class: "picker-sheet", role: "dialog", "aria-modal": "true" });
  overlay.append(sheet);
  document.body.append(overlay);

  function onKeyDown(e) {
    if (e.key === "Escape") { cleanup(); onClose(); }
  }
  document.addEventListener("keydown", onKeyDown);

  function rerender() {
    clear(sheet);
    sheet.append(
      h("div", { class: "picker-handle" }),
      h("div", { class: "picker-title" }, `${slotCfg.label} · ${date}`),
      dish
        ? h("div", { class: "slot-detail-meta" },
            h("span", { class: "slot-detail-emoji" }, emojiFor(dish.category)),
            h("span", { class: "slot-detail-name" }, dish.name),
          )
        : h("div", { class: "slot-detail-meta" }, h("span", {}, t.empty)),
      h("textarea", {
        class: "slot-note",
        placeholder: "Notiz …",
        oninput: (e) => onNoteChange(e.target.value),
      }, slot.note ?? ""),
      h("div", { class: "slot-actions" },
        slot.dishId
          ? slot.loggedAt
            ? h("button", { class: "slot-action", onclick: () => { onUnlog(); cleanup(); } }, t.unlog)
            : h("button", { class: "slot-action primary", onclick: () => { onLog(); cleanup(); } }, t.log)
          : null,
        slot.dishId
          ? h("button", { class: "slot-action", onclick: () => { onSwap(); cleanup(); } }, t.swap)
          : null,
        slot.dishId
          ? h("button", { class: "slot-action danger", onclick: () => { onDelete(); cleanup(); } }, t.delete)
          : null,
      ),
    );
  }

  function emojiFor(c) { return { green: "🟢", yellow: "🟡", red: "🔴" }[c] ?? "·"; }
  function cleanup() {
    document.removeEventListener("keydown", onKeyDown);
    if (overlay.parentElement) document.body.removeChild(overlay);
  }

  rerender();
  return cleanup;
}
