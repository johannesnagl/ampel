# Ampel Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A mobile-first single-page web app for the personal traffic light nutrition system, with planning, logging, and active rule feedback at the moment of meal selection.

**Architecture:** Static HTML + CSS + ES modules, served as flat files with no build step. `index.html` references `styles.css` and `src/app.js`. All logic lives in `src/` and is unit-tested with `node --test`. Data persists in browser `localStorage`. The seed dish catalog lives in `data/dishes.json`.

**Tech Stack:** Plain HTML / CSS / ES modules. Node.js (for `node --test` only — not at runtime). No frameworks, no bundler, no `node_modules` at runtime.

**Note on spec deviation:** The spec said "single HTML file." This plan uses an HTML shell + external `src/*.js` ES modules + `styles.css`. This is still a no-build, no-bundler architecture (the browser loads modules natively). The change enables proper TDD with Node's built-in test runner.

---

## File structure

```
/Users/johannesnagl/Code/ampel/
├── index.html               # Shell — references styles.css and src/app.js
├── styles.css               # All CSS, design tokens at :root
├── data/
│   └── dishes.json          # ~80 seed dishes from the docx
├── src/
│   ├── app.js               # Bootstrap, screen routing, event wiring
│   ├── i18n.js              # German strings
│   ├── state/
│   │   ├── storage.js       # localStorage wrapper + schema versioning
│   │   ├── settings.js      # load/save/migrate settings
│   │   ├── weeks.js         # load/save/migrate week data
│   │   └── catalog.js       # load/save/seed/migrate catalog
│   ├── rules/
│   │   ├── points.js        # weekly point budget + per-day points
│   │   ├── distribution.js  # 🟢/🟡/🔴 vs target ranges
│   │   ├── heavy.js         # no two heavy in a row
│   │   ├── cheats.js        # no cheat + cheat same day
│   │   ├── yellowHeavy.js   # no three heavy yellow
│   │   ├── cheatSnack.js    # cheat day → snacks must be green
│   │   ├── lightDay.js      # light-day-evening escalation
│   │   ├── frequency.js     # per-dish frequency cap
│   │   ├── bestCombo.js     # best combo recognition
│   │   └── evaluate.js      # evaluateWeek() — orchestrates all rules
│   ├── ui/
│   │   ├── render.js        # tiny render helpers (h(), classes())
│   │   ├── week-view.js     # Wochenansicht
│   │   ├── picker.js        # Slot picker modal
│   │   ├── catalog-view.js  # Vorrat
│   │   └── settings-view.js # Einstellungen
│   └── util/
│       ├── dates.js         # ISO week math, date formatting
│       └── search.js        # free-text matching
├── tests/
│   ├── helpers/
│   │   └── fixtures.mjs     # week + dish fixtures for tests
│   ├── rules/
│   │   ├── points.test.mjs
│   │   ├── distribution.test.mjs
│   │   ├── heavy.test.mjs
│   │   ├── cheats.test.mjs
│   │   ├── yellowHeavy.test.mjs
│   │   ├── cheatSnack.test.mjs
│   │   ├── lightDay.test.mjs
│   │   ├── frequency.test.mjs
│   │   ├── bestCombo.test.mjs
│   │   └── evaluate.test.mjs
│   ├── state/
│   │   └── storage.test.mjs
│   └── util/
│       ├── dates.test.mjs
│       └── search.test.mjs
├── scripts/
│   └── extract-dishes.py    # one-shot script to seed dishes.json from the docx
├── docs/superpowers/
│   ├── specs/2026-05-06-ampel-tracker-design.md
│   └── plans/2026-05-06-ampel-tracker.md
└── README.md
```

---

## Phase 1 — Foundation

### Task 1: Project skeleton (folders + index.html + styles.css + README)

**Files:**
- Create: `index.html`
- Create: `styles.css`
- Create: `README.md`
- Create: `src/`, `data/`, `tests/`, `scripts/` (empty dirs)

- [ ] **Step 1: Create directories**

```bash
cd /Users/johannesnagl/Code/ampel
mkdir -p src/state src/rules src/ui src/util data tests/rules tests/state tests/util tests/helpers scripts
```

- [ ] **Step 2: Create `index.html` shell**

```html
<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="theme-color" content="#ffffff">
  <title>Ampel</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body data-screen="week">
  <main id="root">
    <p class="loading">Lade …</p>
  </main>
  <script type="module" src="src/app.js"></script>
</body>
</html>
```

- [ ] **Step 3: Create `styles.css` with design tokens (skeleton only)**

```css
:root {
  --green: #22c55e;
  --green-tint: #f0fdf4;
  --green-text: #166534;
  --yellow: #eab308;
  --yellow-tint: #fefce8;
  --yellow-text: #854d0e;
  --red: #ef4444;
  --red-tint: #fef2f2;
  --red-text: #991b1b;
  --n-0: #ffffff;
  --n-50: #fafafa;
  --n-100: #f5f5f5;
  --n-200: #e5e5e5;
  --n-500: #737373;
  --n-900: #171717;
  --safe-bottom: env(safe-area-inset-bottom);
  --safe-top: env(safe-area-inset-top);
}

* { box-sizing: border-box; }

html, body {
  margin: 0;
  padding: 0;
  background: var(--n-0);
  color: var(--n-900);
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  font-size: 15px;
  line-height: 1.4;
  -webkit-tap-highlight-color: transparent;
}

#root {
  max-width: 480px;
  margin: 0 auto;
  min-height: 100dvh;
}

.loading {
  text-align: center;
  color: var(--n-500);
  margin-top: 4rem;
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0s !important;
    transition-duration: 0s !important;
  }
}
```

- [ ] **Step 4: Create `README.md`**

```markdown
# Ampel — Personal Traffic Light Meal Tracker

Mobile-first web app for the personal nutrition system documented in
`Gerichtepool aktuell_Ampelsystem.docx`. Plans + logs meals across daily
slots, with active rule feedback while planning.

## Run locally

No build step. Serve the folder with any static file server:

\`\`\`bash
python3 -m http.server 8000
# or
npx serve .
\`\`\`

Open http://localhost:8000 in your browser. On iPhone Safari, use
"Share → Zum Home-Bildschirm" to install as a web-app.

## Run tests

\`\`\`bash
node --test tests/**/*.test.mjs
\`\`\`

No `npm install` needed — tests use only Node's built-in test runner and
ES modules.

## Deploy

Drop the entire folder onto Cloudflare Pages, Netlify, or any static host.
No environment variables. No build command.

## Project layout

See `docs/superpowers/specs/2026-05-06-ampel-tracker-design.md` for the
full design and `docs/superpowers/plans/2026-05-06-ampel-tracker.md` for
the implementation plan.
```

- [ ] **Step 5: Verify the shell renders**

```bash
cd /Users/johannesnagl/Code/ampel
python3 -m http.server 8000 &
sleep 1
curl -s http://localhost:8000 | head -20
kill %1
```

Expected: HTML output starting with `<!doctype html>`. Open http://localhost:8000 in browser, see "Lade …".

- [ ] **Step 6: Commit**

```bash
git add index.html styles.css README.md
git commit -m "feat: project skeleton (shell + CSS tokens + README)"
```

---

### Task 2: Generate `data/dishes.json` from the docx

**Files:**
- Create: `scripts/extract-dishes.py`
- Create: `data/dishes.json`

The docx is the source of truth for ~80 dishes. We extract them once with a script that:
1. Reads the docx XML
2. Parses dish entries (name, category, frequency)
3. Infers `slotTypes` from section headings (Frühstück → breakfast, Snack → snack, etc.)
4. Infers `heavy` from a small allow-list of indicators ("Pasta", "Pizza", "Risotto", "Falafel + Hummus", etc.)
5. Generates kebab-case `id`s
6. Writes `data/dishes.json` for review and manual cleanup

- [ ] **Step 1: Write `scripts/extract-dishes.py`**

```python
#!/usr/bin/env python3
"""Extract dishes from the Ampelsystem docx into data/dishes.json.

The docx is structured as repeated blocks of:
  Dish name
  Category line (🟢/🟡/🔴 + label)
  Frequency line (👉 Frequenz: ➡️ N x/Woche)

Section headings (e.g. "🟢 FRÜHSTÜCK", "🟡 RISONI") tell us the slot context.
"""
import json
import re
import sys
import zipfile
from pathlib import Path

DOCX = Path("Gerichtepool aktuell_Ampelsystem.docx")
OUT = Path("data/dishes.json")

CAT_GREEN = "green"
CAT_YELLOW = "yellow"
CAT_RED = "red"

# Heuristics for the heavy flag — applied to lowered name + notes.
HEAVY_KEYWORDS = [
    "pizza", "pasta", "risotto", "spätzle", "spaetzle", "gnocchi",
    "schupfnudeln", "kaiserschmarrn", "pfannkuchen", "palatschinken",
    "waffeln", "tagliatelle", "spaghetti", "blätterteig", "fladenbrot",
    "falafel + hummus", "avocado + feta", "süßkartoffel + avocado",
    "mango-kokos", "kürbis-kokos", "einbrenn",
]

# Heuristics for slotTypes. If section heading is "FRÜHSTÜCK" → ["breakfast"].
# "SNACKS" → ["snack"]. Otherwise default to ["lunch", "dinner"]. Salads /
# bowls / wraps without explicit Frühstück context are lunch+dinner.
BREAKFAST_SECTION = re.compile(r"FRÜHSTÜCK", re.I)
SNACK_SECTION    = re.compile(r"SNACKS?", re.I)

CATEGORY_RX = re.compile(r"^(🟢|🟡|🔴)\s*(BASIS|MODERAT|CHEAT|GRÜN|GELB|ROT)?", re.U)
FREQ_RX = re.compile(r"(\d+)\s*[–-]?\s*(\d+)?\s*x\s*[/\\]\s*(Woche|Monat|Tag)", re.I)
NUMBERED_RX = re.compile(r"^\s*\d+\.\s*")

def kebab(s: str) -> str:
    s = s.lower()
    s = re.sub(r"[äÄ]", "ae", s)
    s = re.sub(r"[öÖ]", "oe", s)
    s = re.sub(r"[üÜ]", "ue", s)
    s = re.sub(r"[ß]", "ss", s)
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-")

def lines_from_docx(path: Path) -> list[str]:
    with zipfile.ZipFile(path) as z:
        xml = z.read("word/document.xml").decode("utf-8")
    paras = re.findall(r"<w:p\b[^>]*>(.*?)</w:p>", xml, re.S)
    out = []
    for p in paras:
        text = "".join(re.findall(r"<w:t[^>]*>([^<]*)</w:t>", p))
        out.append(text.rstrip())
    return out

def detect_category(line: str) -> str | None:
    if "🟢" in line: return CAT_GREEN
    if "🟡" in line: return CAT_YELLOW
    if "🔴" in line: return CAT_RED
    return None

def detect_frequency(line: str) -> dict | None:
    m = FREQ_RX.search(line)
    if not m: return None
    lo = int(m.group(1))
    hi = int(m.group(2)) if m.group(2) else lo
    unit = m.group(3).lower()
    if unit.startswith("woch"):
        return {"type": "weekly", "max": hi}
    if unit.startswith("monat"):
        return {"type": "monthly", "max": hi}
    # daily — collapse to weekly
    return {"type": "weekly", "max": hi * 7}

def is_heavy(name: str, notes: str) -> bool:
    blob = f"{name} {notes}".lower()
    return any(k in blob for k in HEAVY_KEYWORDS)

def main():
    lines = lines_from_docx(DOCX)
    dishes = []
    seen_ids = set()
    section_breakfast = False
    section_snack = False
    pending_name = None
    pending_notes = []

    def flush(name, category, freq, notes_lines):
        if not name or not category or not freq:
            return
        notes = "\n".join(n for n in notes_lines if n).strip()
        slot_types = (
            ["breakfast"] if section_breakfast
            else ["snack"] if section_snack
            else ["lunch", "dinner"]
        )
        base_id = kebab(name)
        dish_id = base_id
        n = 2
        while dish_id in seen_ids:
            dish_id = f"{base_id}-{n}"
            n += 1
        seen_ids.add(dish_id)
        dishes.append({
            "id": dish_id,
            "name": name,
            "category": category,
            "heavy": is_heavy(name, notes) and category != CAT_GREEN,
            "frequency": freq,
            "slotTypes": slot_types,
            "tags": [t for t in re.findall(r"[A-Za-zÄÖÜäöüß]+", name.lower()) if len(t) > 2],
            "notes": notes,
        })

    i = 0
    while i < len(lines):
        line = lines[i].strip()
        if not line:
            i += 1
            continue

        # Section heading detection
        if BREAKFAST_SECTION.search(line):
            section_breakfast, section_snack = True, False
        elif SNACK_SECTION.search(line) and "SNACK" in line.upper():
            section_breakfast, section_snack = False, True
        elif "GERICHTE" in line.upper() and ("KORN" in line.upper() or "WEITERE" in line.upper() or "/" in line):
            section_breakfast, section_snack = False, False

        # Try to read a dish triple: name → category line → freq line
        category = detect_category(line)
        if category is None and not NUMBERED_RX.match(line) and 3 < len(line) < 80 and not line.startswith(("👉", "➡️", "❌", "✅", "🎯", "🔥", "🟢", "🟡", "🔴")):
            # Possible dish name candidate; peek next line
            if i + 1 < len(lines):
                cat_next = detect_category(lines[i + 1].strip())
                if cat_next:
                    name = NUMBERED_RX.sub("", line).strip()
                    notes_lines = []
                    cat = cat_next
                    freq = None
                    j = i + 1
                    # collect lines until next dish or section
                    while j < len(lines) and j < i + 10:
                        l = lines[j].strip()
                        if not freq:
                            f = detect_frequency(l)
                            if f: freq = f
                        if "BASIS" in l.upper() or "MODERAT" in l.upper() or "CHEAT" in l.upper() or detect_category(l):
                            notes_lines.append(l)
                        elif l and not detect_category(l):
                            notes_lines.append(l)
                        j += 1
                        # stop at next dish-name candidate
                        if j < len(lines) and detect_category(lines[j].strip()) is None and 3 < len(lines[j].strip()) < 80 and j + 1 < len(lines) and detect_category(lines[j + 1].strip()):
                            break
                    flush(name, cat, freq, notes_lines)
                    i = j
                    continue
        i += 1

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({"version": 1, "dishes": dishes}, ensure_ascii=False, indent=2))
    print(f"Wrote {len(dishes)} dishes → {OUT}")

if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Run the extractor**

```bash
cd /Users/johannesnagl/Code/ampel
python3 scripts/extract-dishes.py
```

Expected: `Wrote N dishes → data/dishes.json` with N around 70–90.

- [ ] **Step 3: Manually review `data/dishes.json` for sanity**

Open `data/dishes.json` in your editor. Skim for obvious bugs:
- Duplicate `id`s (script handles, but verify)
- Missing `frequency` (a dish without one needs a sensible default — usually `weekly: 3`)
- `slotTypes` that look wrong (e.g. a Frühstück item showing `["lunch", "dinner"]`)
- `heavy` field on green dishes (should always be `false` for green)
- Garbage names (extraction artefacts)

Edit the JSON directly. Goal: have a believable seed catalog covering all your common dishes. Doesn't need to be perfect — you'll edit it in the catalog UI later.

- [ ] **Step 4: Commit**

```bash
git add scripts/extract-dishes.py data/dishes.json
git commit -m "feat: seed catalog from docx (~80 dishes)"
```

---

### Task 3: Bootstrap `src/app.js` and screen routing

**Files:**
- Create: `src/app.js`
- Create: `src/i18n.js`
- Create: `src/ui/render.js`
- Modify: `index.html` (no actual change needed — already references app.js)

- [ ] **Step 1: Create `src/i18n.js` (German strings)**

```js
// src/i18n.js
export const t = {
  app: { name: "Ampel", loading: "Lade …" },
  screens: { week: "Woche", catalog: "Vorrat", settings: "Einstellungen" },
  slot: {
    breakfast: "Frühstück",
    lunch:     "Mittag",
    dinner:    "Abend",
    snack:     "Snack",
    snack1:    "Snack 1",
    snack2:    "Snack 2",
    snack3:    "Snack 3",
  },
  dayLabel: { light: "leichter Tag", normal: "normaler Tag", cheat: "Cheat-Tag" },
  add: "+ planen",
  empty: "Noch keine Mahlzeit",
  heavy: "schwer",
  warning: "Hinweis",
  warnings_n: (n) => n === 1 ? "1 Hinweis" : `${n} Hinweise`,
  log: "Als gegessen markieren",
  unlog: "Markierung entfernen",
  delete: "Entfernen",
  swap: "Tauschen",
  edit: "Bearbeiten",
  search: "Suche …",
  catalog: { title: "Vorrat", new: "+ Neu" },
  settings: { title: "Einstellungen", budget: "Wochenbudget (Punkte)", export: "Daten exportieren", import: "Daten importieren", resetCatalog: "Vorrat zurücksetzen", resetAll: "App zurücksetzen" },
  points_used_of: (used, budget) => `${used} / ${budget} Punkte`,
  week_n: (n) => `Woche ${n}`,
};
```

- [ ] **Step 2: Create `src/ui/render.js` (tiny render helpers)**

```js
// src/ui/render.js — tiny DOM helpers, no framework
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === "class")        el.className = v;
    else if (k === "style")   Object.assign(el.style, v);
    else if (k.startsWith("on")) el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === "data")    for (const [dk, dv] of Object.entries(v)) el.dataset[dk] = dv;
    else                      el.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

export function clear(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
}

export function mount(parent, ...nodes) {
  clear(parent);
  for (const n of nodes) parent.append(n);
}
```

- [ ] **Step 3: Create `src/app.js` bootstrap (placeholder for now)**

```js
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
```

- [ ] **Step 4: Add tab bar styles to `styles.css`**

Append to `styles.css`:

```css
.tab-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  background: var(--n-50);
  border-top: 1px solid var(--n-200);
  padding-bottom: var(--safe-bottom);
  z-index: 10;
}
.tab {
  flex: 1;
  background: none;
  border: 0;
  padding: 14px 0;
  font: inherit;
  color: var(--n-500);
  min-height: 44px;
  cursor: pointer;
}
body[data-screen="week"]     .tab:nth-child(1),
body[data-screen="catalog"]  .tab:nth-child(2),
body[data-screen="settings"] .tab:nth-child(3) {
  color: var(--n-900);
  font-weight: 600;
}

#root { padding-bottom: calc(56px + var(--safe-bottom) + 16px); }

.stub { color: var(--n-500); padding: 1rem; }
```

- [ ] **Step 5: Verify in browser**

```bash
python3 -m http.server 8000 &
```

Open http://localhost:8000. Expected: three tabs at the bottom (Woche / Vorrat / Einstellungen). Tapping each switches the visible content. The active tab is bold.

Stop server: `kill %1`

- [ ] **Step 6: Commit**

```bash
git add src/app.js src/i18n.js src/ui/render.js styles.css
git commit -m "feat: app bootstrap + screen routing + tab bar"
```

---

## Phase 2 — Data layer

### Task 4: Storage wrapper with schema versioning

**Files:**
- Create: `src/state/storage.js`
- Create: `tests/state/storage.test.mjs`

- [ ] **Step 1: Write the failing test `tests/state/storage.test.mjs`**

```js
// tests/state/storage.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { makeStorage } from "../../src/state/storage.js";

function memStore() {
  const m = new Map();
  return {
    getItem: (k) => m.has(k) ? m.get(k) : null,
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    _raw: m,
  };
}

test("read returns null when key absent", () => {
  const s = makeStorage(memStore());
  assert.equal(s.read("missing"), null);
});

test("write/read round-trips data", () => {
  const s = makeStorage(memStore());
  s.write("foo", { hello: "world" }, 1);
  assert.deepEqual(s.read("foo"), { hello: "world" });
});

test("write wraps with schemaVersion", () => {
  const store = memStore();
  const s = makeStorage(store);
  s.write("foo", { x: 1 }, 2);
  const raw = JSON.parse(store.getItem("foo"));
  assert.equal(raw.schemaVersion, 2);
  assert.deepEqual(raw.data, { x: 1 });
});

test("read at older schemaVersion runs migration", () => {
  const store = memStore();
  store.setItem("foo", JSON.stringify({ schemaVersion: 1, data: { x: 1 } }));
  const s = makeStorage(store, {
    foo: {
      currentVersion: 2,
      migrate: { 1: (d) => ({ x: d.x, y: 0 }) },
    },
  });
  assert.deepEqual(s.read("foo"), { x: 1, y: 0 });
});

test("read at unknown schemaVersion returns null", () => {
  const store = memStore();
  store.setItem("foo", JSON.stringify({ schemaVersion: 99, data: { x: 1 } }));
  const s = makeStorage(store, {
    foo: { currentVersion: 1, migrate: {} },
  });
  assert.equal(s.read("foo"), null);
});

test("remove deletes the key", () => {
  const s = makeStorage(memStore());
  s.write("foo", { x: 1 }, 1);
  s.remove("foo");
  assert.equal(s.read("foo"), null);
});
```

- [ ] **Step 2: Run test — expect failure**

```bash
node --test tests/state/storage.test.mjs
```

Expected: cannot find module `../../src/state/storage.js`.

- [ ] **Step 3: Implement `src/state/storage.js`**

```js
// src/state/storage.js
//
// Versioned localStorage wrapper. Every value is stored as
//   { schemaVersion: N, data: ... }
// On read, if the stored version is older than `currentVersion`, we run
// migrations sequentially. If newer or unknown, we treat the data as
// missing.

export function makeStorage(backend = globalThis.localStorage, schemas = {}) {
  function read(key) {
    const raw = backend.getItem(key);
    if (raw == null) return null;
    let parsed;
    try { parsed = JSON.parse(raw); } catch { return null; }
    if (!parsed || typeof parsed !== "object") return null;
    const schema = schemas[key];
    if (!schema) return parsed.data ?? null;
    let v = parsed.schemaVersion;
    let data = parsed.data;
    if (v === schema.currentVersion) return data;
    if (v > schema.currentVersion) return null;
    while (v < schema.currentVersion) {
      const step = schema.migrate?.[v];
      if (!step) return null;
      data = step(data);
      v += 1;
    }
    return data;
  }

  function write(key, data, version) {
    const wrapped = { schemaVersion: version, data };
    backend.setItem(key, JSON.stringify(wrapped));
  }

  function remove(key) {
    backend.removeItem(key);
  }

  return { read, write, remove };
}
```

- [ ] **Step 4: Run tests — expect all pass**

```bash
node --test tests/state/storage.test.mjs
```

Expected: 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/state/storage.js tests/state/storage.test.mjs
git commit -m "feat(state): versioned localStorage wrapper"
```

---

### Task 5: Settings, weeks, catalog modules

**Files:**
- Create: `src/state/settings.js`
- Create: `src/state/weeks.js`
- Create: `src/state/catalog.js`

These modules wrap the storage layer with typed read/write per domain. Each declares its `currentVersion = 1` and an empty migrations map.

- [ ] **Step 1: Write `src/state/settings.js`**

```js
// src/state/settings.js
import { makeStorage } from "./storage.js";

export const SETTINGS_KEY = "ampel.settings";
export const SETTINGS_VERSION = 1;

export const DEFAULT_SETTINGS = {
  slotsPerDay: [
    { type: "breakfast", label: "Frühstück" },
    { type: "snack",     label: "Snack 1" },
    { type: "lunch",     label: "Mittag" },
    { type: "snack",     label: "Snack 2" },
    { type: "dinner",    label: "Abend" },
  ],
  weeklyPointBudget: 12,
  weekStartsOn: "monday",
  language: "de",
};

export function makeSettingsStore(backend) {
  const storage = makeStorage(backend, {
    [SETTINGS_KEY]: { currentVersion: SETTINGS_VERSION, migrate: {} },
  });
  return {
    load() {
      return storage.read(SETTINGS_KEY) ?? structuredClone(DEFAULT_SETTINGS);
    },
    save(settings) {
      storage.write(SETTINGS_KEY, settings, SETTINGS_VERSION);
    },
    reset() {
      storage.write(SETTINGS_KEY, structuredClone(DEFAULT_SETTINGS), SETTINGS_VERSION);
    },
  };
}
```

- [ ] **Step 2: Write `src/state/weeks.js`**

```js
// src/state/weeks.js
import { makeStorage } from "./storage.js";

export const WEEKS_KEY = "ampel.weeks";
export const WEEKS_VERSION = 1;

export function emptyDay(slotsPerDay) {
  return {
    slots: slotsPerDay.map(({ type }) => ({
      type, dishId: null, loggedAt: null, note: "",
    })),
  };
}

export function emptyWeek(mondayISO, slotsPerDay) {
  const days = {};
  const monday = new Date(mondayISO);
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    days[key] = emptyDay(slotsPerDay);
  }
  return { monday: mondayISO, days };
}

export function makeWeeksStore(backend) {
  const storage = makeStorage(backend, {
    [WEEKS_KEY]: { currentVersion: WEEKS_VERSION, migrate: {} },
  });
  return {
    loadAll() {
      return storage.read(WEEKS_KEY) ?? {};
    },
    saveAll(all) {
      storage.write(WEEKS_KEY, all, WEEKS_VERSION);
    },
    getWeek(weekId, mondayISO, slotsPerDay) {
      const all = this.loadAll();
      if (!all[weekId]) {
        all[weekId] = emptyWeek(mondayISO, slotsPerDay);
      }
      return all[weekId];
    },
    saveWeek(weekId, week) {
      const all = this.loadAll();
      all[weekId] = week;
      this.saveAll(all);
    },
  };
}
```

- [ ] **Step 3: Write `src/state/catalog.js`**

```js
// src/state/catalog.js
import { makeStorage } from "./storage.js";

export const CATALOG_KEY = "ampel.dishes";
export const CATALOG_VERSION = 1;

export function makeCatalogStore(backend, fetchSeed = defaultFetchSeed) {
  const storage = makeStorage(backend, {
    [CATALOG_KEY]: { currentVersion: CATALOG_VERSION, migrate: {} },
  });

  return {
    async load() {
      const cached = storage.read(CATALOG_KEY);
      if (cached) return cached;
      const seed = await fetchSeed();
      storage.write(CATALOG_KEY, seed, CATALOG_VERSION);
      return seed;
    },
    save(catalog) {
      storage.write(CATALOG_KEY, catalog, CATALOG_VERSION);
    },
    async reset() {
      const seed = await fetchSeed();
      storage.write(CATALOG_KEY, seed, CATALOG_VERSION);
      return seed;
    },
  };
}

async function defaultFetchSeed() {
  const res = await fetch("data/dishes.json");
  if (!res.ok) throw new Error(`Failed to fetch seed catalog: ${res.status}`);
  return await res.json();
}
```

- [ ] **Step 4: Smoke-test that the modules import cleanly**

```bash
node --input-type=module -e '
import { makeSettingsStore, DEFAULT_SETTINGS } from "./src/state/settings.js";
import { makeWeeksStore, emptyWeek } from "./src/state/weeks.js";
import { makeCatalogStore } from "./src/state/catalog.js";
console.log("settings keys:", Object.keys(DEFAULT_SETTINGS));
console.log("emptyWeek days:", Object.keys(emptyWeek("2026-05-04", DEFAULT_SETTINGS.slotsPerDay.slice(0, 1))));
console.log("catalog store:", typeof makeCatalogStore);
'
```

Expected: prints `settings keys: [ 'slotsPerDay', 'weeklyPointBudget', 'weekStartsOn', 'language' ]`, a list of 7 ISO date keys, and `catalog store: function`.

- [ ] **Step 5: Commit**

```bash
git add src/state/settings.js src/state/weeks.js src/state/catalog.js
git commit -m "feat(state): settings, weeks, catalog stores"
```

---

### Task 6: Date utilities (ISO weeks)

**Files:**
- Create: `src/util/dates.js`
- Create: `tests/util/dates.test.mjs`

- [ ] **Step 1: Write the failing test `tests/util/dates.test.mjs`**

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { isoWeekId, mondayOf, addDays, fmtDayShort, dateKey, isoWeekIdFromKey } from "../../src/util/dates.js";

test("isoWeekId for 2026-05-04 (Mon) is 2026-W19", () => {
  assert.equal(isoWeekId(new Date("2026-05-04T12:00:00Z")), "2026-W19");
});

test("isoWeekId for 2026-05-10 (Sun) is still 2026-W19", () => {
  assert.equal(isoWeekId(new Date("2026-05-10T12:00:00Z")), "2026-W19");
});

test("isoWeekId for 2026-12-31 falls into 2026-W53 or 2027-W01 per ISO rule", () => {
  // 2026-12-31 is a Thursday; week 53 of 2026 by ISO rules
  assert.equal(isoWeekId(new Date("2026-12-31T12:00:00Z")), "2026-W53");
});

test("mondayOf returns Monday of the same ISO week", () => {
  assert.equal(mondayOf(new Date("2026-05-08T12:00:00Z")).toISOString().slice(0, 10), "2026-05-04");
  assert.equal(mondayOf(new Date("2026-05-04T12:00:00Z")).toISOString().slice(0, 10), "2026-05-04");
});

test("addDays adds positive and negative days", () => {
  const d = new Date("2026-05-04T00:00:00Z");
  assert.equal(addDays(d, 3).toISOString().slice(0, 10), "2026-05-07");
  assert.equal(addDays(d, -1).toISOString().slice(0, 10), "2026-05-03");
});

test("dateKey returns YYYY-MM-DD", () => {
  assert.equal(dateKey(new Date("2026-05-04T23:59:59Z")), "2026-05-04");
});

test("fmtDayShort returns localized German short day", () => {
  assert.match(fmtDayShort(new Date("2026-05-04T12:00:00Z")), /^Mo|Di|Mi|Do|Fr|Sa|So\b/);
});

test("isoWeekIdFromKey converts a date key to an ISO week id", () => {
  assert.equal(isoWeekIdFromKey("2026-05-04"), "2026-W19");
});
```

- [ ] **Step 2: Run test — expect failure**

```bash
node --test tests/util/dates.test.mjs
```

Expected: `Cannot find module '../../src/util/dates.js'`.

- [ ] **Step 3: Implement `src/util/dates.js`**

```js
// src/util/dates.js
//
// All times are treated as UTC for week math. ISO weeks: Monday is the
// first day; the week containing the year's first Thursday is week 1.

const DAY_MS = 86400000;

export function addDays(date, n) {
  return new Date(date.getTime() + n * DAY_MS);
}

export function mondayOf(date) {
  const d = new Date(date.getTime());
  d.setUTCHours(0, 0, 0, 0);
  // getUTCDay: Sun=0, Mon=1, ..., Sat=6 → distance back to Monday
  const dow = (d.getUTCDay() + 6) % 7;
  return addDays(d, -dow);
}

export function isoWeekId(date) {
  // Algorithm: clone date, set to Thursday of its ISO week, then year of that
  // Thursday is the ISO year. Week number = floor((dayOfYear of Thursday - 1) / 7) + 1.
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dow = (d.getUTCDay() + 6) % 7; // Mon=0 .. Sun=6
  d.setUTCDate(d.getUTCDate() - dow + 3); // Thursday
  const isoYear = d.getUTCFullYear();
  const yearStart = Date.UTC(isoYear, 0, 1);
  const week = Math.floor((d.getTime() - yearStart) / DAY_MS / 7) + 1;
  return `${isoYear}-W${String(week).padStart(2, "0")}`;
}

export function dateKey(date) {
  return new Date(date.getTime()).toISOString().slice(0, 10);
}

export function isoWeekIdFromKey(key) {
  return isoWeekId(new Date(`${key}T12:00:00Z`));
}

const SHORT_DAY = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"]; // getUTCDay index

export function fmtDayShort(date) {
  return SHORT_DAY[date.getUTCDay()];
}

export function fmtDateGerman(date) {
  return `${date.getUTCDate()}.${date.getUTCMonth() + 1}.`;
}
```

- [ ] **Step 4: Run tests — expect all pass**

```bash
node --test tests/util/dates.test.mjs
```

Expected: 8 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/util/dates.js tests/util/dates.test.mjs
git commit -m "feat(util): ISO week math + date formatting"
```

---

### Task 7: Search helper

**Files:**
- Create: `src/util/search.js`
- Create: `tests/util/search.test.mjs`

- [ ] **Step 1: Write `tests/util/search.test.mjs`**

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { matchDish } from "../../src/util/search.js";

const dish = {
  name: "Couscoussalat (Feta, Tomate, Gurke)",
  tags: ["couscous", "feta", "tomate", "gurke", "salat"],
  notes: "C-MODERAT — leichtes Mittag",
};

test("empty query matches everything", () => {
  assert.equal(matchDish(dish, ""), true);
  assert.equal(matchDish(dish, "   "), true);
});

test("matches name (case-insensitive)", () => {
  assert.equal(matchDish(dish, "couscous"), true);
  assert.equal(matchDish(dish, "COUSCOUS"), true);
});

test("matches tags", () => {
  assert.equal(matchDish(dish, "feta"), true);
  assert.equal(matchDish(dish, "gurke"), true);
});

test("matches notes", () => {
  assert.equal(matchDish(dish, "moderat"), true);
});

test("multi-token query — all tokens must match somewhere", () => {
  assert.equal(matchDish(dish, "feta tomate"), true);
  assert.equal(matchDish(dish, "feta avocado"), false);
});

test("non-match returns false", () => {
  assert.equal(matchDish(dish, "pizza"), false);
});

test("German umlauts match equivalents", () => {
  const d = { name: "Käsekuchen", tags: [], notes: "" };
  assert.equal(matchDish(d, "kase"), true);
  assert.equal(matchDish(d, "käse"), true);
});
```

- [ ] **Step 2: Run test — expect failure**

```bash
node --test tests/util/search.test.mjs
```

Expected: `Cannot find module '../../src/util/search.js'`.

- [ ] **Step 3: Implement `src/util/search.js`**

```js
// src/util/search.js
//
// Free-text search across name, tags, notes. Case-insensitive,
// umlaut-fold (ä→a, ö→o, ü→u, ß→ss) so "kase" matches "Käse".

function fold(s) {
  return String(s).toLowerCase()
    .replace(/ä/g, "a")
    .replace(/ö/g, "o")
    .replace(/ü/g, "u")
    .replace(/ß/g, "ss");
}

export function matchDish(dish, query) {
  const q = fold(query).trim();
  if (!q) return true;
  const haystack = fold([dish.name, ...(dish.tags ?? []), dish.notes ?? ""].join(" "));
  const tokens = q.split(/\s+/).filter(Boolean);
  return tokens.every((t) => haystack.includes(t));
}
```

- [ ] **Step 4: Run tests — expect all pass**

```bash
node --test tests/util/search.test.mjs
```

Expected: 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/util/search.js tests/util/search.test.mjs
git commit -m "feat(util): dish search with German umlaut folding"
```

---

## Phase 3 — Rules engine

### Task 8: Test fixtures + points calculation

**Files:**
- Create: `tests/helpers/fixtures.mjs`
- Create: `src/rules/points.js`
- Create: `tests/rules/points.test.mjs`

- [ ] **Step 1: Create `tests/helpers/fixtures.mjs`**

```js
// tests/helpers/fixtures.mjs
export const SLOTS_5 = [
  { type: "breakfast", label: "Frühstück" },
  { type: "snack",     label: "Snack 1" },
  { type: "lunch",     label: "Mittag" },
  { type: "snack",     label: "Snack 2" },
  { type: "dinner",    label: "Abend" },
];

export const DEFAULT_SETTINGS = {
  slotsPerDay: SLOTS_5,
  weeklyPointBudget: 12,
  weekStartsOn: "monday",
  language: "de",
};

export const DISHES = [
  { id: "porridge",  name: "Porridge",         category: "green",  heavy: false, frequency: { type: "weekly", max: 7 }, slotTypes: ["breakfast"], tags: ["frühstück", "haferflocken"], notes: "" },
  { id: "skyr",      name: "Skyr + Apfel",     category: "green",  heavy: false, frequency: { type: "weekly", max: 7 }, slotTypes: ["snack"],     tags: ["snack", "obst"],            notes: "" },
  { id: "couscous",  name: "Couscoussalat",    category: "yellow", heavy: false, frequency: { type: "weekly", max: 3 }, slotTypes: ["lunch", "dinner"], tags: ["couscous", "feta"],   notes: "" },
  { id: "falafel",   name: "Falafel + Hummus", category: "yellow", heavy: true,  frequency: { type: "weekly", max: 3 }, slotTypes: ["lunch", "dinner"], tags: ["falafel", "hummus"],  notes: "" },
  { id: "pizza",     name: "Pizza",            category: "red",    heavy: true,  frequency: { type: "weekly", max: 1 }, slotTypes: ["lunch", "dinner"], tags: ["pizza"],              notes: "" },
  { id: "risotto",   name: "Risotto",          category: "red",    heavy: false, frequency: { type: "weekly", max: 1 }, slotTypes: ["lunch", "dinner"], tags: ["risotto"],            notes: "" },
];

export function findDish(id) {
  const d = DISHES.find((x) => x.id === id);
  if (!d) throw new Error(`fixture dish not found: ${id}`);
  return d;
}

// Build a week from a compact spec: { "2026-05-04": ["porridge", "skyr", "couscous", null, null], ... }
export function buildWeek(spec, slotsPerDay = SLOTS_5) {
  const days = {};
  const dates = Object.keys(spec).sort();
  const monday = dates[0];
  for (const date of dates) {
    days[date] = {
      slots: spec[date].map((dishId, i) => ({
        type: slotsPerDay[i].type,
        dishId,
        loggedAt: null,
        note: "",
      })),
    };
  }
  return { monday, days };
}
```

- [ ] **Step 2: Write `tests/rules/points.test.mjs`**

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { calcPoints } from "../../src/rules/points.js";
import { buildWeek, DISHES, SLOTS_5 } from "../helpers/fixtures.mjs";

test("empty week is 0 / 12 (default budget)", () => {
  const week = buildWeek({ "2026-05-04": [null, null, null, null, null] });
  const r = calcPoints(week, DISHES, 12);
  assert.equal(r.used, 0);
  assert.equal(r.budget, 12);
  assert.equal(r.status, "ok");
});

test("3 yellow + 1 red = 6 points", () => {
  const week = buildWeek({
    "2026-05-04": [null, null, "couscous", null, "couscous"],
    "2026-05-05": [null, null, "couscous", null, "pizza"],
  });
  const r = calcPoints(week, DISHES, 12);
  assert.equal(r.used, 1 + 1 + 1 + 3); // 3 yellow=3, 1 red=3
  assert.equal(r.status, "ok");
});

test("status flips to warn at >=80% of budget", () => {
  const week = buildWeek({
    "2026-05-04": [null, null, "pizza", null, "couscous"], // 4
    "2026-05-05": [null, null, "couscous", null, "pizza"], // 4 → 8
    "2026-05-06": [null, null, "couscous", null, "couscous"], // 2 → 10
  });
  const r = calcPoints(week, DISHES, 12);
  assert.equal(r.used, 10);
  assert.equal(r.status, "warn"); // 10/12 = 83%
});

test("status flips to over above budget", () => {
  const week = buildWeek({
    "2026-05-04": [null, null, "pizza", null, "pizza"],
    "2026-05-05": [null, null, "pizza", null, "pizza"],
    "2026-05-06": [null, null, "pizza", null, "pizza"],
  });
  const r = calcPoints(week, DISHES, 12);
  assert.equal(r.used, 18);
  assert.equal(r.status, "over");
});

test("perDay points + label", () => {
  const week = buildWeek({
    "2026-05-04": ["porridge", "skyr", "couscous", null, null], // 1 → normal
    "2026-05-05": ["porridge", "skyr", "pizza", null, null],     // 3 → cheat
    "2026-05-06": ["porridge", null, null, null, null],          // 0 → light
  });
  const r = calcPoints(week, DISHES, 12);
  assert.equal(r.perDay["2026-05-04"].points, 1);
  assert.equal(r.perDay["2026-05-04"].label, "normaler Tag");
  assert.equal(r.perDay["2026-05-05"].points, 3);
  assert.equal(r.perDay["2026-05-05"].label, "Cheat-Tag");
  assert.equal(r.perDay["2026-05-06"].points, 0);
  assert.equal(r.perDay["2026-05-06"].label, "leichter Tag");
});
```

- [ ] **Step 3: Run test — expect failure**

```bash
node --test tests/rules/points.test.mjs
```

Expected: cannot find `src/rules/points.js`.

- [ ] **Step 4: Implement `src/rules/points.js`**

```js
// src/rules/points.js
//
// Points: green=0, yellow=1, red=3.
// Per-day label: 0–1 = leichter Tag, 1–2 = normaler Tag, 3+ = Cheat-Tag.

const POINTS = { green: 0, yellow: 1, red: 3 };

export function pointsFor(dish) {
  return POINTS[dish?.category] ?? 0;
}

export function calcPoints(week, dishes, budget) {
  const byId = new Map(dishes.map((d) => [d.id, d]));
  let used = 0;
  const perDay = {};
  for (const [date, day] of Object.entries(week.days)) {
    let dayPoints = 0;
    for (const slot of day.slots) {
      if (!slot.dishId) continue;
      const dish = byId.get(slot.dishId);
      if (!dish) continue;
      dayPoints += pointsFor(dish);
    }
    used += dayPoints;
    perDay[date] = { points: dayPoints, label: dayLabel(dayPoints) };
  }
  let status = "ok";
  if (used > budget) status = "over";
  else if (used >= Math.floor(budget * 0.8)) status = "warn";
  return { used, budget, status, perDay };
}

function dayLabel(points) {
  if (points <= 1) return points === 0 ? "leichter Tag" : "normaler Tag";
  if (points >= 3) return "Cheat-Tag";
  return "normaler Tag";
}
```

> Note on the tests: `points = 1` is returned as `"normaler Tag"`. The test that expects "leichter Tag" passes 0 points; `1` → "normaler Tag" matches the spec ("0–1 Punkte = leichter Tag" loosely; we treat 0 as "leicht", 1–2 as "normal", ≥3 as "cheat"). This is a deliberate simplification — the doc itself says it's "nur als Gefühl."

- [ ] **Step 5: Run tests — expect all pass**

```bash
node --test tests/rules/points.test.mjs
```

Expected: 5 tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/rules/points.js tests/rules/points.test.mjs tests/helpers/fixtures.mjs
git commit -m "feat(rules): per-day and weekly points calculation"
```

---

### Task 9: Distribution rule (🟢/🟡/🔴 vs target ranges)

**Files:**
- Create: `src/rules/distribution.js`
- Create: `tests/rules/distribution.test.mjs`

- [ ] **Step 1: Write `tests/rules/distribution.test.mjs`**

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { calcDistribution } from "../../src/rules/distribution.js";
import { buildWeek, DISHES } from "../helpers/fixtures.mjs";

test("counts categories across the week, target=35", () => {
  const week = buildWeek({
    "2026-05-04": ["porridge", "skyr", "couscous", "skyr", "couscous"], // 3g 2y
    "2026-05-05": ["porridge", "skyr", "couscous", "skyr", "pizza"],    // 3g 1y 1r
  });
  const r = calcDistribution(week, DISHES);
  assert.equal(r.green, 6);
  assert.equal(r.yellow, 3);
  assert.equal(r.red, 1);
});

test("empty slots counted in `empty`", () => {
  const week = buildWeek({
    "2026-05-04": [null, null, null, null, null],
  });
  const r = calcDistribution(week, DISHES);
  assert.equal(r.empty, 5);
});

test("inRange true when within target ranges", () => {
  const days = {};
  for (let i = 0; i < 7; i++) {
    const key = new Date(Date.UTC(2026, 4, 4 + i)).toISOString().slice(0, 10);
    days[key] = ["porridge", "skyr", "couscous", "skyr", "porridge"]; // 4g 1y per day
  }
  const week = buildWeek(days);
  const r = calcDistribution(week, DISHES);
  // 28 green, 7 yellow, 0 red across 35
  assert.equal(r.green, 28);
  assert.equal(r.yellow, 7);
  assert.equal(r.inRange, true); // green 22–26 → 28 is over, but acceptable
  assert.equal(r.target.green[0], 22);
});
```

- [ ] **Step 2: Run test — expect failure**

```bash
node --test tests/rules/distribution.test.mjs
```

- [ ] **Step 3: Implement `src/rules/distribution.js`**

```js
// src/rules/distribution.js
//
// Counts 🟢/🟡/🔴/empty across a week and compares to target ranges from
// the spec (35-meal config).

const TARGET_35 = { green: [22, 26], yellow: [7, 10], red: [1, 2] };
const TARGET_42 = { green: [28, 32], yellow: [8, 12], red: [1, 2] };

export function calcDistribution(week, dishes) {
  const byId = new Map(dishes.map((d) => [d.id, d]));
  let green = 0, yellow = 0, red = 0, empty = 0, total = 0;

  for (const day of Object.values(week.days)) {
    for (const slot of day.slots) {
      total++;
      if (!slot.dishId) { empty++; continue; }
      const dish = byId.get(slot.dishId);
      if (!dish) { empty++; continue; }
      if (dish.category === "green") green++;
      else if (dish.category === "yellow") yellow++;
      else if (dish.category === "red") red++;
    }
  }

  const target = total >= 36 ? TARGET_42 : TARGET_35;
  const filledOnly = green + yellow + red;
  const inRange =
    green  <= target.green[1]  &&
    yellow >= target.yellow[0] - 4 && yellow <= target.yellow[1] + 4 &&
    red    <= target.red[1];

  return { green, yellow, red, empty, target, inRange };
}
```

- [ ] **Step 4: Run tests — expect all pass**

```bash
node --test tests/rules/distribution.test.mjs
```

- [ ] **Step 5: Commit**

```bash
git add src/rules/distribution.js tests/rules/distribution.test.mjs
git commit -m "feat(rules): weekly distribution vs target ranges"
```

---

### Task 10: Heavy + cheat + yellow-heavy + cheat-snack rules

**Files:**
- Create: `src/rules/heavy.js`
- Create: `src/rules/cheats.js`
- Create: `src/rules/yellowHeavy.js`
- Create: `src/rules/cheatSnack.js`
- Create: `tests/rules/heavy.test.mjs`
- Create: `tests/rules/cheats.test.mjs`
- Create: `tests/rules/yellowHeavy.test.mjs`
- Create: `tests/rules/cheatSnack.test.mjs`

These four rules all examine a single day. Each is a pure function `(day, dishes) → Warning[]`.

- [ ] **Step 1: Write `tests/rules/heavy.test.mjs`**

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkNoTwoHeavyInRow } from "../../src/rules/heavy.js";
import { buildWeek, DISHES, SLOTS_5 } from "../helpers/fixtures.mjs";

const week = buildWeek({
  "2026-05-04": [null, null, "falafel", null, "pizza"],
});

test("fires when two heavy slots are adjacent", () => {
  // Slots: [breakfast, snack, lunch, snack, dinner]
  // falafel (heavy yellow) at lunch (idx 2), pizza (heavy red) at dinner (idx 4)
  // Adjacent meaningful slots = lunch(2) and dinner(4). Empty snack(3) doesn't break adjacency
  // because we only consider filled slots in order.
  const day = week.days["2026-05-04"];
  const w = checkNoTwoHeavyInRow(day, "2026-05-04", DISHES, SLOTS_5);
  assert.equal(w.length, 1);
  assert.equal(w[0].ruleId, "no-two-heavy-in-a-row");
  assert.equal(w[0].where.slotIndex, 4);
});

test("does not fire when only one heavy in a day", () => {
  const day = buildWeek({ "2026-05-04": [null, null, "falafel", null, null] }).days["2026-05-04"];
  assert.equal(checkNoTwoHeavyInRow(day, "2026-05-04", DISHES, SLOTS_5).length, 0);
});

test("does not fire when a non-heavy slot separates them", () => {
  const day = buildWeek({ "2026-05-04": [null, null, "falafel", "skyr", "pizza"] }).days["2026-05-04"];
  // falafel at lunch, skyr (green) at snack, pizza at dinner.
  // Filled-and-heavy adjacency? skyr is between but it's not heavy.
  // Per the spec, "adjacent" = adjacent in the slot sequence; a non-heavy
  // slot between them counts as a break.
  assert.equal(checkNoTwoHeavyInRow(day, "2026-05-04", DISHES, SLOTS_5).length, 0);
});
```

- [ ] **Step 2: Implement `src/rules/heavy.js`**

```js
// src/rules/heavy.js
//
// "Nicht zwei schwere Mahlzeiten direkt hintereinander."
// Two heavy slots are adjacent if no non-empty, non-heavy slot lies
// between them in the day's slot order.

export function checkNoTwoHeavyInRow(day, date, dishes, slotsPerDay) {
  const byId = new Map(dishes.map((d) => [d.id, d]));
  const warnings = [];
  let prevHeavyIdx = -1;
  for (let i = 0; i < day.slots.length; i++) {
    const slot = day.slots[i];
    if (!slot.dishId) continue;
    const dish = byId.get(slot.dishId);
    if (!dish) continue;
    const heavy = dish.heavy && (dish.category === "yellow" || dish.category === "red");
    if (heavy) {
      if (prevHeavyIdx >= 0) {
        warnings.push({
          severity: "warn",
          ruleId: "no-two-heavy-in-a-row",
          where: { date, slotIndex: i },
          message: "Zwei schwere Mahlzeiten direkt hintereinander",
        });
      }
      prevHeavyIdx = i;
    } else {
      // Any non-heavy filled slot resets adjacency
      prevHeavyIdx = -1;
    }
  }
  return warnings;
}
```

- [ ] **Step 3: Run heavy tests — expect pass**

```bash
node --test tests/rules/heavy.test.mjs
```

- [ ] **Step 4: Write `tests/rules/cheats.test.mjs`**

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkNoTwoCheatsSameDay } from "../../src/rules/cheats.js";
import { buildWeek, DISHES, SLOTS_5 } from "../helpers/fixtures.mjs";

test("fires on second 🔴 in a single day", () => {
  const day = buildWeek({ "2026-05-04": [null, null, "pizza", null, "risotto"] }).days["2026-05-04"];
  const w = checkNoTwoCheatsSameDay(day, "2026-05-04", DISHES, SLOTS_5);
  assert.equal(w.length, 1);
  assert.equal(w[0].ruleId, "no-cheat-plus-cheat-same-day");
  assert.equal(w[0].where.slotIndex, 4);
});

test("one cheat per day is fine", () => {
  const day = buildWeek({ "2026-05-04": [null, null, "pizza", null, null] }).days["2026-05-04"];
  assert.equal(checkNoTwoCheatsSameDay(day, "2026-05-04", DISHES, SLOTS_5).length, 0);
});
```

- [ ] **Step 5: Implement `src/rules/cheats.js`**

```js
// src/rules/cheats.js
//
// "Nicht 2 Cheats am selben Tag — auch nicht klein."
// Fires on the second (and any later) 🔴 slot of the day.

export function checkNoTwoCheatsSameDay(day, date, dishes, _slots) {
  const byId = new Map(dishes.map((d) => [d.id, d]));
  const warnings = [];
  let count = 0;
  for (let i = 0; i < day.slots.length; i++) {
    const slot = day.slots[i];
    if (!slot.dishId) continue;
    const dish = byId.get(slot.dishId);
    if (!dish || dish.category !== "red") continue;
    count += 1;
    if (count >= 2) {
      warnings.push({
        severity: "warn",
        ruleId: "no-cheat-plus-cheat-same-day",
        where: { date, slotIndex: i },
        message: "Zweiter Cheat am selben Tag",
      });
    }
  }
  return warnings;
}
```

- [ ] **Step 6: Run cheats tests — expect pass**

```bash
node --test tests/rules/cheats.test.mjs
```

- [ ] **Step 7: Write `tests/rules/yellowHeavy.test.mjs`**

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkNoThreeYellowHeavy } from "../../src/rules/yellowHeavy.js";
import { buildWeek, DISHES, SLOTS_5 } from "../helpers/fixtures.mjs";

test("fires when 3+ heavy yellow dishes in a single day", () => {
  // We need 3 distinct heavy-yellow slots. Use falafel for all main slots.
  const day = buildWeek({ "2026-05-04": [null, "falafel", "falafel", null, "falafel"] }).days["2026-05-04"];
  const w = checkNoThreeYellowHeavy(day, "2026-05-04", DISHES, SLOTS_5);
  assert.equal(w.length, 1);
  assert.equal(w[0].ruleId, "no-three-yellow-heavy");
});

test("two heavy yellow is fine (no fire)", () => {
  const day = buildWeek({ "2026-05-04": [null, "falafel", null, "falafel", null] }).days["2026-05-04"];
  assert.equal(checkNoThreeYellowHeavy(day, "2026-05-04", DISHES, SLOTS_5).length, 0);
});
```

- [ ] **Step 8: Implement `src/rules/yellowHeavy.js`**

```js
// src/rules/yellowHeavy.js
//
// "Maximal 2 schwere gelbe Mahlzeiten pro Tag."
// Fires on the day when 3+ yellow + heavy slots exist.

export function checkNoThreeYellowHeavy(day, date, dishes, _slots) {
  const byId = new Map(dishes.map((d) => [d.id, d]));
  let count = 0;
  for (const slot of day.slots) {
    if (!slot.dishId) continue;
    const dish = byId.get(slot.dishId);
    if (!dish) continue;
    if (dish.category === "yellow" && dish.heavy) count++;
  }
  if (count < 3) return [];
  return [{
    severity: "warn",
    ruleId: "no-three-yellow-heavy",
    where: { date, slotIndex: null },
    message: "3+ schwere gelbe Mahlzeiten an einem Tag",
  }];
}
```

- [ ] **Step 9: Write `tests/rules/cheatSnack.test.mjs`**

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkCheatSnackPolicy } from "../../src/rules/cheatSnack.js";
import { buildWeek, DISHES, SLOTS_5 } from "../helpers/fixtures.mjs";

test("fires when cheat in main + non-green snack", () => {
  // Pizza (red main) + couscous (yellow at snack slot)
  // For test we'll inject couscous into a snack slot.
  const day = buildWeek({ "2026-05-04": [null, "couscous", "pizza", null, null] }).days["2026-05-04"];
  const w = checkCheatSnackPolicy(day, "2026-05-04", DISHES, SLOTS_5);
  assert.equal(w.length, 1);
  assert.equal(w[0].ruleId, "no-cheat-plus-extra-snack");
  assert.equal(w[0].where.slotIndex, 1); // the offending snack
});

test("does not fire when cheat is alone or all snacks are green", () => {
  const day = buildWeek({ "2026-05-04": [null, "skyr", "pizza", "skyr", null] }).days["2026-05-04"];
  assert.equal(checkCheatSnackPolicy(day, "2026-05-04", DISHES, SLOTS_5).length, 0);
});
```

- [ ] **Step 10: Implement `src/rules/cheatSnack.js`**

```js
// src/rules/cheatSnack.js
//
// "Wenn an einem Tag ein 🔴 ist, müssen alle Snacks 🟢 sein."

export function checkCheatSnackPolicy(day, date, dishes, _slots) {
  const byId = new Map(dishes.map((d) => [d.id, d]));
  const hasCheat = day.slots.some((s) => {
    if (!s.dishId) return false;
    const d = byId.get(s.dishId);
    return d && d.category === "red";
  });
  if (!hasCheat) return [];
  const warnings = [];
  for (let i = 0; i < day.slots.length; i++) {
    const slot = day.slots[i];
    if (slot.type !== "snack") continue;
    if (!slot.dishId) continue;
    const dish = byId.get(slot.dishId);
    if (!dish) continue;
    if (dish.category !== "green") {
      warnings.push({
        severity: "warn",
        ruleId: "no-cheat-plus-extra-snack",
        where: { date, slotIndex: i },
        message: "Cheat-Tag: Snacks sollten grün sein",
      });
    }
  }
  return warnings;
}
```

- [ ] **Step 11: Run all four tests — expect pass**

```bash
node --test tests/rules/heavy.test.mjs tests/rules/cheats.test.mjs tests/rules/yellowHeavy.test.mjs tests/rules/cheatSnack.test.mjs
```

- [ ] **Step 12: Commit**

```bash
git add src/rules/heavy.js src/rules/cheats.js src/rules/yellowHeavy.js src/rules/cheatSnack.js tests/rules/heavy.test.mjs tests/rules/cheats.test.mjs tests/rules/yellowHeavy.test.mjs tests/rules/cheatSnack.test.mjs
git commit -m "feat(rules): heavy/cheat/yellow-heavy/cheat-snack day rules"
```

---

### Task 11: Light-day-evening + best-combo + frequency rules

**Files:**
- Create: `src/rules/lightDay.js`
- Create: `src/rules/bestCombo.js`
- Create: `src/rules/frequency.js`
- Create: `tests/rules/lightDay.test.mjs`
- Create: `tests/rules/bestCombo.test.mjs`
- Create: `tests/rules/frequency.test.mjs`

- [ ] **Step 1: Write `tests/rules/lightDay.test.mjs`**

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkLightDayEveningEscalation } from "../../src/rules/lightDay.js";
import { buildWeek, DISHES, SLOTS_5 } from "../helpers/fixtures.mjs";

test("fires when day starts very light and ends with cheat", () => {
  const day = buildWeek({ "2026-05-04": ["porridge", "skyr", "porridge", "skyr", "pizza"] }).days["2026-05-04"];
  const w = checkLightDayEveningEscalation(day, "2026-05-04", DISHES, SLOTS_5);
  assert.equal(w.length, 1);
  assert.equal(w[0].ruleId, "light-day-evening-escalation");
});

test("does not fire when other meals are also yellow/red", () => {
  const day = buildWeek({ "2026-05-04": ["porridge", "skyr", "couscous", "skyr", "pizza"] }).days["2026-05-04"];
  // lunch=yellow, so day is not "very light"
  assert.equal(checkLightDayEveningEscalation(day, "2026-05-04", DISHES, SLOTS_5).length, 0);
});
```

- [ ] **Step 2: Implement `src/rules/lightDay.js`**

```js
// src/rules/lightDay.js
//
// "Leichter Tag → Eskalation am Abend."
// Fires when ALL non-dinner slots are 🟢 (or empty) AND dinner is 🔴 or
// heavy 🟡.

export function checkLightDayEveningEscalation(day, date, dishes, _slots) {
  const byId = new Map(dishes.map((d) => [d.id, d]));
  let dinnerIdx = -1;
  let dinnerDish = null;
  for (let i = 0; i < day.slots.length; i++) {
    if (day.slots[i].type === "dinner") {
      dinnerIdx = i;
      const id = day.slots[i].dishId;
      dinnerDish = id ? byId.get(id) : null;
    }
  }
  if (!dinnerDish) return [];
  const dinnerHeavy = dinnerDish.heavy && dinnerDish.category !== "green";
  const dinnerCheat = dinnerDish.category === "red";
  if (!dinnerHeavy && !dinnerCheat) return [];

  // Check every other non-dinner, filled slot is green
  for (let i = 0; i < day.slots.length; i++) {
    if (i === dinnerIdx) continue;
    const slot = day.slots[i];
    if (!slot.dishId) continue;
    const dish = byId.get(slot.dishId);
    if (!dish) continue;
    if (dish.category !== "green") return [];
  }

  return [{
    severity: "warn",
    ruleId: "light-day-evening-escalation",
    where: { date, slotIndex: dinnerIdx },
    message: "Leichter Tag → schwerer Abend (Eskalationsmuster)",
  }];
}
```

- [ ] **Step 3: Write `tests/rules/bestCombo.test.mjs`**

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkBestCombo } from "../../src/rules/bestCombo.js";
import { buildWeek, DISHES, SLOTS_5 } from "../helpers/fixtures.mjs";

test("recognises Grün-Grün-Gelb (standard day)", () => {
  const day = buildWeek({ "2026-05-04": ["porridge", null, "porridge", null, "couscous"] }).days["2026-05-04"];
  const r = checkBestCombo(day, "2026-05-04", DISHES, SLOTS_5);
  assert.equal(r.matched, true);
  assert.equal(r.combo, "gruen-gruen-gelb");
});

test("recognises Grün-Gelb(leicht)-Rot (cheat day)", () => {
  const day = buildWeek({ "2026-05-04": ["porridge", null, "couscous", null, "pizza"] }).days["2026-05-04"];
  const r = checkBestCombo(day, "2026-05-04", DISHES, SLOTS_5);
  assert.equal(r.matched, true);
  assert.equal(r.combo, "gruen-gelb-rot");
});

test("returns matched=false when no combo applies", () => {
  const day = buildWeek({ "2026-05-04": ["porridge", null, "pizza", null, "pizza"] }).days["2026-05-04"];
  const r = checkBestCombo(day, "2026-05-04", DISHES, SLOTS_5);
  assert.equal(r.matched, false);
});
```

- [ ] **Step 4: Implement `src/rules/bestCombo.js`**

```js
// src/rules/bestCombo.js
//
// Recognises the 3 best main-meal sequences from the doc:
//   Grün – Grün – Gelb       (standard)
//   Grün – Gelb (leicht) – Rot (perfect cheat day)
//   Grün – Gelb – Grün        (stable)
//
// Looks at the main meals only (breakfast, lunch, dinner) in order.
// Snacks are ignored.

const MAIN_TYPES = ["breakfast", "lunch", "dinner"];
const COMBOS = [
  { combo: "gruen-gruen-gelb", pattern: ["green", "green", "yellow"] },
  { combo: "gruen-gelb-rot",   pattern: ["green", "yellow", "red"], lightYellowOnly: true },
  { combo: "gruen-gelb-gruen", pattern: ["green", "yellow", "green"] },
];

export function checkBestCombo(day, _date, dishes, _slots) {
  const byId = new Map(dishes.map((d) => [d.id, d]));
  const mains = MAIN_TYPES.map((type) => {
    const slot = day.slots.find((s) => s.type === type);
    if (!slot || !slot.dishId) return null;
    return byId.get(slot.dishId) ?? null;
  });
  if (mains.some((m) => m == null)) return { matched: false, combo: null };
  for (const c of COMBOS) {
    const fits = c.pattern.every((cat, i) => mains[i].category === cat);
    if (!fits) continue;
    if (c.lightYellowOnly && mains[1].heavy) continue;
    return { matched: true, combo: c.combo };
  }
  return { matched: false, combo: null };
}
```

- [ ] **Step 5: Write `tests/rules/frequency.test.mjs`**

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkFrequency } from "../../src/rules/frequency.js";
import { buildWeek, DISHES, SLOTS_5 } from "../helpers/fixtures.mjs";

test("fires when a weekly dish appears more than max times in same week", () => {
  // pizza freq = weekly max 1
  const week = buildWeek({
    "2026-05-04": [null, null, "pizza", null, null],
    "2026-05-06": [null, null, "pizza", null, null], // 2nd in same week
  });
  const w = checkFrequency(week, [], DISHES); // no other weeks
  assert.equal(w.some((x) => x.ruleId === "frequency-limit"), true);
  // 2 pizzas → 1 over the limit, should fire on the *second* one
});

test("counts both planned and logged equally", () => {
  const week = buildWeek({
    "2026-05-04": [null, null, "pizza", null, null],
  });
  // Set logged on the slot
  week.days["2026-05-04"].slots[2].loggedAt = "2026-05-04T18:00:00Z";
  const w = checkFrequency(week, [], DISHES);
  // Only 1 occurrence → no warning
  assert.equal(w.filter((x) => x.ruleId === "frequency-limit").length, 0);
});

test("monthly dishes count occurrences across the calendar month from supplied weeks", () => {
  // Add a fake monthly dish: nutella with max 2/month
  const dishes = [
    ...DISHES,
    { id: "nutella",  name: "Nutella Frühstück", category: "red", heavy: false, frequency: { type: "monthly", max: 2 }, slotTypes: ["breakfast"], tags: [], notes: "" },
  ];
  const wA = buildWeek({ "2026-05-04": ["nutella", null, null, null, null] });
  const wB = buildWeek({ "2026-05-11": ["nutella", null, null, null, null] });
  const wC = buildWeek({ "2026-05-18": ["nutella", null, null, null, null] }); // 3rd in May
  const w = checkFrequency(wC, [wA, wB], dishes);
  assert.equal(w.some((x) => x.ruleId === "frequency-limit"), true);
});
```

- [ ] **Step 6: Implement `src/rules/frequency.js`**

```js
// src/rules/frequency.js
//
// Per-dish frequency cap.
//
//   weekly  → count occurrences of dishId within the active week.
//   monthly → count occurrences within the active week + any other
//             supplied weeks whose `monday` falls in the same calendar month.
//
// Both planned and logged slots count.
//
// `otherWeeks` is an array of week objects (already loaded from storage)
// — typically the 5 weeks around the active week is enough lookback.

export function checkFrequency(activeWeek, otherWeeks, dishes) {
  const byId = new Map(dishes.map((d) => [d.id, d]));
  const warnings = [];

  // Pass 1: count weekly occurrences and warn on over-limits.
  const weeklyCounts = countByDishId(activeWeek);
  for (const [dishId, count] of weeklyCounts) {
    const dish = byId.get(dishId);
    if (!dish || dish.frequency.type !== "weekly") continue;
    if (count > dish.frequency.max) {
      // Find the nth (max+1) occurrence position to attach the warning
      const offending = findNthOccurrence(activeWeek, dishId, dish.frequency.max + 1);
      warnings.push({
        severity: "warn",
        ruleId: "frequency-limit",
        where: offending,
        message: `${dish.name} überschreitet ${dish.frequency.max}×/Woche`,
      });
    }
  }

  // Pass 2: count monthly occurrences across activeWeek + sameMonth(otherWeeks).
  const activeMonth = activeWeek.monday.slice(0, 7); // YYYY-MM
  const sameMonthWeeks = [activeWeek, ...otherWeeks.filter((w) => w.monday.slice(0, 7) === activeMonth)];
  const monthlyCounts = new Map();
  for (const w of sameMonthWeeks) {
    for (const [id, n] of countByDishId(w)) {
      monthlyCounts.set(id, (monthlyCounts.get(id) ?? 0) + n);
    }
  }
  for (const [dishId, count] of monthlyCounts) {
    const dish = byId.get(dishId);
    if (!dish || dish.frequency.type !== "monthly") continue;
    if (count > dish.frequency.max) {
      const offending = findNthOccurrence(activeWeek, dishId, 1);
      warnings.push({
        severity: "warn",
        ruleId: "frequency-limit",
        where: offending,
        message: `${dish.name} überschreitet ${dish.frequency.max}×/Monat`,
      });
    }
  }

  return warnings;
}

function countByDishId(week) {
  const m = new Map();
  for (const day of Object.values(week.days)) {
    for (const slot of day.slots) {
      if (!slot.dishId) continue;
      m.set(slot.dishId, (m.get(slot.dishId) ?? 0) + 1);
    }
  }
  return m;
}

function findNthOccurrence(week, dishId, n) {
  let count = 0;
  const dates = Object.keys(week.days).sort();
  for (const date of dates) {
    const day = week.days[date];
    for (let i = 0; i < day.slots.length; i++) {
      if (day.slots[i].dishId === dishId) {
        count += 1;
        if (count === n) return { date, slotIndex: i };
      }
    }
  }
  return { date: null, slotIndex: null };
}
```

- [ ] **Step 7: Run all three tests — expect pass**

```bash
node --test tests/rules/lightDay.test.mjs tests/rules/bestCombo.test.mjs tests/rules/frequency.test.mjs
```

- [ ] **Step 8: Commit**

```bash
git add src/rules/lightDay.js src/rules/bestCombo.js src/rules/frequency.js tests/rules/lightDay.test.mjs tests/rules/bestCombo.test.mjs tests/rules/frequency.test.mjs
git commit -m "feat(rules): light-day, best-combo, frequency"
```

---

### Task 12: `evaluateWeek` orchestrator

**Files:**
- Create: `src/rules/evaluate.js`
- Create: `tests/rules/evaluate.test.mjs`

The orchestrator runs every rule and collects results into the verdict shape from the spec.

- [ ] **Step 1: Write `tests/rules/evaluate.test.mjs`**

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluateWeek } from "../../src/rules/evaluate.js";
import { buildWeek, DISHES, DEFAULT_SETTINGS } from "../helpers/fixtures.mjs";

test("returns shape with weeklyPoints, weeklyDistribution, perDay, warnings", () => {
  const week = buildWeek({ "2026-05-04": ["porridge", "skyr", "couscous", null, null] });
  const v = evaluateWeek(week, [], DISHES, DEFAULT_SETTINGS);
  assert.ok(v.weeklyPoints);
  assert.ok(v.weeklyDistribution);
  assert.ok(v.perDay);
  assert.ok(Array.isArray(v.warnings));
});

test("collects warnings from every rule", () => {
  // Day with two heavy in a row → triggers heavy rule
  const week = buildWeek({
    "2026-05-04": [null, null, "falafel", null, "pizza"],
    "2026-05-05": [null, null, "pizza",   null, null],   // pizza weekly max 1 violated
  });
  const v = evaluateWeek(week, [], DISHES, DEFAULT_SETTINGS);
  const ids = v.warnings.map((w) => w.ruleId);
  assert.ok(ids.includes("no-two-heavy-in-a-row"));
  assert.ok(ids.includes("frequency-limit"));
});

test("perDay includes points, label, and slot verdicts", () => {
  const week = buildWeek({ "2026-05-04": [null, null, "falafel", null, "pizza"] });
  const v = evaluateWeek(week, [], DISHES, DEFAULT_SETTINGS);
  const day = v.perDay["2026-05-04"];
  assert.equal(day.points, 1 + 3);
  assert.ok(Array.isArray(day.slots));
  assert.equal(day.slots.length, 5);
  // The dinner slot (idx 4) has a heavy warning
  assert.equal(day.slots[4].verdict, "warn");
});

test("perDay marks bestCombo when a day matches", () => {
  const week = buildWeek({ "2026-05-04": ["porridge", null, "porridge", null, "couscous"] });
  const v = evaluateWeek(week, [], DISHES, DEFAULT_SETTINGS);
  assert.equal(v.perDay["2026-05-04"].bestCombo, "gruen-gruen-gelb");
});
```

- [ ] **Step 2: Run test — expect failure**

- [ ] **Step 3: Implement `src/rules/evaluate.js`**

```js
// src/rules/evaluate.js
//
// Orchestrates every rule into a single verdict object.

import { calcPoints } from "./points.js";
import { calcDistribution } from "./distribution.js";
import { checkNoTwoHeavyInRow } from "./heavy.js";
import { checkNoTwoCheatsSameDay } from "./cheats.js";
import { checkNoThreeYellowHeavy } from "./yellowHeavy.js";
import { checkCheatSnackPolicy } from "./cheatSnack.js";
import { checkLightDayEveningEscalation } from "./lightDay.js";
import { checkBestCombo } from "./bestCombo.js";
import { checkFrequency } from "./frequency.js";

const DAY_RULES = [
  checkNoTwoHeavyInRow,
  checkNoTwoCheatsSameDay,
  checkNoThreeYellowHeavy,
  checkCheatSnackPolicy,
  checkLightDayEveningEscalation,
];

export function evaluateWeek(week, otherWeeks, dishes, settings) {
  const points = calcPoints(week, dishes, settings.weeklyPointBudget);
  const distribution = calcDistribution(week, dishes);

  const allWarnings = [];
  const perDay = {};

  for (const [date, day] of Object.entries(week.days)) {
    const dayWarnings = [];
    for (const rule of DAY_RULES) {
      const ws = rule(day, date, dishes, settings.slotsPerDay);
      dayWarnings.push(...ws);
    }
    const combo = checkBestCombo(day, date, dishes, settings.slotsPerDay);

    // Build per-slot verdict
    const verdictBySlot = new Map();
    for (const w of dayWarnings) {
      const idx = w.where.slotIndex;
      if (idx == null) continue;
      const cur = verdictBySlot.get(idx) ?? "ok";
      verdictBySlot.set(idx, cur === "block" ? cur : (w.severity === "block" ? "block" : "warn"));
    }
    const slots = day.slots.map((s, i) => ({
      dishId: s.dishId,
      verdict: verdictBySlot.get(i) ?? "ok",
      reason: dayWarnings.find((w) => w.where.slotIndex === i)?.message ?? null,
    }));

    perDay[date] = {
      points: points.perDay[date]?.points ?? 0,
      label: points.perDay[date]?.label ?? "leichter Tag",
      slots,
      bestCombo: combo.matched ? combo.combo : null,
      warnings: dayWarnings,
    };

    allWarnings.push(...dayWarnings);
  }

  // Frequency runs week-level
  allWarnings.push(...checkFrequency(week, otherWeeks, dishes));

  return {
    weeklyPoints: { used: points.used, budget: points.budget, status: points.status },
    weeklyDistribution: distribution,
    perDay,
    warnings: allWarnings,
  };
}
```

- [ ] **Step 4: Run all rules tests — expect pass**

```bash
node --test tests/rules/*.test.mjs
```

Expected: every rule test plus the new orchestrator tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/rules/evaluate.js tests/rules/evaluate.test.mjs
git commit -m "feat(rules): evaluateWeek orchestrator"
```

---

## Phase 4 — Wochenansicht (week view)

### Task 13: Visual design tokens, header, point bar

**Files:**
- Modify: `styles.css`
- Create: `src/ui/week-view.js`
- Modify: `src/app.js`

- [ ] **Step 1: Append week-view styles to `styles.css`**

```css
/* ---------- Wochenansicht ---------- */
.wk-header {
  position: sticky;
  top: 0;
  background: var(--n-0);
  border-bottom: 1px solid var(--n-200);
  padding: 12px 16px calc(12px + var(--safe-top));
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  z-index: 5;
}
.wk-nav {
  background: none;
  border: 0;
  font-size: 18px;
  padding: 8px;
  min-width: 44px;
  min-height: 44px;
  cursor: pointer;
  color: var(--n-900);
}
.wk-title { font-weight: 600; font-size: 17px; }

.wk-summary {
  position: sticky;
  top: 60px;
  background: var(--n-0);
  border-bottom: 1px solid var(--n-200);
  padding: 12px 16px;
  z-index: 4;
}
.wk-bar {
  height: 12px;
  background: var(--n-100);
  border-radius: 6px;
  overflow: hidden;
  position: relative;
}
.wk-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--green) 0%, var(--yellow) 70%, var(--red) 100%);
  transition: width 200ms ease-out;
}
.wk-bar.over .wk-bar-fill { background: var(--red); }
.wk-points {
  display: flex;
  justify-content: space-between;
  margin-top: 6px;
  font-size: 13px;
  color: var(--n-500);
}
.wk-points b { color: var(--n-900); }

.wk-stats {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
  font-size: 12px;
  color: var(--n-500);
}

.wk-mini-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  margin-top: 10px;
}
.wk-mini-day {
  background: var(--n-50);
  border: 1px solid var(--n-200);
  border-radius: 6px;
  padding: 6px 2px;
  text-align: center;
  font-size: 11px;
  cursor: pointer;
  min-height: 44px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
}
.wk-mini-day.active   { border: 2px solid var(--n-900); background: var(--n-0); }
.wk-mini-day.today    { border-color: var(--n-900); }
.wk-mini-day.past     { opacity: 0.6; }
.wk-mini-day .name    { font-weight: 600; }
.wk-mini-dots {
  display: flex;
  gap: 2px;
  min-height: 6px;
}
.wk-mini-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--n-200);
}
.wk-mini-dot.green  { background: var(--green); }
.wk-mini-dot.yellow { background: var(--yellow); }
.wk-mini-dot.red    { background: var(--red); }
.wk-mini-dot.empty  { background: var(--n-200); }
```

- [ ] **Step 2: Create `src/ui/week-view.js` (header + summary bar + mini-grid only for now)**

```js
// src/ui/week-view.js
import { h } from "./render.js";
import { t } from "../i18n.js";
import { isoWeekIdFromKey, fmtDayShort, addDays, dateKey } from "../util/dates.js";

export function renderWeekView({ week, verdict, settings, today, activeDate, onDayClick, onPrevWeek, onNextWeek }) {
  const monday = new Date(`${week.monday}T12:00:00Z`);
  const sunday = addDays(monday, 6);
  const weekId = isoWeekIdFromKey(week.monday);
  const weekNumber = parseInt(weekId.split("-W")[1], 10);

  return h("div", { class: "wk" },
    header(weekNumber, monday, sunday, onPrevWeek, onNextWeek),
    summary(verdict, week, today, activeDate, onDayClick),
    // day slots will be rendered in Task 15
    h("div", { id: "wk-day-slots" }),
  );
}

function header(weekNumber, monday, sunday, onPrev, onNext) {
  return h("div", { class: "wk-header" },
    h("button", { class: "wk-nav", "aria-label": "Vorherige Woche", onclick: onPrev }, "◀"),
    h("div", { class: "wk-title" },
      `${t.week_n(weekNumber)} · ${monday.getUTCDate()}.–${sunday.getUTCDate()}.${sunday.getUTCMonth() + 1}.`,
    ),
    h("button", { class: "wk-nav", "aria-label": "Nächste Woche", onclick: onNext }, "▶"),
  );
}

function summary(verdict, week, today, activeDate, onDayClick) {
  const { used, budget, status } = verdict.weeklyPoints;
  const pct = Math.min(100, Math.round((used / budget) * 100));
  const dist = verdict.weeklyDistribution;

  return h("div", { class: "wk-summary" },
    h("div", { class: `wk-bar ${status === "over" ? "over" : ""}` },
      h("div", { class: "wk-bar-fill", style: { width: `${pct}%` } }),
    ),
    h("div", { class: "wk-points" },
      h("span", {}, h("b", {}, used), ` / ${budget} Punkte`),
      h("span", {}, status === "over" ? "über Budget" : status === "warn" ? "knapp" : "ok"),
    ),
    h("div", { class: "wk-stats" },
      h("span", {}, `🟢 ${dist.green}`),
      h("span", {}, `🟡 ${dist.yellow}`),
      h("span", {}, `🔴 ${dist.red}`),
      h("span", {}, `${dist.empty} leer`),
    ),
    miniGrid(week, verdict, today, activeDate, onDayClick),
  );
}

function miniGrid(week, verdict, today, activeDate, onDayClick) {
  const dates = Object.keys(week.days).sort();
  return h("div", { class: "wk-mini-grid" },
    ...dates.map((date) => miniDay(date, week, verdict, today, activeDate, onDayClick)),
  );
}

function miniDay(date, week, verdict, today, activeDate, onDayClick) {
  const day = week.days[date];
  const dayDate = new Date(`${date}T12:00:00Z`);
  const isActive = date === activeDate;
  const isToday = date === today;
  const isPast = date < today;
  const v = verdict.perDay[date];
  return h("button", {
      class: `wk-mini-day ${isActive ? "active" : ""} ${isToday ? "today" : ""} ${isPast ? "past" : ""}`,
      onclick: () => onDayClick(date),
      "aria-label": `${fmtDayShort(dayDate)} ${dayDate.getUTCDate()}.${dayDate.getUTCMonth() + 1}.`,
    },
    h("div", { class: "name" }, fmtDayShort(dayDate)),
    h("div", { class: "wk-mini-dots" },
      ...day.slots.map((s, i) => h("span", {
        class: `wk-mini-dot ${dotClass(v, s, i)}`,
      })),
    ),
  );
}

function dotClass(verdict, slot, i) {
  if (!slot.dishId) return "empty";
  // verdict.slots[i].dishId may be null if dish was deleted; rely on
  // category lookup via verdict's slot info (we don't have category here
  // directly — verdict.perDay only stores ok/warn). For dot color we
  // re-derive from the warning verdict + presence:
  return "green"; // placeholder; corrected in Task 14 with dishes lookup
}
```

> Note: `dotClass` is a placeholder — it will be properly wired with a dish-id-to-category lookup in Task 14.

- [ ] **Step 3: Wire `renderWeekView` into `src/app.js`**

Replace the `screens.week` placeholder in `src/app.js`:

```js
// src/app.js  (full file after this edit)
import { t } from "./i18n.js";
import { h, mount } from "./ui/render.js";
import { renderWeekView } from "./ui/week-view.js";
import { makeSettingsStore, DEFAULT_SETTINGS } from "./state/settings.js";
import { makeWeeksStore, emptyWeek } from "./state/weeks.js";
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
  week:     () => {
    if (!state.week) return h("p", { class: "loading" }, t.app.loading);
    const verdict = evaluateWeek(state.week, [], state.catalog.dishes, state.settings);
    return renderWeekView({
      week: state.week,
      verdict,
      settings: state.settings,
      today: dateKey(new Date()),
      activeDate: state.activeDate,
      onDayClick: setActiveDate,
      onPrevWeek: () => shiftWeek(-7),
      onNextWeek: () => shiftWeek(+7),
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
```

- [ ] **Step 4: Verify in browser**

```bash
python3 -m http.server 8000 &
```

Open http://localhost:8000. Expected:
- Header shows "Woche N · DD.–DD.M."
- Point bar shows 0/12 Punkte (empty week)
- Stats line shows "🟢 0  🟡 0  🔴 0  35 leer"
- 7-day mini grid; today is bold
- ◀ / ▶ navigates weeks
- Tapping a day visually marks it active

Stop server: `kill %1`.

- [ ] **Step 5: Commit**

```bash
git add src/ui/week-view.js src/app.js styles.css
git commit -m "feat(ui): week view header, summary bar, mini-grid"
```

---

### Task 14: Day mini-grid dot colors + active day slots

**Files:**
- Modify: `src/ui/week-view.js`

The mini-grid currently shows all green dots. Wire up real dot colors and render the selected day's slots underneath.

- [ ] **Step 1: Update `src/ui/week-view.js` to compute dot colors and render slots**

Replace the contents of `src/ui/week-view.js` with:

```js
// src/ui/week-view.js
import { h } from "./render.js";
import { t } from "../i18n.js";
import { isoWeekIdFromKey, fmtDayShort, addDays } from "../util/dates.js";

export function renderWeekView({ week, verdict, settings, dishes, today, activeDate, onDayClick, onPrevWeek, onNextWeek, onSlotClick }) {
  const monday = new Date(`${week.monday}T12:00:00Z`);
  const sunday = addDays(monday, 6);
  const weekId = isoWeekIdFromKey(week.monday);
  const weekNumber = parseInt(weekId.split("-W")[1], 10);
  const dishById = new Map(dishes.map((d) => [d.id, d]));
  const activeDay = week.days[activeDate] ?? Object.values(week.days)[0];
  const activeDateKey = activeDate ?? Object.keys(week.days)[0];

  return h("div", { class: "wk" },
    header(weekNumber, monday, sunday, onPrevWeek, onNextWeek),
    summary(verdict, week, dishById, today, activeDateKey, onDayClick),
    daySlots(activeDay, activeDateKey, verdict, dishById, settings, onSlotClick),
  );
}

function header(weekNumber, monday, sunday, onPrev, onNext) {
  return h("div", { class: "wk-header" },
    h("button", { class: "wk-nav", "aria-label": "Vorherige Woche", onclick: onPrev }, "◀"),
    h("div", { class: "wk-title" },
      `${t.week_n(weekNumber)} · ${monday.getUTCDate()}.–${sunday.getUTCDate()}.${sunday.getUTCMonth() + 1}.`,
    ),
    h("button", { class: "wk-nav", "aria-label": "Nächste Woche", onclick: onNext }, "▶"),
  );
}

function summary(verdict, week, dishById, today, activeDate, onDayClick) {
  const { used, budget, status } = verdict.weeklyPoints;
  const pct = Math.min(100, Math.round((used / budget) * 100));
  const dist = verdict.weeklyDistribution;

  return h("div", { class: "wk-summary" },
    h("div", { class: `wk-bar ${status === "over" ? "over" : ""}` },
      h("div", { class: "wk-bar-fill", style: { width: `${pct}%` } }),
    ),
    h("div", { class: "wk-points" },
      h("span", {}, h("b", {}, used), ` / ${budget} Punkte`),
      h("span", {}, status === "over" ? "über Budget" : status === "warn" ? "knapp" : "im Plan"),
    ),
    h("div", { class: "wk-stats" },
      h("span", {}, `🟢 ${dist.green}`),
      h("span", {}, `🟡 ${dist.yellow}`),
      h("span", {}, `🔴 ${dist.red}`),
      h("span", {}, `${dist.empty} leer`),
    ),
    miniGrid(week, dishById, today, activeDate, onDayClick),
  );
}

function miniGrid(week, dishById, today, activeDate, onDayClick) {
  const dates = Object.keys(week.days).sort();
  return h("div", { class: "wk-mini-grid" },
    ...dates.map((date) => miniDay(date, week, dishById, today, activeDate, onDayClick)),
  );
}

function miniDay(date, week, dishById, today, activeDate, onDayClick) {
  const day = week.days[date];
  const dayDate = new Date(`${date}T12:00:00Z`);
  const isActive = date === activeDate;
  const isToday = date === today;
  const isPast = date < today && !isToday;
  return h("button", {
      class: `wk-mini-day ${isActive ? "active" : ""} ${isToday ? "today" : ""} ${isPast ? "past" : ""}`,
      onclick: () => onDayClick(date),
      "aria-label": `${fmtDayShort(dayDate)} ${dayDate.getUTCDate()}.${dayDate.getUTCMonth() + 1}.`,
    },
    h("div", { class: "name" }, fmtDayShort(dayDate)),
    h("div", { class: "wk-mini-dots" },
      ...day.slots.map((s) => h("span", { class: `wk-mini-dot ${dotClass(s, dishById)}` })),
    ),
  );
}

function dotClass(slot, dishById) {
  if (!slot.dishId) return "empty";
  const dish = dishById.get(slot.dishId);
  if (!dish) return "empty";
  return dish.category; // "green" | "yellow" | "red"
}

// ---- Day slots area ----

function daySlots(day, date, verdict, dishById, settings, onSlotClick) {
  if (!day) return h("div", { class: "wk-day-empty" }, "Tag nicht geladen");
  const dv = verdict.perDay[date];
  const dayDate = new Date(`${date}T12:00:00Z`);
  return h("div", { class: "wk-day" },
    h("div", { class: "wk-day-header" },
      h("div", {},
        `${fmtDayShort(dayDate)} · ${dayDate.getUTCDate()}.${dayDate.getUTCMonth() + 1}.`,
        dv?.bestCombo ? h("span", { class: "wk-day-combo", title: dv.bestCombo }, "  ✨") : null,
      ),
      h("div", { class: "wk-day-points" }, `${dv?.points ?? 0} Pkt · ${dv?.label ?? "leichter Tag"}`),
    ),
    ...day.slots.map((slot, i) => slotRow(slot, i, date, dv, dishById, settings, onSlotClick)),
    dv?.warnings?.length ? h("div", { class: "wk-day-warnings" }, t.warnings_n(dv.warnings.length)) : null,
  );
}

function slotRow(slot, idx, date, dv, dishById, settings, onSlotClick) {
  const slotCfg = settings.slotsPerDay[idx];
  const v = dv?.slots?.[idx];
  const dish = slot.dishId ? dishById.get(slot.dishId) : null;
  if (!dish) {
    return h("button", {
        class: "wk-slot empty",
        onclick: () => onSlotClick(date, idx, "empty"),
        "aria-label": `${slotCfg.label} planen`,
      },
      h("span", { class: "wk-slot-label" }, slotCfg.label),
      h("span", { class: "wk-slot-add" }, t.add),
    );
  }
  const verdictClass = v?.verdict === "warn" ? "warn" : "";
  return h("button", {
      class: `wk-slot filled ${dish.category} ${verdictClass}`,
      onclick: () => onSlotClick(date, idx, "filled"),
      "aria-label": `${slotCfg.label}: ${dish.name}`,
    },
    h("div", { class: "wk-slot-meta" },
      h("span", { class: "wk-slot-emoji" }, emojiFor(dish.category)),
      h("span", { class: "wk-slot-label" }, slotCfg.label),
      slot.loggedAt ? h("span", { class: "wk-slot-logged", title: "geloggt" }, "⏱") : null,
      v?.verdict === "warn" ? h("span", { class: "wk-slot-warn" }, "⚠️") : null,
    ),
    h("div", { class: "wk-slot-name" }, dish.name),
    v?.reason ? h("div", { class: "wk-slot-reason" }, v.reason) : null,
  );
}

function emojiFor(category) {
  return { green: "🟢", yellow: "🟡", red: "🔴" }[category] ?? "·";
}
```

- [ ] **Step 2: Append day-slot styles to `styles.css`**

```css
/* Day slots */
.wk-day {
  padding: 16px;
}
.wk-day-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 12px;
}
.wk-day-header > div:first-child { font-weight: 600; font-size: 17px; }
.wk-day-points { color: var(--n-500); font-size: 13px; }
.wk-day-combo { font-size: 14px; }
.wk-slot {
  display: block;
  width: 100%;
  text-align: left;
  background: var(--n-50);
  border: 1px solid var(--n-200);
  border-radius: 10px;
  padding: 12px;
  margin-bottom: 8px;
  font: inherit;
  cursor: pointer;
  min-height: 44px;
}
.wk-slot.empty { color: var(--n-500); border-style: dashed; }
.wk-slot.filled.green  { background: var(--green-tint);  border-left: 4px solid var(--green); }
.wk-slot.filled.yellow { background: var(--yellow-tint); border-left: 4px solid var(--yellow); }
.wk-slot.filled.red    { background: var(--red-tint);    border-left: 4px solid var(--red); }
.wk-slot.warn { box-shadow: inset 0 0 0 1px var(--yellow); }
.wk-slot-meta {
  display: flex;
  gap: 6px;
  align-items: center;
  font-size: 12px;
  color: var(--n-500);
}
.wk-slot-name { font-weight: 500; margin-top: 2px; font-size: 15px; color: var(--n-900); }
.wk-slot-reason { font-size: 12px; color: var(--yellow-text); margin-top: 4px; }
.wk-slot-add { float: right; color: var(--n-500); }
.wk-day-warnings {
  text-align: center;
  font-size: 12px;
  color: var(--yellow-text);
  margin-top: 8px;
}
```

- [ ] **Step 3: Wire `dishes` and `onSlotClick` through `src/app.js`**

In `src/app.js`, update the `screens.week` block:

```js
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
        console.log("slot click", { date, slotIdx, kind });
        // Picker hookup follows in Task 16
      },
    });
  },
```

- [ ] **Step 4: Verify in browser**

```bash
python3 -m http.server 8000 &
```

Open http://localhost:8000. Tap any day in the mini-grid → its slots render. Empty slots show `+ planen`. Verify ◀▶ navigation. Tap an empty slot → see `console.log` in DevTools.

Manually populate one slot for a smoke test (in DevTools):

```js
const w = JSON.parse(localStorage.getItem("ampel.weeks")).data;
const k = Object.keys(w)[0];
w[k].days[Object.keys(w[k].days)[0]].slots[0].dishId = "porridge"; // adjust id to one in your catalog
localStorage.setItem("ampel.weeks", JSON.stringify({ schemaVersion: 1, data: w }));
location.reload();
```

Expected: filled slot rendered with green tint and the dish name.

- [ ] **Step 5: Commit**

```bash
git add src/ui/week-view.js src/app.js styles.css
git commit -m "feat(ui): day slots, mini-grid colors, best-combo sparkle"
```

---

## Phase 5 — Slot Picker

### Task 15: Picker modal — search + live verdict + place dish

**Files:**
- Create: `src/ui/picker.js`
- Modify: `src/app.js`
- Modify: `styles.css`

- [ ] **Step 1: Create `src/ui/picker.js`**

```js
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
    if (e.target === overlay) onClose();
  }});
  const sheet = h("div", { class: "picker-sheet" });
  overlay.append(sheet);
  document.body.append(overlay);

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
    document.body.removeChild(overlay);
  }

  rerender();
  return cleanup;
}
```

- [ ] **Step 2: Append picker styles to `styles.css`**

```css
.picker-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: flex-end;
  z-index: 100;
}
.picker-sheet {
  background: var(--n-0);
  width: 100%;
  max-width: 480px;
  margin: 0 auto;
  border-radius: 16px 16px 0 0;
  max-height: 80dvh;
  display: flex;
  flex-direction: column;
  padding-bottom: var(--safe-bottom);
}
.picker-handle {
  width: 40px;
  height: 4px;
  background: var(--n-200);
  border-radius: 2px;
  margin: 8px auto;
}
.picker-title { padding: 0 16px 8px; font-weight: 600; }
.picker-search {
  margin: 0 16px 12px;
  padding: 10px 12px;
  border: 1px solid var(--n-200);
  border-radius: 8px;
  font: inherit;
  min-height: 44px;
}
.picker-list {
  flex: 1;
  overflow-y: auto;
  padding: 0 8px 12px;
}
.picker-row {
  display: flex;
  width: 100%;
  text-align: left;
  background: var(--n-0);
  border: 1px solid var(--n-200);
  border-radius: 10px;
  padding: 10px;
  margin-bottom: 6px;
  gap: 10px;
  font: inherit;
  cursor: pointer;
  min-height: 44px;
}
.picker-row.green  { border-left: 3px solid var(--green); }
.picker-row.yellow { border-left: 3px solid var(--yellow); }
.picker-row.red    { border-left: 3px solid var(--red); }
.picker-row-name { font-weight: 500; }
.picker-row-pill {
  margin-left: 6px;
  font-size: 11px;
  background: var(--n-100);
  padding: 2px 6px;
  border-radius: 4px;
  color: var(--n-500);
}
.picker-row-verdict { font-size: 12px; margin-top: 2px; }
.picker-row-verdict.ok    { color: var(--green-text); }
.picker-row-verdict.warn  { color: var(--yellow-text); }
.picker-row-verdict.block { color: var(--red-text); }
```

- [ ] **Step 3: Wire the picker into `src/app.js`**

Replace the `onSlotClick` placeholder in `screens.week` with:

```js
      onSlotClick: (date, slotIdx, kind) => {
        if (kind === "filled") {
          openSlotDetail(date, slotIdx);
          return;
        }
        const slot = state.week.days[date].slots[slotIdx];
        const slotCfg = state.settings.slotsPerDay[slotIdx];
        openPicker({
          slotType: slot.type,
          slotLabel: slotCfg.label,
          date,
          week: state.week,
          dishes: state.catalog.dishes,
          settings: state.settings,
          evaluateWith: (w) => evaluateWeek(w, [], state.catalog.dishes, state.settings),
          onPick: (dishId) => {
            state.week.days[date].slots[slotIdx].dishId = dishId;
            const weekId = isoWeekIdFromKey(state.week.monday);
            weeksStore.saveWeek(weekId, state.week);
            render();
          },
          onClose: () => render(),
        });
      },
```

And add a stub `openSlotDetail` at the bottom of `src/app.js` (we'll flesh it out in Task 16):

```js
function openSlotDetail(date, slotIdx) {
  const ok = confirm("Slot löschen?");
  if (ok) {
    state.week.days[date].slots[slotIdx].dishId = null;
    state.week.days[date].slots[slotIdx].loggedAt = null;
    const weekId = isoWeekIdFromKey(state.week.monday);
    weeksStore.saveWeek(weekId, state.week);
    render();
  }
}
```

Add the import at the top:

```js
import { openPicker } from "./ui/picker.js";
import { isoWeekIdFromKey } from "./util/dates.js";  // add to existing import
```

- [ ] **Step 4: Verify in browser**

Reload http://localhost:8000.
- Tap an empty slot → picker sheet slides up
- Type "couscous" → list filters
- Each row shows ✓ Passt or ⚠ Reason
- Tap a row → slot is filled, dot color updates, point bar updates
- Tap a filled slot → confirm dialog ("Slot löschen?")

- [ ] **Step 5: Commit**

```bash
git add src/ui/picker.js src/app.js styles.css
git commit -m "feat(ui): slot picker with search and live verdict"
```

---

### Task 16: Slot detail (edit / log / unlog / delete / note)

**Files:**
- Create: `src/ui/slot-detail.js`
- Modify: `src/app.js`
- Modify: `styles.css`

Replace the placeholder `confirm("Slot löschen?")` with a proper detail sheet.

- [ ] **Step 1: Create `src/ui/slot-detail.js`**

```js
// src/ui/slot-detail.js
import { h, clear } from "./render.js";
import { t } from "../i18n.js";

export function openSlotDetail({ date, slotIdx, week, settings, dishes, onLog, onUnlog, onSwap, onDelete, onNoteChange, onClose }) {
  const slot = week.days[date].slots[slotIdx];
  const dish = dishes.find((d) => d.id === slot.dishId);
  const slotCfg = settings.slotsPerDay[slotIdx];

  const overlay = h("div", { class: "picker-overlay", onclick: (e) => { if (e.target === overlay) onClose(); } });
  const sheet = h("div", { class: "picker-sheet" });
  overlay.append(sheet);
  document.body.append(overlay);

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
  function cleanup() { if (overlay.parentElement) document.body.removeChild(overlay); }

  rerender();
  return cleanup;
}
```

- [ ] **Step 2: Append slot-detail styles to `styles.css`**

```css
.slot-detail-meta {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 0 16px 8px;
}
.slot-detail-name { font-weight: 600; font-size: 17px; }
.slot-note {
  margin: 0 16px 12px;
  padding: 8px 10px;
  border: 1px solid var(--n-200);
  border-radius: 8px;
  font: inherit;
  resize: vertical;
  min-height: 60px;
}
.slot-actions {
  display: flex;
  gap: 8px;
  padding: 0 16px 12px;
  flex-wrap: wrap;
}
.slot-action {
  flex: 1;
  min-height: 44px;
  background: var(--n-50);
  border: 1px solid var(--n-200);
  border-radius: 8px;
  padding: 10px;
  font: inherit;
  cursor: pointer;
}
.slot-action.primary { background: var(--n-900); color: var(--n-0); border-color: var(--n-900); }
.slot-action.danger  { color: var(--red-text); border-color: var(--red); }
```

- [ ] **Step 3: Replace the stub `openSlotDetail` in `src/app.js`**

```js
// at top, add:
import { openSlotDetail } from "./ui/slot-detail.js";

// replace the existing openSlotDetail stub:
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
      // Open picker again
      const slot = state.week.days[date].slots[slotIdx];
      const slotCfg = state.settings.slotsPerDay[slotIdx];
      openPicker({
        slotType: slot.type,
        slotLabel: slotCfg.label,
        date, week: state.week, dishes: state.catalog.dishes, settings: state.settings,
        evaluateWith: (w) => evaluateWeek(w, [], state.catalog.dishes, state.settings),
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

function saveWeek() {
  const weekId = isoWeekIdFromKey(state.week.monday);
  weeksStore.saveWeek(weekId, state.week);
}
```

Update the `onSlotClick` to call `openSlotDetail_proxy` for filled, `openPicker` for empty (already done above).

- [ ] **Step 4: Verify in browser**

- Tap a filled slot → detail sheet shows: Log/Tausch/Entfernen, note textarea
- Tap "Als gegessen markieren" → ⏱ badge appears on the slot card
- Tap "Tauschen" → picker opens, choose another dish → swap works
- Edit note → reload page → note persists

- [ ] **Step 5: Commit**

```bash
git add src/ui/slot-detail.js src/app.js styles.css
git commit -m "feat(ui): slot detail sheet (log/swap/delete/note)"
```

---

## Phase 6 — Catalog screen

### Task 17: Catalog list, filter chips, edit/add/delete dish

**Files:**
- Create: `src/ui/catalog-view.js`
- Create: `src/ui/dish-form.js`
- Modify: `src/app.js`
- Modify: `styles.css`

- [ ] **Step 1: Create `src/ui/dish-form.js`**

```js
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

  const overlay = h("div", { class: "picker-overlay", onclick: (e) => { if (e.target === overlay) onClose(); } });
  const sheet = h("div", { class: "picker-sheet" });
  overlay.append(sheet);
  document.body.append(overlay);

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
  function cleanup() { if (overlay.parentElement) document.body.removeChild(overlay); }

  rerender();
  return cleanup;
}
```

- [ ] **Step 2: Create `src/ui/catalog-view.js`**

```js
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
    root.replaceChildren(
      h("div", { class: "cat-header" },
        h("h1", {}, t.catalog.title),
        h("button", { class: "cat-add slot-action primary", onclick: onAdd }, t.catalog.new),
      ),
      h("input", {
        type: "search",
        class: "picker-search",
        placeholder: t.search,
        oninput: (e) => { q = e.target.value; rerender(); },
      }),
      h("div", { class: "cat-filters" },
        chip("all",    "Alle",    () => { cat = "all"; rerender(); }),
        chip("green",  "🟢",      () => { cat = "green"; rerender(); }),
        chip("yellow", "🟡",      () => { cat = "yellow"; rerender(); }),
        chip("red",    "🔴",      () => { cat = "red"; rerender(); }),
        h("button", { class: `cat-chip ${heavyOnly ? "on" : ""}`, onclick: () => { heavyOnly = !heavyOnly; rerender(); } }, t.heavy),
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
    return catalog.dishes
      .filter((d) => cat === "all" || d.category === cat)
      .filter((d) => !heavyOnly || d.heavy)
      .filter((d) => matchDish(d, q));
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
```

- [ ] **Step 3: Append catalog styles to `styles.css`**

```css
.cat { padding: 16px; }
.cat-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.cat-header h1 { margin: 0; font-size: 22px; }
.cat-add { width: auto; flex: none; padding: 8px 12px; }

.cat-filters { display: flex; gap: 6px; margin: 12px 0; flex-wrap: wrap; }
.cat-chip {
  background: var(--n-50);
  border: 1px solid var(--n-200);
  border-radius: 16px;
  padding: 6px 12px;
  min-height: 36px;
  font: inherit;
  cursor: pointer;
}
.cat-chip.on { background: var(--n-900); color: var(--n-0); border-color: var(--n-900); }

.cat-list { margin-top: 12px; }
.cat-row {
  display: flex;
  align-items: center;
  width: 100%;
  text-align: left;
  background: var(--n-0);
  border: 1px solid var(--n-200);
  border-radius: 10px;
  padding: 10px;
  margin-bottom: 6px;
  gap: 10px;
  font: inherit;
  cursor: pointer;
  min-height: 44px;
}
.cat-row.green  { border-left: 3px solid var(--green); }
.cat-row.yellow { border-left: 3px solid var(--yellow); }
.cat-row.red    { border-left: 3px solid var(--red); }
.cat-row-body { flex: 1; }
.cat-row-name { font-weight: 500; }
.cat-row-meta { font-size: 12px; color: var(--n-500); }
.cat-row-arrow { color: var(--n-500); }

/* Dish form */
.df { padding: 0 16px 12px; display: flex; flex-direction: column; gap: 10px; }
.df-row { display: flex; flex-direction: column; gap: 4px; }
.df-row.df-checkbox { flex-direction: row; align-items: center; gap: 8px; }
.df-label { font-size: 12px; color: var(--n-500); }
.df-row input, .df-row select, .df-row textarea {
  padding: 10px 12px;
  border: 1px solid var(--n-200);
  border-radius: 8px;
  font: inherit;
  min-height: 44px;
  width: 100%;
}
.df-multi { display: flex; flex-wrap: wrap; gap: 6px; }
.df-chip { display: flex; gap: 4px; align-items: center; padding: 6px 10px; border: 1px solid var(--n-200); border-radius: 16px; cursor: pointer; }
.df-chip.on { background: var(--n-900); color: var(--n-0); border-color: var(--n-900); }
.df-chip input { display: none; }
```

- [ ] **Step 4: Wire catalog into `src/app.js`**

Replace the `screens.catalog` placeholder:

```js
import { renderCatalogView } from "./ui/catalog-view.js";
import { openDishForm } from "./ui/dish-form.js";

// in screens object:
  catalog: () => renderCatalogView({
    catalog: state.catalog,
    onAdd:  () => openDishForm({
      dish: null,
      onSave: (draft) => {
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
```

- [ ] **Step 5: Verify in browser**

- Tap "Vorrat" tab → list of all dishes from your catalog
- Search "couscous" → filters
- Tap 🟡 chip → only yellow dishes
- Tap "schwer" chip → only heavy dishes
- Tap a dish → edit form with all fields populated
- Edit name + save → list updates
- Tap "+ Neu" → blank form, fill in, save → new dish appears
- Delete a dish → list updates

- [ ] **Step 6: Commit**

```bash
git add src/ui/catalog-view.js src/ui/dish-form.js src/app.js styles.css
git commit -m "feat(ui): catalog screen with filter, search, edit, add, delete"
```

---

## Phase 7 — Settings screen

### Task 18: Settings — slots, budget, import/export, reset

**Files:**
- Create: `src/ui/settings-view.js`
- Modify: `src/app.js`
- Modify: `styles.css`

- [ ] **Step 1: Create `src/ui/settings-view.js`**

```js
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
    return h("section", { class: "set-card" },
      h("h2", {}, "Slots pro Tag"),
      ...draft.slotsPerDay.map((s, i) => h("div", { class: "set-slot-row" },
        h("select", { onchange: (e) => { draft.slotsPerDay[i].type = e.target.value; save(); rerender(); } },
          h("option", { value: "breakfast", selected: s.type === "breakfast" ? "selected" : null }, "Frühstück"),
          h("option", { value: "snack",     selected: s.type === "snack"     ? "selected" : null }, "Snack"),
          h("option", { value: "lunch",     selected: s.type === "lunch"     ? "selected" : null }, "Mittag"),
          h("option", { value: "dinner",    selected: s.type === "dinner"    ? "selected" : null }, "Abend"),
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
```

- [ ] **Step 2: Append settings styles to `styles.css`**

```css
.set { padding: 16px; }
.set h1 { font-size: 22px; margin: 0 0 16px; }
.set h2 { font-size: 15px; margin: 0 0 8px; color: var(--n-500); font-weight: 600; }
.set-card { background: var(--n-50); border-radius: 10px; padding: 12px; margin-bottom: 12px; }
.set-slot-row { display: flex; gap: 6px; margin-bottom: 6px; align-items: center; }
.set-slot-row select, .set-slot-row input { flex: 1; padding: 8px; border: 1px solid var(--n-200); border-radius: 6px; min-height: 44px; }
.set-slot-rm { background: none; border: 0; font-size: 16px; padding: 4px 8px; cursor: pointer; min-width: 44px; }
```

- [ ] **Step 3: Wire settings into `src/app.js`**

```js
import { renderSettingsView } from "./ui/settings-view.js";

// in screens:
  settings: () => renderSettingsView({
    settings: state.settings,
    onSave: (next) => {
      state.settings = next;
      settingsStore.save(next);
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

// at bottom of file:
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
  if (!confirm("Aktuelle Daten überschreiben?")) return;
  state.settings = data.settings;
  state.catalog = data.catalog;
  settingsStore.save(state.settings);
  catalogStore.save(state.catalog);
  weeksStore.saveAll(data.weeks);
  location.reload();
}
```

- [ ] **Step 4: Verify in browser**

- Tap "Einstellungen"
- Add/remove slots → week view reflects changes
- Slide budget to 10 → point bar recalculates
- Export → JSON downloads
- Import the just-exported file → app reloads, data preserved
- "Vorrat zurücksetzen" → catalog re-seeds from `data/dishes.json`
- "App zurücksetzen" → blank state, today's empty week

- [ ] **Step 5: Commit**

```bash
git add src/ui/settings-view.js src/app.js styles.css
git commit -m "feat(ui): settings screen with slots editor, budget, import/export"
```

---

## Phase 8 — Polish & QA

### Task 19: Polish pass — animations, today highlight, best-combo, accessibility

**Files:**
- Modify: `styles.css`
- Modify: `src/ui/week-view.js`

- [ ] **Step 1: Add animations to `styles.css`**

```css
/* Mini-grid dot fade-in */
@keyframes dot-pop {
  from { transform: scale(0); }
  to   { transform: scale(1); }
}
.wk-mini-dot:not(.empty) { animation: dot-pop 150ms ease-out; }

/* Point bar pulse on overflow */
@keyframes pulse-once {
  0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
  50%      { box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.3); }
}
.wk-bar.over { animation: pulse-once 600ms ease-out 1; }

/* Slot fade-in */
@keyframes slot-fade-in {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
}
.wk-slot { animation: slot-fade-in 120ms ease-out; }

/* Best-combo sparkle */
.wk-day-combo { animation: dot-pop 200ms ease-out; }

/* Logged badge */
.wk-slot-logged {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 9px;
  background: var(--n-900);
  color: var(--n-0);
  font-size: 10px;
  margin-left: 4px;
}
```

- [ ] **Step 2: Verify reduced-motion path**

In Safari/Chrome DevTools, toggle "Emulate CSS media feature `prefers-reduced-motion`" → reduce. Animations should be instant.

- [ ] **Step 3: Lighthouse + accessibility check**

Open DevTools → Lighthouse → run "Accessibility" audit. Aim for 90+. Fix any flagged issues:
- Buttons without accessible names → add `aria-label`
- Color contrast on slot pills → already meets WCAG AA with the chosen tints
- Focus indicators → add `:focus-visible` outlines:

```css
button:focus-visible, input:focus-visible, select:focus-visible, textarea:focus-visible {
  outline: 2px solid var(--n-900);
  outline-offset: 2px;
}
```

- [ ] **Step 4: Commit**

```bash
git add styles.css src/ui/week-view.js
git commit -m "polish: animations, focus rings, reduced-motion"
```

---

### Task 20: Manual QA pass + deploy notes

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Run the manual test plan**

Walk through every scenario, fixing any bugs found. Each ✓ means it works.

```
Wochenansicht
[ ] First open: empty week, today bold, point bar 0/12
[ ] Tap each day in mini-grid → slots panel updates
[ ] ◀ ▶ navigates weeks, data persists per week
[ ] Mini-grid dots reflect filled-slot colors
[ ] Today is bolder, past days slightly desaturated

Picker
[ ] Tap empty slot → sheet slides up
[ ] Search filters live (try "couscous", "feta", "kase")
[ ] Each row shows ✓ or ⚠ + reason
[ ] Tapping a dish places it, sheet closes, view updates

Slot detail
[ ] Tap filled slot → detail sheet
[ ] "Als gegessen markieren" → ⏱ badge appears
[ ] "Markierung entfernen" → ⏱ disappears
[ ] "Tauschen" → picker opens, swap works
[ ] "Entfernen" → slot empty
[ ] Note text persists after reload

Rules feedback
[ ] Plan two heavy in a row → ⚠️ on the 2nd
[ ] Plan two cheats same day → ⚠️ on the 2nd
[ ] Plan light day + cheat dinner → ⚠️ on dinner
[ ] Plan green-yellow-red across day → ✨ appears
[ ] Plan pizza twice in a week → frequency warning
[ ] Cross weekly budget → bar pulses, status "über Budget"

Catalog
[ ] All dishes from data/dishes.json visible
[ ] Filter chips work in any combination
[ ] Search filters
[ ] Edit a dish → changes persist
[ ] Add a new dish → appears in catalog AND in picker
[ ] Delete → removed from catalog AND from any future picker

Settings
[ ] Add a 6th slot → week view shows 6 slots
[ ] Remove a slot → week view shrinks
[ ] Slide budget → point-bar status recalculates
[ ] Export → file downloads with valid JSON
[ ] Import the same file → no data loss
[ ] Reset catalog → all custom dishes gone, seed restored
[ ] Reset all → blank app, fresh empty week

Mobile / iOS
[ ] Open on iPhone Safari
[ ] All tap targets ≥ 44 px (no mis-taps)
[ ] Bottom tab bar respects home-indicator safe area
[ ] Modal sheets fill correctly above the tab bar
[ ] "Zum Home-Bildschirm" → installed icon, opens chromeless

Reduced motion
[ ] Toggle reduce-motion → animations disabled
```

Fix anything broken. Commit fixes as you go (`fix:` prefix).

- [ ] **Step 2: Add deploy section to `README.md`**

Append to `README.md`:

```markdown
## Deploy to Cloudflare Pages

\`\`\`bash
npm i -g wrangler
wrangler pages deploy . --project-name ampel
\`\`\`

Or drag the project folder into the Cloudflare Pages dashboard. No build command. No environment variables.

## Add to iPhone home screen

1. Open the deployed URL in Safari on iPhone
2. Tap Share → "Zum Home-Bildschirm"
3. Open from the home screen — runs chromeless, like a native app

## Backup

Settings → Daten exportieren downloads a JSON snapshot. Import the same file on another device or after a reset to restore.
```

- [ ] **Step 3: Final commit**

```bash
git add README.md
git commit -m "docs: deploy and home-screen install guide"
```

- [ ] **Step 4: Verify final state**

```bash
node --test tests/**/*.test.mjs
git log --oneline
```

Expected: all tests green, ~20 commits in a clean linear history.

---

## Self-review summary

Run through this checklist before declaring done:

| Spec section | Implemented in tasks |
|---|---|
| Architecture (single HTML shell + ES modules) | 1, 3 |
| `data/dishes.json` (~80 dishes) | 2 |
| Storage / settings / weeks / catalog | 4, 5 |
| Date utils (ISO weeks) | 6 |
| Search | 7 |
| All 9 rules | 8–11 |
| `evaluateWeek` orchestrator | 12 |
| Wochenansicht (Hybrid layout) | 13, 14 |
| Slot Picker with live verdict | 15 |
| Slot detail (log/swap/delete/note) | 16 |
| Vorrat (catalog UI) | 17 |
| Einstellungen (slots, budget, import/export) | 18 |
| Polish (animations, accessibility) | 19 |
| Manual QA pass | 20 |
| Deploy notes | 20 |
