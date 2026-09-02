# Ampel — Personal Traffic Light Meal Tracker

Mobile-first web app for the personal nutrition system defined in
`data/Masterpost Phase 3.docx`. Plans + logs meals across daily slots,
with active rule feedback while planning.

## Run locally

No build step. Serve the folder with any static file server:

```bash
python3 -m http.server 8000
# or
npx serve .
```

Open http://localhost:8000 in your browser. On iPhone Safari, use
"Share → Zum Home-Bildschirm" to install as a web-app.

## Run tests

```bash
node --test tests/**/*.test.mjs
```

No `npm install` needed — tests use only Node's built-in test runner and
ES modules.

## Deploy

Drop the entire folder onto Cloudflare Pages, Netlify, or any static host.
No environment variables. No build command.

## The dish catalog

`data/dishes 2.0.xlsx` is the source of truth — 255 dishes, validated
against Masterpost Phase 3 (traffic light, frequency, severity, tags,
slots). The app reads the generated `data/dishes.json`.

After editing the spreadsheet:

```bash
pip install openpyxl          # once
python3 scripts/xlsx-to-json.py
```

The converter validates ids, categories, frequency types, slot types and
tags, and refuses to write on any error.

**When the catalog changes materially, bump `CATALOG_VERSION` in
`src/state/catalog.js`.** Adding dishes needs no bump — the store merges
new seed entries into an existing cache automatically. Bump only when
existing dishes change their coding, and leave out the migration step for
the previous version so caches are discarded and re-seeded.

### Spreadsheet columns

| Column | Meaning |
|---|---|
| `id` | kebab-case, unique |
| `name` | German display name |
| `category` | `green` / `yellow` / `red` → 0 / 1 / 3 points |
| `heavy` | TRUE = "schwer" (Masterpost §12 thresholds) |
| `frequency_type` / `frequency_max` | `weekly` or `monthly`, max per window |
| `slot_types` | comma-separated: `breakfast,snack,lunch,dinner` |
| `tags` | from a fixed vocabulary (see below) |
| `notes` | ingredients + preparation; drives the cooking view |
| `typ` | `platzhalter` for catch-all rows, otherwise empty |

Allowed tags: `leicht verdaulich`, `bowl`, `süß`, `warm`, `kalt`,
`meal prep`, `to go`, `vegetarisch`, `dessert`, `cheat`.

`bowl` covers bowls **and salads** — any dish whose head noun is a bowl
or a salad. A dish that merely contains salad as a side or an ingredient
(a wrap with lettuce, grilled salmon with a side salad) does not get it.

`data/dishes 2.0 - Validierung.xlsx` documents the per-dish validation
and the rules each decision was based on.

## Project layout

See `docs/superpowers/specs/2026-05-06-ampel-tracker-design.md` for the
full design and `docs/superpowers/plans/2026-05-06-ampel-tracker.md` for
the implementation plan.

## Deploy to Cloudflare Pages

```bash
npm i -g wrangler
wrangler pages deploy . --project-name ampel
```

Or drag the project folder into the Cloudflare Pages dashboard. No build command. No environment variables.

## Add to iPhone home screen

1. Open the deployed URL in Safari on iPhone
2. Tap Share → "Zum Home-Bildschirm"
3. Open from the home screen — runs chromeless, like a native app

## Backup

Settings → Daten exportieren downloads a JSON snapshot. Import the same file on another device or after a reset to restore.
