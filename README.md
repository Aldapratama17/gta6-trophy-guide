# GTA VI Trophy Guide & Tracker

An offline-first guide and checklist for all 55 PlayStation 5 trophies in *Grand Theft Auto VI*. Built for the [make.fun gta6-trophy-guide-01 bounty](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01).

The app lives entirely in `app/` — plain HTML, CSS, and ES modules. No build step, no runtime network calls. Trophy data is bundled in `app/data/trophies.json` and progress persists in your browser's localStorage.

[![make.fun · gta6-trophy-guide-01](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![rank](https://make.fun/badge/gta6-trophy-guide-01/Aldapratama17/gta6-trophy-guide/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![reward](https://make.fun/badge/gta6-trophy-guide-01/Aldapratama17/gta6-trophy-guide/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)

---

## Features

- **Complete 55-trophy list** — every trophy with grade badge (Platinum / Gold / Silver / Bronze), category (Story, Collectibles, Activities, Completion, Misc), missable flag, and a detailed guide written in our own words.
- **Smart filters with live counts** — filter by category or grade; dropdown badges show how many trophies each bucket holds.
- **Full-text search** — search across names, descriptions, and guide text.
- **Spoiler-safe mode** — one click hides unearned story trophies, ideal for a first playthrough.
- **Roadmap to Platinum** — seven-stage progression (Story → Collectibles → Activities → Completion → 100% Finale) with per-stage progress and inline checkboxes.
- **Progress persistence** — auto-saves to localStorage; export/import JSON to move progress across devices or browsers.
- **Keyboard-friendly** — all interactive elements are focusable, labelled, and work with Tab/Enter/Space/Arrow keys.
- **Responsive layout** — sidebar + detail on desktop, stacked on mobile.

---

## Running locally

```bash
# From the repo root
cd /root/makefun/gta6-guide

# Option 1: Node static server (TypeScript)
npx tsx serve.ts --port 8080
# Then open http://localhost:8080

# Option 2: Any static server pointed at app/
# python3 -m http.server 8080 -d app
# npx http-server app -p 8080
```

The app also works via `file://` — just open `app/index.html` directly in a browser (some browsers block `fetch()` on `file://`, so a local server is recommended).

---

## Screenshots

| # | Description | File |
|---|-------------|------|
| 1 | Main checklist view with trophy guide open | `screenshots/1-guide-detail.png` |
| 2 | Full checklist with filters and progress | `screenshots/2-checklist.png` |
| 3 | Roadmap to Platinum with expanded stages | `screenshots/3-roadmap.png` |
| 4 | Spoiler mode hiding story trophies | `screenshots/4-spoiler-mode.png` |

---

## Data sources & credits

Trophy list, descriptions, and grades sourced from:
- [PSNProfiles — Grand Theft Auto VI](https://psnprofiles.com/trophies/43531-grand-theft-auto-vi)
- [PowerPyx — GTA 6 Trophy Guide & Roadmap](https://www.powerpyx.com/gta-6-grand-theft-auto-vi-trophy-guide-roadmap/)

All guide text was rewritten in our own words. This is an unofficial fan project, not affiliated with Rockstar Games, PlayStation, PSNProfiles, or PowerPyx.

---

## Project structure

```
gta6-guide/
├── app/
│   ├── index.html      # Single-page markup
│   ├── app.js          # Application logic (ES module)
│   ├── style.css       # Custom dark-theme stylesheet
│   └── data/
│       └── trophies.json  # 55 trophy definitions
├── screenshots/        # PNG screenshots for the dossier
├── shots.json          # Screenshot metadata for make.fun
├── serve.ts            # Dev static server (Node)
├── main.ts             # Dossier builder
└── package.json
```

---

## License

MIT — see `LICENSE`.
