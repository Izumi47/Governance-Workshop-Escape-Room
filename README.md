# The Data Governance Vault

A **Keep Talking and Nobody Explodes**-style workshop game: **1 Defuser** sees the bomb on screen; **4 Experts** use Python, Power BI, Power Apps/ALM, and SOP manuals only. Talk fast — or the module detonates.

**Live app:** [governance-workshop-escape-room.vercel.app](https://governance-workshop-escape-room.vercel.app)

---

## How it works

1. Enter your **group name** (Defuser operates this screen).
2. Read the briefing — assign **1 Defuser** + **4 Experts** (Python, Power BI, Power Apps/ALM, SOP manuals).
3. Defuser sits **opposite** the Experts. Experts must **not** look at the screen.
4. Play **40 mixed modules**. Defuser reads aloud; Experts look up the manuals and call the answer.
5. **Wrong answers cut 5 seconds**; timer zero detonates that module (0 pts) and continues.
6. Tool progress updates when a module from that manual is finished.
7. After each module, review the answer, then Continue (or auto after 10s).

Question types: multiple choice, fill-in-the-blank, and select-all-that-apply.

---

## Workshop access token

The app opens behind a **password gate**. Participants need the access token.

| Item | Value |
|------|--------|
| **Default token** | `DG-VAULT-2026` |
| Unlock via URL | `?token=DG-VAULT-2026` |
| Session | Stays unlocked in that browser tab (`sessionStorage`) until the tab closes |
| First unlock | ~3.5s 3D vault **breach animation** (dial, bolts, door swing) — skipped on refresh / `prefers-reduced-motion` |

Change the token: edit the SHA-256 hash in `js/gate.js` (instructions in that file).

Replay the unlock cinema in a tab that already unlocked:
```js
sessionStorage.removeItem("vault-access-ok"); location.reload();
```

---

## Links for workshops

| Audience | URL |
|----------|-----|
| **Participants** | `https://governance-workshop-escape-room.vercel.app` |
| **Admin** (live scores) | `https://governance-workshop-escape-room.vercel.app/admin.html` |

Debrief (answer + justification) always shows after each question. Participants never see other teams' scores. The **admin page** shows every team's live score, progress and status, refreshing every 3 seconds. It asks for the admin token (the `ADMIN_TOKEN` env var, separate from the workshop token). Practice runs are not reported. **Reset board** clears all teams; scores also expire 24h after the last update.

---

## Run locally

No build step or dependencies required. Three.js (background + effects) loads from the jsDelivr CDN via an import map; without it the game still runs, just without the 3D layer.

```powershell
# Option 1 — open directly
start index.html

# Option 2 — local server
cd F:\Projects\governance-activity2
python -m http.server 8080
# Visit http://localhost:8080
```

---

## Customize content

Edit **`js/questions.js`** — chambers, questions, timers and tiers live in `window.GAME_DATA`.

Replace placeholder ALM/SOP questions with your org-specific governance content. Add optional `explain` fields for debrief/discussion text.

---

## Project structure

```
├── index.html              # App shell, gate, breach overlay
├── admin.html              # Live scores for facilitators
├── api/score.js            # Vercel function: live scores in Upstash Redis
├── tests/score-api.check.js # node tests/score-api.check.js
├── js/
│   ├── vault3d.js          # Three.js background, timer bomb + breach/shutter/confetti/explosion
│   ├── sounds.js           # Web Audio SFX + BGM
│   ├── gate.js             # Access token + breach unlock
│   ├── questions.js        # Game content (edit this)
│   ├── ui.js               # Progress map, effects
│   ├── bomb.js             # Timer bomb state (SVG fallback)
│   └── game.js             # Logic, timers, scoring
├── css/
│   ├── styles.css          # Core layout & theme
│   ├── styles-enhancements.css
│   ├── spectacle.css       # Hero / triumph motion
│   └── gate-breach.css     # Unlock terminal readout
├── assets/audio/           # BGM playlist
├── favicon.svg
└── og-image.svg
```

---

## Deploy to Vercel

A **static site** (no `package.json`, no build) plus one serverless function, `api/score.js`, for live scores.

| Setting | Value |
|---------|--------|
| Framework Preset | **Other** |
| Root Directory | `./` |
| Build Command | *(empty)* |
| Output Directory | `.` |

Connect the GitHub repo and deploy. For the admin live board:

1. Vercel project → **Storage** → add **Upstash Redis** (free tier). It sets the `KV_REST_API_URL` / `KV_REST_API_TOKEN` env vars.
2. **Settings → Environment Variables** → add `ADMIN_TOKEN` with your admin token.
3. Redeploy.

Locally, `/api/score` only runs under `vercel dev`. With a plain static server the game still works and score reports fail silently. Enable **Speed Insights** in the Vercel dashboard for performance metrics (scripts already in `index.html`).

See **[DOCUMENTATION.md](./DOCUMENTATION.md)** for full deployment notes, Speed Insights, gitignore rules, and admin board details.

---

## Tech stack

- HTML, CSS, JavaScript (no framework)
- Web Audio API for sound effects
- `localStorage` for sound preference
- Vercel function + Upstash Redis for the admin live board

---

## Documentation

For mechanics, layout, scoring, URL parameters, Git secrets, and Vercel setup:

**[DOCUMENTATION.md](./DOCUMENTATION.md)**

---

## License

Internal workshop project. Add a license file if you open-source or share outside your organization.
