# Ampel Tracker — Design Spec

**Date:** 2026-05-06
**Author:** Johannes Nagl (with Claude)
**Status:** Approved for implementation

---

## Context

The user follows a personal "traffic light" nutrition system documented in `Gerichtepool aktuell_Ampelsystem.docx`. The system classifies meals into three buckets:

- 🟢 **Grün (Basis)** — 0 points, freely combinable
- 🟡 **Gelb (Moderat)** — 1 point, daily allowed in moderation
- 🔴 **Rot (Cheat)** — 3 points, max 1–2 per week

The system is governed by a weekly point budget (10–12 points), per-dish frequency limits, a "no two heavy meals in a row" rule, and 5 explicit no-go combinations. The user's catalog contains roughly 80 hand-curated dishes, each tagged with a category and a frequency.

The user wants a mobile-first web app to plan and log meals against this system, with active feedback at the moment of planning.

## Goals (v1)

1. Plan a full week of meals across 5 daily slots (configurable to 6).
2. Log eaten meals with the same UI used for planning; no separate "log" mode.
3. Show running totals (weekly points, 🟢/🟡/🔴 distribution) at all times.
4. Surface rule violations live, while the user is choosing a dish — not after.
5. Search the catalog by free text (name, tags, notes) inside the slot picker.
6. Manage the dish catalog (edit, add, disable) on a separate screen.
7. Run mobile-first, offline-capable, with no backend.

## Non-goals (v1)

- Multi-user / accounts / cloud sync (single-device localStorage only).
- Native iOS/Android app (browser only; "Add to Home Screen" is enough).
- Month-aggregated analytics view (weeks navigable via ◀ ▶, no separate Monat tab).
- Calorie/macro tracking, photos, barcode scanning.
- Server-side rules engine, push notifications, recipe suggestions.
- Strict enforcement / blocking — the system is advisory, never coercive
  (per the doc's *"nicht erzwingen, nur als Gefühl"* principle).

## Decisions reached during brainstorming

| # | Decision |
|---|----------|
| 1 | Primary use: planning + logging in one unified UI (slots can be "planned" or "logged"). |
| 2 | 5 slots/day default (Frühstück, Snack 1, Mittag, Snack 2, Abend); configurable to 6 (Frühstück, Snack 1, Mittag, Snack 2, Abend, Snack 3). |
| 3 | Fixed catalog of ~80 dishes seeded from the docx; new dishes added via Catalog screen only (no inline quick-add in v1). |
| 4 | Search is free-text matching across `name`, `tags`, `notes` — no structured ingredient list per dish. |
| 5 | Active feedback at the moment of planning (live "✓ / ⚠ / 🚫" verdict per candidate dish in the picker). Nothing blocks. |
| 6 | Each 🟡/🔴 dish carries a binary `heavy` flag, used by the no-two-heavy-in-a-row rule. |
| 7 | Mobile-first, single-device, browser localStorage. No backend. |
| 8 | Single static HTML file (`index.html`) — no build step, no `node_modules`. |
| 9 | German UI. Strings centralised in `i18n.de.js`-style map for future translation. |
| 10 | Catalog management lives on its own screen, not inline in the planner. |
| 11 | Layout: Hybrid — sticky week summary (point bar + 7-day mini-grid) on top, selected day's slots below. |
| 12 | Scope: lean MVP + week navigation. No separate month view; no per-dish analytics. |

## Architecture

A single static HTML file deployed as flat files. No build, no dependencies.

```
/Users/johannesnagl/Code/ampel/
├── index.html           # the entire app: HTML + <style> + <script type="module">
├── data/
│   └── dishes.json      # ~80 dishes seeded from the docx
├── tests.html           # inline test harness for the rules engine
├── docs/superpowers/specs/
│   └── 2026-05-06-ampel-tracker-design.md
└── README.md            # how to run and deploy
```

Logical "screens" inside `index.html` are toggled via `body[data-screen="…"]`:

- `screen-week` (default) — the Hybrid week view
- `screen-catalog` — dish management
- `screen-settings` — slots-per-day, point budget, import/export
- A modal overlay `screen-picker` for slot picking

The internal code is organised as ES module sections within the single page.
Conceptual modules:

```
ui/                    DOM rendering + event wiring
state/                 localStorage read/write, schema versioning, migrations
rules/                 the rules engine (one file per rule + an evaluator)
i18n/                  string map (German for v1)
util/                  date helpers (ISO weeks), points math, search
```

## Data model

All persisted state is wrapped as `{ schemaVersion: 1, data: { … } }`.

### `data/dishes.json` (static seed, version-controlled)

```json
{
  "version": 1,
  "dishes": [
    {
      "id": "porridge-smoothie",
      "name": "Porridge + Smoothie",
      "category": "green",
      "heavy": false,
      "frequency": { "type": "weekly", "max": 7 },
      "slotTypes": ["breakfast"],
      "tags": ["frühstück", "haferflocken", "smoothie"],
      "notes": "Standard-Frühstück"
    }
  ]
}
```

Fields:
- `id` — stable kebab-case identifier
- `name` — display name (German)
- `category` — `"green" | "yellow" | "red"`; drives points (0 / 1 / 3)
- `heavy` — boolean; only meaningful for 🟡/🔴; drives `no-two-heavy-in-a-row`
- `frequency.type` — `"weekly" | "monthly"`
- `frequency.max` — max occurrences per type window
- `slotTypes` — list of slot kinds the picker should offer this dish for
- `tags` — free-text list, used by search
- `notes` — optional free-text

### `localStorage["ampel.dishes"]`

Initial value: deep copy of `data/dishes.json`. After first load, all catalog edits write here. The static file is the seed; localStorage is the source of truth at runtime.

### `localStorage["ampel.weeks"]`

Sparse map keyed by ISO week. Only weeks with any user activity exist.

```json
{
  "2026-W19": {
    "monday": "2026-05-04",
    "days": {
      "2026-05-04": {
        "slots": [
          { "type": "breakfast", "dishId": "porridge-smoothie", "loggedAt": null, "note": "" },
          { "type": "snack",     "dishId": "skyr-apfel",        "loggedAt": null, "note": "" },
          { "type": "lunch",     "dishId": null,                 "loggedAt": null, "note": "" },
          { "type": "snack",     "dishId": null,                 "loggedAt": null, "note": "" },
          { "type": "dinner",    "dishId": null,                 "loggedAt": null, "note": "" }
        ]
      }
    }
  }
}
```

Slot fields:
- `type` — slot kind (`breakfast | snack | lunch | dinner`)
- `dishId` — `null` when empty
- `loggedAt` — ISO timestamp if the user marked it as eaten; `null` if still planned. The single field that distinguishes "planned" from "logged."
- `note` — optional free-text per slot ("Restaurant XY", "kleinere Portion")

### `localStorage["ampel.settings"]`

```json
{
  "slotsPerDay": [
    { "type": "breakfast", "label": "Frühstück" },
    { "type": "snack",     "label": "Snack 1" },
    { "type": "lunch",     "label": "Mittag" },
    { "type": "snack",     "label": "Snack 2" },
    { "type": "dinner",    "label": "Abend" }
  ],
  "weeklyPointBudget": 12,
  "weekStartsOn": "monday",
  "language": "de"
}
```

Adding a 6th slot in the future: append one entry. The week view rerenders.

## Rules engine

A pure function, called every time state changes:

```
evaluateWeek(weekData, dishes, settings) → Verdict
```

### Verdict shape

```js
{
  weeklyPoints: { used: 7, budget: 12, status: "ok" | "warn" | "over" },
  weeklyDistribution: {
    green: 14, yellow: 4, red: 1, empty: 16,
    target: { green: [22, 26], yellow: [7, 10], red: [1, 2] },
    inRange: true
  },
  perDay: {
    "2026-05-04": {
      points: 1,
      label: "leichter Tag" | "normaler Tag" | "Cheat-Tag",
      slots: [
        { dishId: "...", verdict: "ok" | "warn" | "block", reason: "…" | null }
      ]
    }
  },
  warnings: [
    {
      severity: "warn" | "block",
      where: { date: "2026-05-04", slotIndex: 2 },
      ruleId: "no-two-heavy-in-a-row",
      message: "Falafel + Hummus → Pizza: zwei schwere Mahlzeiten direkt hintereinander"
    }
  ]
}
```

`block` is reserved for "would create a hard no-go combo," but no UI actually prevents the action — the severity only changes the visual treatment.

### Rules

| ID | What it checks |
|----|----------------|
| `weekly-point-budget` | Sum of points (🟢=0, 🟡=1, 🔴=3) ≤ `weeklyPointBudget` |
| `weekly-distribution` | Counts of 🟢/🟡/🔴 vs the doc's 35-meal target ranges |
| `no-two-heavy-in-a-row` | Within a day, no two `heavy: true` 🟡/🔴 slots in adjacent slots |
| `no-cheat-plus-cheat-same-day` | Max 1 🔴 main meal per day |
| `no-three-yellow-heavy` | Max 2 `heavy: true` 🟡 dishes per day |
| `no-cheat-plus-extra-snack` | If day has a 🔴 main meal, all snacks must be 🟢 |
| `light-day-evening-escalation` | If breakfast+lunch+snacks are 🟢 with low points and dinner is 🔴 or heavy 🟡 |
| `frequency-limit` | Per-dish frequency cap. Lookback windows: `weekly` = count occurrences within the current ISO week. `monthly` = count occurrences within the current calendar month. The count includes both planned and logged slots. Doc phrases like "alle 2–3 Wochen" are modelled as `monthly: max: 2`. |
| `best-combo-recognition` | Day matches Grün-Grün-Gelb, Grün-Gelb(leicht)-Rot, or Grün-Gelb-Grün → ✨ marker |

### Where rules surface

- **Picker** — Each candidate dish runs through the engine *as if* placed in the active slot. Inline ✓ / ⚠ / 🚫 + a one-line reason. This is the killer feature.
- **Day view** — Slots show ⚠️ when a rule fires.
- **Week summary** — Aggregate warning count and worst severity.

## Screens & interactions

### Wochenansicht (default home)

- Sticky header: ◀ week N · date range · ☰
- Sticky summary: weekly point bar + distribution counts + 7-day mini-grid (each day = up to 6 dots)
- Scrollable body: selected day's slot list (vertical), each slot showing 🟢/🟡/🔴 emoji + slot label + dish name + ⚠️ if applicable + ⏱ if logged
- Bottom tab bar: [Woche] [Vorrat] [Einstellungen]
- Empty slots render as `+ Slotname`
- Day-level "⚠️ N Hinweise" expander at the bottom of slots, listing every warning

Interactions:
- Tap day in mini-grid → that day loads below
- Tap filled slot → slot detail (edit / swap / delete / log / note)
- Tap empty slot → Picker
- Long-press filled slot → quick log (no detail open)
- Header ◀ ▶ → previous/next ISO week
- Today's date is visually distinct (bold border in mini-grid)

### Vorrat (catalog)

- Search input + filter chips (Alle, 🟢, 🟡, 🔴, schwer)
- Vertical list of dishes; each row shows category emoji, name, slot types, frequency
- Tap row → edit form (name, category, heavy, frequency, slot types, tags, notes, delete)
- "+ Neu" in header opens the same form blank

### Einstellungen

Single scrollable form:
- Slots-per-day editor (drag-reorder, add/remove, default 5)
- Weekly point budget (slider 8–20, default 12)
- Wochenstart (Mo/So)
- Daten exportieren (download `weeks + dishes + settings` as JSON)
- Daten importieren (upload JSON; validates schema before replacing)
- Vorrat zurücksetzen (re-seed from `data/dishes.json`)
- App zurücksetzen (clear all `ampel.*` keys)

### Picker (modal sheet)

Half-sheet from bottom. Header shows the slot context ("Mittag · Mo, 4. Mai"). A search input and a list of dishes filtered by:
1. `slotTypes` includes the active slot's type
2. Free-text match on `name | tags | notes`

Each row shows: emoji, name, "schwer" pill if applicable, **live verdict line** (✓/⚠/🚫 + reason from the rules engine evaluating "what if I picked this?").

Tap a dish → places it in the slot, closes the sheet.

### Empty / loading / error states

- First-ever open: fetch `data/dishes.json`, write to `localStorage["ampel.dishes"]`, create default settings, land on current week with all slots empty.
- `dishes.json` fetch fails: fall back to a tiny embedded copy baked into `index.html`; show a non-blocking toast.
- localStorage full: toast asking the user to export and clear old weeks.
- Schema version mismatch: run migration; if migration fails, show "Reset to defaults" prompt.

## Visual design

### Colors

```
Green   #22c55e   tint #f0fdf4   text-on-tint #166534
Yellow  #eab308   tint #fefce8   text-on-tint #854d0e
Red     #ef4444   tint #fef2f2   text-on-tint #991b1b

Neutral 0    #ffffff
Neutral 50   #fafafa
Neutral 100  #f5f5f5
Neutral 200  #e5e5e5
Neutral 500  #737373
Neutral 900  #171717
```

All colors as CSS custom properties on `:root` for easy dark-mode addition later.

### Typography

```
font-family: system-ui, -apple-system, BlinkMacSystemFont,
             "Segoe UI", Roboto, sans-serif;
```

Sizes: 11 / 13 / 15 / 17 / 22 px.

### Layout

- Single column, max-width 480 px, centred on tablet/desktop
- 16 px page padding, 8 px internal gaps
- Bottom tab bar 56 px, sticky, respects safe-area insets
- Header sticky at top

### Polish

1. Day-mini-grid dot fades in (~150 ms) when a slot is filled
2. Point bar gradient green → amber → red as `used` approaches `budget`; pulses once at 12+
3. Picker live-verdict fades in 50 ms after each row renders
4. Long-press log: outline pulse + ⏱ badge appears
5. Best combo recognition: ✨ next to day header (one-shot, no spam)
6. Today is bolder; past days in past weeks are slightly desaturated
7. `prefers-reduced-motion` disables animations

### Accessibility

- All tap targets ≥ 44 × 44 px
- Color is never the sole signifier — every category also has emoji + text label
- Visible focus rings on keyboard nav
- Semantic HTML: `<button>` for taps, `<dialog>` for picker

## Language

UI is German. All strings live in a single map (sketch):

```js
const DE = {
  slot: { breakfast: "Frühstück", snack: "Snack", lunch: "Mittag", dinner: "Abend" },
  dayLabel: { light: "leichter Tag", normal: "normaler Tag", cheat: "Cheat-Tag" },
  catalog: "Vorrat",
  settings: "Einstellungen",
  log: "Als gegessen markieren",
  warning: "Hinweis",
  heavy: "schwer",
  // …
};
```

Future English translation = adding `EN` map and a language toggle in settings.

## Testing

### Unit tests — `tests.html`

A bare HTML page that imports the rules modules and runs `console.assert`-style tests. ~40 small tests covering each rule with crafted week fixtures. Open in a browser; check the console for failures. No framework, no runner.

Categories of tests:
- Rule firing (each rule, positive and negative cases)
- Points calculation
- Frequency lookback (weekly + monthly windows)
- Schema migration round-trip
- Import/export round-trip

### Manual test plan — in `README.md`

A checklist of ~20 user flows: add dish to slot, hit budget, no-two-heavy fires, switch weeks, edit catalog, export/import, etc. Run through before deploying.

### No E2E in v1

Playwright can wrap the static file later if the app outgrows manual testing.

## Open questions / future work

Out of scope for v1, listed for context:

- PWA / service worker for true offline + install on home screen
- Cloud sync (Cloudflare D1 or Supabase) for multi-device
- Per-dish frequency dashboard ("Pizza: 3× in last 4 weeks")
- "Most-eaten this month" list, streaks
- Dark mode
- English translation
- Photo per dish
- Dish ratings ("how did I feel after?") for self-tuning the catalog

## Implementation order (high level — to be expanded by writing-plans)

1. Project skeleton (`index.html`, `dishes.json` from docx, README)
2. Data layer (localStorage wrapper, schema versioning, settings, weeks)
3. Rules engine (each rule + evaluator + tests)
4. Wochenansicht (Hybrid layout, day switching, week navigation)
5. Slot Picker (search, live verdict, place dish)
6. Catalog screen (list, filter, edit, add, delete)
7. Settings screen (slots config, budget, export/import)
8. Polish pass (animations, accessibility, today highlighting, best-combo recognition)
9. Manual QA against the test plan
