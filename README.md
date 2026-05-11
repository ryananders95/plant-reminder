# PlantPapi

A personal-but-shareable Progressive Web App for houseplant care reminders. Tracks per-plant water / mist / fertilize schedules with seasonal rules, syncs across devices, and sends a daily push when something is due.

Live at https://ryananders95.github.io/plant-reminder/.

## Stack

Vite + React 19 + TypeScript, PWA via `vite-plugin-pwa`. Auth, data (Firestore), photos (Storage), and push (FCM) all sit in a single Firebase project. GitHub Pages hosts the build; a GitHub Actions cron sends pushes every 30 min. Total cost: $0.

## Local development

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # tsc -b && vite build (PWA assets auto-generated)
npm run preview      # serve the production build locally
npm run typecheck
npm test             # Vitest
```

You'll need a `.env.local` with `VITE_FIREBASE_*` values — copy `.env.example` and fill in. See `SETUP.md` for one-time Firebase Console setup.

## Deploying

Push to `main`. `.github/workflows/deploy.yml` builds and publishes to GitHub Pages.

## Repo guide

Architecture, non-obvious gotchas, and the file map live in `CLAUDE.md` — that's the working document for anyone (human or agent) touching the code.
