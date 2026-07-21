# The Data Governance Vault

A browser-based escape room quiz for governance workshops. Answer timed questions on **Python**, **Power BI**, **ALM**, and **SOP** to cut wires on a defusal bomb and escape the vault — before the timer hits zero.

**Live app:** [governance-workshop-escape-room.vercel.app](https://governance-workshop-escape-room.vercel.app)

---

## How it works

1. Enter your name and start the mission.
2. Read the briefing, then progress through **4 chambers** (10 questions each).
3. **Each question arms its own bomb** — answer correctly to defuse it.
4. **Wrong answers cut 5 seconds** off the timer; keep trying until correct (or time runs out).
5. If the **timer hits zero**, that bomb detonates (0 pts for the question) and the mission continues.
6. After every question, review the **answer and justification**, then Continue.

Question types: multiple choice, fill-in-the-blank, and select-all-that-apply.

---

## Workshop access token

The app opens behind a **password gate**. Participants need the access token.

| Item | Value |
|------|--------|
| **Default token** | `DG-VAULT-2026` |
| Unlock via URL | `?token=DG-VAULT-2026` |
| Session | Stays unlocked in that browser tab (`sessionStorage`) until the tab closes |

Change the token: edit the SHA-256 hash in `js/gate.js` (instructions in that file).

---

## Links for workshops

| Audience | URL |
|----------|-----|
| **Participants** | `https://governance-workshop-escape-room.vercel.app` |
| **Facilitator** (local leaderboard) | `https://governance-workshop-escape-room.vercel.app/?facilitator=1` |
| **Debrief mode** (explanations after each question) | Add `?debrief=1` |

The leaderboard is **hidden from participants** by default. Facilitator mode shows a top-10 board stored in that browser only (not a shared room ranking unless you add a backend).

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
├── index.html              # App shell & screens
├── js/
│   ├── questions.js        # Game content (edit this)
│   ├── game.js             # Logic, timers, scoring
│   ├── bomb.js             # Bomb SVG & wire animations
│   ├── ui.js               # Progress map, effects, leaderboard
│   └── sounds.js           # Web Audio effects
├── css/
│   ├── styles.css          # Core layout & theme
│   └── styles-enhancements.css
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
