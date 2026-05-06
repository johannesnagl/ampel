# Ampel — Personal Traffic Light Meal Tracker

Mobile-first web app for the personal nutrition system documented in
`Gerichtepool aktuell_Ampelsystem.docx`. Plans + logs meals across daily
slots, with active rule feedback while planning.

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

## Project layout

See `docs/superpowers/specs/2026-05-06-ampel-tracker-design.md` for the
full design and `docs/superpowers/plans/2026-05-06-ampel-tracker.md` for
the implementation plan.
