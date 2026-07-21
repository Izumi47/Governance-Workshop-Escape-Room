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
| First unlock | ~3.5s vault **breach animation** (dial, bolts, iris) — skipped on refresh / `prefers-reduced-motion` |

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
| **Facilitator** (local leaderboard) | `https://governance-workshop-escape-room.vercel.app/?facilitator=1` |

Debrief (answer + justification) always shows after each question. The leaderboard is **hidden from participants** by default. Facilitator mode shows a top-10 board stored in that browser only (not a shared room ranking unless you add a backend).

---

## Run locally

No build step or dependencies required.

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

Edit **`js/questions.js`** — chambers, questions, timers, tiers, and leaderboard settings live in `window.GAME_DATA`.

```javascript
leaderboard: {
  showToUsers: false,   // true = show leaderboard to all players
  facilitatorParam: "facilitator"
}
```

Replace placeholder ALM/SOP questions with your org-specific governance content. Add optional `explain` fields for debrief/discussion text.

---

## Project structure

```
├── index.html              # App shell, gate, breach overlay
├── js/
│   ├── sounds.js           # Web Audio SFX + BGM
│   ├── gate.js             # Access token + breach unlock
│   ├── questions.js        # Game content (edit this)
│   ├── ui.js               # Progress map, effects, leaderboard
│   ├── bomb.js             # Per-question timer bomb
│   └── game.js             # Logic, timers, scoring
├── css/
│   ├── styles.css          # Core layout & theme
│   ├── styles-enhancements.css
│   ├── spectacle.css       # Shutter / triumph motion
│   └── gate-breach.css     # Unlock cinema
├── assets/audio/           # BGM playlist
├── favicon.svg
└── og-image.svg
```

---

## Deploy to Vercel

This is a **static site** (no `package.json`, no build).

| Setting | Value |
|---------|--------|
| Framework Preset | **Other** |
| Root Directory | `./` |
| Build Command | *(empty)* |
| Output Directory | `.` |

Connect the GitHub repo and deploy. Enable **Speed Insights** in the Vercel dashboard for performance metrics (scripts already in `index.html`).

See **[DOCUMENTATION.md](./DOCUMENTATION.md)** for full deployment notes, Speed Insights, gitignore rules, and facilitator/leaderboard details.

---

## Tech stack

- HTML, CSS, JavaScript (no framework)
- Web Audio API for sound effects
- `localStorage` for sound preference and optional facilitator leaderboard

---

## Documentation

For mechanics, layout, scoring, URL parameters, Git secrets, and Vercel setup:

**[DOCUMENTATION.md](./DOCUMENTATION.md)**

---

## License

Internal workshop project. Add a license file if you open-source or share outside your organization.
