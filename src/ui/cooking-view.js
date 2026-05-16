// src/ui/cooking-view.js
//
// Full-screen "Anleitung" view: parses a dish's free-form notes into
// headings / ordered + unordered lists / paragraphs / tip callouts, then
// renders them in large readable type for hands-on cooking.
//
// The notes format we see in the catalog is messy — semicolons separating
// sections, "Zutaten:" / "Zubereitung:" / "Schritte:" / "Schritt N -"
// headings, numbered "1." steps, bullets ("- "), and 👉 tips. The parser
// is intentionally forgiving.

import { h, clear } from "./render.js";
import { t } from "../i18n.js";

// Heading variants:
//   "Zutaten:" / "Zutaten für 4 Portionen:" / "Zubereitung:" / "Schritte:"
//     — content can follow on the same line, captured separately
//   "Schritt 1 – Vorkochen (wichtig!)" — standalone step heading
//   "1. Schritt" / "2. Schritt" — alternate step heading (note: NOT a
//     numbered list item; we check this BEFORE NUM_ITEM_RX)
const HEADING_INLINE_RX = /^(Zutaten[^:]*?|Zubereitung|Schritte|Extra-Trick[^:]*?):\s*(.*)$/i;
const STEP_HEADING_RX = /^(Schritt\s*\d+(?:\s*[–-][^:\n]*?)?)\s*$/i;
const STEP_HEADING_ALT_RX = /^(\d+)\.\s*Schritt\s*$/i; // "1. Schritt"
const SECTION_SPLIT_RX = /;\s*(?=(?:Zutaten|Zubereitung|Schritte|Schritt\s*\d|Extra-Trick))/gi;
const NUM_ITEM_RX = /^(\d+)\.\s+(.+)/;
const BULLET_ITEM_RX = /^[-•*]\s+(.+)/;

export function parseNotes(text) {
  if (!text || !text.trim()) return [];

  // Normalize: turn semicolon-separated logical sections into newline-separated
  let normalized = String(text).replace(SECTION_SPLIT_RX, "\n\n");
  // Also: a "Schritt N – title" inside text often has no surrounding break.
  normalized = normalized.replace(/(?<!\n)(Schritt\s*\d+\s*[–-][^\n;]*)(?!\n)/gi, "\n\n$1\n");
  normalized = normalized.replace(/\n{3,}/g, "\n\n");

  const lines = normalized.split("\n");
  const blocks = [];
  let curList = null;       // { kind: 'ol' | 'ul', items: [] }
  let curPara = null;       // string accumulator

  const flushList = () => { if (curList) { blocks.push(curList); curList = null; } };
  const flushPara = () => { if (curPara) { blocks.push({ kind: "p", text: curPara.trim() }); curPara = null; } };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { flushList(); flushPara(); continue; }

    // 👉 tip line
    if (line.startsWith("👉")) {
      flushList(); flushPara();
      blocks.push({ kind: "tip", text: line.replace(/^👉\s*/, "") });
      continue;
    }

    // Step heading: "Schritt 1 – Vorkochen (wichtig!)" — standalone, no body
    const stepHead = line.match(STEP_HEADING_RX);
    if (stepHead) {
      flushList(); flushPara();
      blocks.push({ kind: "h", text: stepHead[1].trim() });
      continue;
    }

    // Alternate step heading: "1. Schritt", "2. Schritt" — checked BEFORE
    // NUM_ITEM_RX so it isn't mis-detected as an ordered list item.
    const stepHeadAlt = line.match(STEP_HEADING_ALT_RX);
    if (stepHeadAlt) {
      flushList(); flushPara();
      blocks.push({ kind: "h", text: `Schritt ${stepHeadAlt[1]}` });
      continue;
    }

    // Inline-content heading: "Zutaten: 500g Kartoffeln, …" or "Zubereitung: …"
    const inlineHead = line.match(HEADING_INLINE_RX);
    if (inlineHead) {
      flushList(); flushPara();
      blocks.push({ kind: "h", text: inlineHead[1].trim() });
      const rest = inlineHead[2].trim();
      if (rest) curPara = rest;
      continue;
    }

    // Numbered step
    const numM = line.match(NUM_ITEM_RX);
    if (numM) {
      flushPara();
      if (!curList || curList.kind !== "ol") { flushList(); curList = { kind: "ol", items: [] }; }
      curList.items.push(numM[2]);
      continue;
    }

    // Bullet
    const bulM = line.match(BULLET_ITEM_RX);
    if (bulM) {
      flushPara();
      if (!curList || curList.kind !== "ul") { flushList(); curList = { kind: "ul", items: [] }; }
      curList.items.push(bulM[1]);
      continue;
    }

    // Plain text: continuation of current list item or paragraph
    if (curList && curList.items.length > 0) {
      curList.items[curList.items.length - 1] += " " + line;
    } else {
      curPara = curPara ? curPara + " " + line : line;
    }
  }
  flushList();
  flushPara();
  return blocks;
}

function renderBlock(b) {
  switch (b.kind) {
    case "h":   return h("h2", { class: "cv-heading" }, b.text);
    case "p":   return h("p",  { class: "cv-para" },   b.text);
    case "tip": return h("div", { class: "cv-tip" }, h("span", { class: "cv-tip-icon" }, "👉"), h("span", {}, b.text));
    case "ol":  return h("ol", { class: "cv-list cv-list-ol" }, ...b.items.map((i) => h("li", {}, i)));
    case "ul":  return h("ul", { class: "cv-list cv-list-ul" }, ...b.items.map((i) => h("li", {}, i)));
    default:    return null;
  }
}

export function openCookingView({ dish, isLogged, onLog, onClose }) {
  const overlay = h("div", { class: "cv-overlay" });
  document.body.append(overlay);

  function onKey(e) { if (e.key === "Escape") cleanup(); }
  document.addEventListener("keydown", onKey);
  function cleanup() {
    document.removeEventListener("keydown", onKey);
    if (overlay.parentElement) document.body.removeChild(overlay);
    onClose?.();
  }

  const blocks = parseNotes(dish.notes);
  const emoji = { green: "🟢", yellow: "🟡", red: "🔴" }[dish.category] ?? "·";

  overlay.append(
    h("header", { class: "cv-header" },
      h("button", { class: "cv-close", "aria-label": "Schließen", onclick: cleanup }, "✕"),
      h("div", { class: "cv-title" }, emoji, " ", dish.name),
      h("span", { class: "cv-spacer" }), // grid balancer
    ),
    h("div", { class: "cv-body" },
      blocks.length > 0
        ? blocks.map(renderBlock)
        : h("p", { class: "cv-empty" }, "Keine Anleitung hinterlegt."),
    ),
    onLog
      ? h("footer", { class: "cv-footer" },
          h("button", {
            class: "cv-eat-btn",
            onclick: () => { onLog(); cleanup(); },
          }, isLogged ? `${t.unlog}` : `${t.log} ✓`),
        )
      : null,
  );

  return cleanup;
}
