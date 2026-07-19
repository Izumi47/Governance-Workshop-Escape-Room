# The Data Governance Vault

A browser-based escape room quiz for governance workshops. Answer timed questions on **Python**, **Power BI**, **ALM**, and **SOP** to cut wires on a defusal bomb and escape the vault — before the timer hits zero.

**Live app:** [governance-workshop-escape-room.vercel.app](https://governance-workshop-escape-room.vercel.app)

---

## How it works

1. Enter your name and start the mission.
2. Read the briefing, then progress through **4 chambers** (3 questions each).
3. Each answered question **cuts one wire** on the bomb.
4. Answer quickly for speed bonus points.
5. If **any question timer reaches zero**, the bomb detonates — game over.

Question types: multiple choice, fill-in-the-blank, and select-all-that-apply.

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

Connect the GitHub repo and deploy. See **[DOCUMENTATION.md](./DOCUMENTATION.md)** for full deployment notes, gitignore rules, and facilitator/leaderboard details.

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
