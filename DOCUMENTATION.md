# Data Governance Vault — Project Documentation

This document captures the full design and implementation history of the escape-room mini-game built for a governance workshop. Use it as a single reference when editing content, styling, mechanics, or deployment.

---

## 1. Project purpose

A browser-based **escape room quiz** for workshop attendees covering:

| Chamber | Topic | Wire color |
|---------|--------|------------|
| Python Chamber | Python governance (repos, secrets, dependencies) | Green `#3dd68c` |
| Power BI Chamber | Power BI workspaces, certification, environments | Blue `#59c2ff` |
| ALM Chamber | Power Platform ALM / pipelines (placeholder content) | Amber `#f0a030` |
| SOP Chamber | Standard operating procedures (placeholder content) | Red `#f07178` |

**Core metaphor:** A bomb is wired to the vault lock. Each answered question **cuts one wire**. If **any question timer hits zero**, the bomb **detonates** and the run ends in failure.

---

## 2. How to run

### Local (simplest)
Open `index.html` directly in Chrome or Edge. No server required (questions load via `<script>`).

### Optional local server
```powershell
cd F:\Projects\governance-activity2
python -m http.server 8080
```
Then visit `http://localhost:8080`.

On older PowerShell, avoid `&&`; run commands separately or use `;`.

### Deployment
Host the folder as static files on:
- **Vercel** (planned — see §19)
- GitHub Pages
- SharePoint
- Azure Static Web Apps

Share one link; attendees play on phones or laptops.

---

## 3. File structure

```
governance-activity2/
├── index.html                  # All screens + layout shell + meta/OG tags
├── favicon.svg                 # Browser tab icon
├── og-image.svg                # Social preview image (needs absolute URL when deployed)
├── DOCUMENTATION.md            # This file
├── css/
│   ├── styles.css              # Core theme, bomb, layout, explosion
│   └── styles-enhancements.css # UX polish, atmosphere, progress, facilitator badge
└── js/
    ├── questions.js            # GAME_DATA — chambers, questions, tiers, leaderboard config
    ├── game.js                 # Game logic, timers, scoring, flow
    ├── bomb.js                 # Bomb SVG, wires, cut/explode animations
    ├── ui.js                   # Progress map, debrief, confetti, leaderboard visibility
    └── sounds.js               # Web Audio effects (no MP3 files)
```

---

## 4. Game flow (screens)

```
Start (name required)
  → Briefing
    → Chamber intro (×4)
      → Questions (linear, no back)
        → Chamber cleared
          → … repeat …
            → Results (success) OR Fail (timeout detonation)
```

### Start screen (current)
- **Enter the Vault** — only start button (Practice Run removed from UI)
- Name field required
- Leaderboard hidden from players by default (see §15)

### Briefing (current)
- **Begin Mission** only (Skip briefing button removed from UI)
- Must click through briefing once per session

### Modes

| Mode | How to start | Behavior |
|------|----------------|----------|
| **Full mission** | Enter the Vault | Normal timers; timeout = bomb detonates = game over |
| **Practice run** | No UI button (code remains) | Timers ≥ 90s; no detonation on timeout; debrief always shown — re-add `#btn-practice` to restore |
| **Debrief in full mode** | Add `?debrief=1` to URL | Shows explanation panel after each question |
| **Facilitator** | Add `?facilitator=1` to URL | Shows local leaderboard + facilitator badge |

---

## 5. Question types

Edit in `js/questions.js`. Header comment documents formats.

### Multiple choice (default)
```javascript
{
  id: "py-1",
  text: "Question text?",
  options: ["A", "B", "C", "D"],
  correct: 1,              // 0-based index
  timeLimit: 60,
  basePoints: 100,
  explain: "Optional debrief text."
}
```

### Fill in the blank
```javascript
{
  id: "py-2",
  type: "fill",
  text: "Pins reproducible ___ for audit.",
  answers: ["dependencies", "dependency versions"],
  timeLimit: 45,
  basePoints: 100,
  explain: "Optional debrief."
}
```
Matching is **case-insensitive**; extra spaces trimmed.

### Checkbox (select all that apply)
```javascript
{
  id: "py-3",
  type: "checkbox",
  text: "Which steps apply? (Select all that apply)",
  options: ["Peer review", "Automated checks", "Direct push", "Skip docs"],
  correct: [0, 1],         // must match exactly — all correct, no extras
  timeLimit: 60,
  basePoints: 100
}
```
Partial credit is **not** given.

---

## 6. Scoring

- **Base:** `basePoints` per question (typically 100)
- **Speed bonus:** up to `timeBonusMax` (50) based on time remaining
- **Wrong / timeout:** 0 points for that question
- **Tiers** at end (in `questions.js` → `tiers`): 900 / 600 / 300 / 0 thresholds
- **HUD score** animates upward on each scored question (`GameUI.animateScore`)

Formula (in `game.js`):
```
bonus = round((timeLeft / timeLimit) * timeBonusMax)
total = basePoints + bonus   // if correct only
```

---

## 7. Timer & failure rules

| Event | Result |
|-------|--------|
| User answers (any type) | Wire cut, feedback shown, advance after delay |
| Correct answer | Points + score pop + snip sound + animated HUD score |
| Wrong answer | Shows correct answer (choice/fill); wire still cut |
| **Timer hits 0 (full mode)** | **Bomb detonates → Mission Failed** |
| Timer hits 0 (practice) | Shows answers, wire cut, continues (no detonation) |
| Timer ≤ 10s | Amber vignette + warning timer styling |
| Timer ≤ 5s | Red pulsing vignette, danger timer, HUD/card glow, tick sound |

There is **no going back** to previous questions.

---

## 8. Bomb & wires (`js/bomb.js`)

### Wire mapping
- One wire per question across all chambers (currently **12 wires** total)
- Wires grouped by chamber color in the SVG
- LED display shows **remaining wire count** (padded `00`–`12`; shows `!!` when timer ≤ 5s)
- At ≤3 wires remaining: critical pulse on panel and page

### Device framing (HTML + CSS)
Bomb frame includes tactical styling:
- Corner brackets and screw details
- Header: `DEFUSAL UNIT` + serial `DG-VLT-001`

### On each answered question
- `BombWidget.cut(chamberIndex, questionIndex)`
- Wire snip animation + “✂️ SNIP!” overlay + sound
- **Wire-cut sync:** bomb frame, progress step, and question dot flash chamber color

### On detonation (`BombWidget.explode()`)
1. Frame rupture shake
2. Bomb SVG body vanishes
3. All wires blast outward (random trajectories)
4. Legend + warning/status scatter
5. 28 debris particles
6. SVG explosion rings + flash **centered on bomb frame** (not page center)
7. Full-screen fail flow in `game.js`

### Reset
`BombWidget.reset()` on new game / retry clears wires, debris, explosion state.

---

## 9. Layout (current)

```
┌─────────────────────────────────────────────────────────┐
│  body (100dvh, no page scroll)                           │
│  ┌──────────────┬──────────────────────────────────────┐ │
│  │  bomb-stage  │  page-shell__main                    │ │
│  │  (~40% width)│  ├─ timer-urgency vignette           │ │
│  │              │  ├─ vault-progress (chamber map)    │ │
│  │  floating    │  └─ app (screens, vertically centered)│ │
│  │  bomb frame  │                                      │ │
│  └──────────────┴──────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### Layout CSS variables (`css/styles.css` `:root`)
```css
--bomb-layout-share: 40%;   /* bomb column width — adjust as needed */
```

- **Desktop:** bomb left, content right (split per `--bomb-layout-share`)
- **Mobile (≤768px):** bomb stacks on top, full width
- **Bomb frame:** vertically centered in column, floating card
- **App section:** screens centered vertically via `margin-block: auto` on `.screen--active`
- **Viewport:** fixed height; only `.app` scrolls if content overflows

### Background layers
- `vault-overlay` — base texture
- `#chamber-atmosphere` — per-chamber pattern when in a chamber
- `ambient-glow` — active during vault gameplay
- `scanlines` — subtle CRT effect
- `#timer-urgency` — red/amber vignette on low time

---

## 10. UX features

| Feature | Module | Notes |
|---------|--------|-------|
| Name entry (required) | `index.html`, `game.js` | Blocks start if empty |
| Mission briefing | `index.html` | Begin Mission only |
| Vault progress map | `ui.js` | 4 chambers + 3 question dots each |
| Question type badges | `ui.js` | Multiple Choice / Fill / Checkbox |
| Chamber color theming | `ui.js`, CSS | HUD + card accent per chamber |
| Chamber atmosphere | `ui.js`, CSS | Grid/dots/patterns per chamber id |
| Staggered option entrance | `ui.js`, `game.js` | 75ms delay per option |
| Animated score counter | `ui.js`, `game.js` | HUD counts up on correct answers |
| Wire snip feedback | `ui.js`, `sounds.js` | Visual + audio |
| Wire-cut color sync | `ui.js` | Bomb frame + progress flash |
| Score pop animation | `ui.js` | Points + speed bonus breakdown |
| Timer urgency effects | `game.js`, CSS | Vignette + styling at 10s / 5s |
| Keyboard shortcuts | `game.js` | `1`–`4` for choice; Enter for checkbox |
| Sound toggle 🔊 | `sounds.js` | Persisted in `localStorage` |
| Leaderboard (facilitator) | `ui.js` | Hidden from users; see §15 |
| Debrief panel | `ui.js` | Practice or `?debrief=1` |
| Confetti on escape | `ui.js` | Success screen |
| Fail screen | `game.js` | Shows failed question + correct answer |
| Reduced motion | CSS + JS | Respects `prefers-reduced-motion` |
| Mobile bomb collapse | `index.html` | “Hide bomb” toggle |
| Favicon + OG meta | `index.html` | `favicon.svg`, `og-image.svg` |

---

## 11. Sounds (`js/sounds.js`)

Web Audio API — no external files.

| Event | Sound |
|-------|--------|
| Timer ≤5s | Tick |
| Wire cut | Snip |
| Correct | Chime |
| Wrong | Low buzz |
| Detonation | Boom |
| Chamber cleared / escape | Unlock |
| Mute | Toggle in corner |

Muted state: `localStorage` key `vault-sound-muted`.

---

## 12. Content to customize

### High priority (workshop-specific)
1. **`js/questions.js`** — Replace ALM and SOP placeholders with org SOPs
2. Add `explain` fields for debrief/discussion
3. Align Python/Power BI questions with your governance document
4. Tune `timeLimit` per question difficulty (`py-1` may still be `2` for quick detonation testing — reset to `60` for production)

### Config blocks in `questions.js`
```javascript
leaderboard: {
  showToUsers: false,        // true = show leaderboard to all players
  facilitatorParam: "facilitator"  // URL param name for facilitator view
},

practice: {
  timeLimitMin: 90
}
```

### Optional
- `tiers` messages and score thresholds
- Chamber descriptions and icons
- `wireColor` per chamber
- `--bomb-layout-share` in CSS

### Not in repo
- Original `Governance for Python & Power BI - Draft v1.docx` was referenced but not in the workspace; questions were written as generic governance examples.

---

## 13. URL parameters

| Parameter | Effect |
|-----------|--------|
| `?debrief=1` | Show debrief panel after each question in full mode |
| `?facilitator=1` | Facilitator mode: show local leaderboard, save scores, top badge |

Example facilitator link:
```
https://your-site.vercel.app/?facilitator=1
```

---

## 14. localStorage keys

| Key | Purpose |
|-----|---------|
| `vault-leaderboard` | Top 10 scores `{ name, score, tier, date }` — **only written when leaderboard is visible** (facilitator or `showToUsers: true`) |
| `vault-sound-muted` | `"1"` if muted |

**Important:** Leaderboard data is **per browser, per device**. Attendees on separate laptops do not share rankings unless a backend is added (see §19).

---

## 15. Leaderboard (facilitator-only)

### Current behavior

| Audience | Sees leaderboard? | Scores saved? |
|----------|---------------------|---------------|
| Normal players | No | No |
| Facilitator (`?facilitator=1`) | Yes (start + results) | Yes (localStorage, top 10) |
| Everyone (future) | Set `showToUsers: true` | Yes |

### Toggle for later
In `js/questions.js`:
```javascript
leaderboard: {
  showToUsers: false,   // ← change to true when ready for all users
  facilitatorParam: "facilitator"
}
```

No other code changes needed to re-enable for everyone.

### Implementation (`ui.js`)
- `shouldShowLeaderboard()` — `showToUsers || ?facilitator=1`
- `syncLeaderboardVisibility()` — shows/hides `#start-leaderboard` and `#results-leaderboard`
- `renderLeaderboardIfVisible()` — renders only when allowed
- `saveScore()` — no-ops when leaderboard hidden
- Facilitator badge: `FACILITATOR · LOCAL SCORES` (fixed top center)

### Kiosk tip
For a shared workshop machine, open the **facilitator URL** on that device so scores accumulate in one browser.

---

## 16. Social preview & branding

In `index.html`:
- `<link rel="icon" href="favicon.svg">`
- Open Graph and Twitter meta tags
- `og-image.svg` for link previews

**Deploy note:** Social platforms require an **absolute URL** for `og:image`, e.g.:
```html
<meta property="og:image" content="https://your-app.vercel.app/og-image.svg">
```

---

## 17. Removing UI buttons safely

**Practice Run** and **Skip briefing** were removed from `index.html`. Event listeners in `game.js` are wrapped in null checks:

```javascript
if (els.btnPractice) { ... }
if (els.btnBriefingSkip) { ... }
```

Removing any button whose listener is **not** guarded will crash init with:
`TypeError: Cannot read properties of null (reading 'addEventListener')`

Buttons that are already guarded: sound toggle, bomb toggle, practice, skip briefing.

---

## 18. Chat history / decision log

Chronological summary of requests and changes:

1. **Initial ask** — Escape room quiz for governance workshop (Python, Power BI, ALM, SOP). **Decision:** static HTML/CSS/JS web app.

2. **Scaffold** — Full game: 4 chambers × 3 questions, timers, scoring, tiers.

3. **Question types** — Fill-in-the-blank and checkbox (select all) added.

4. **Bomb + wires** — SVG bomb, wire cut on each answer, LED display.

5. **UX enhancement pass** — Sounds, briefing, practice mode, debrief, confetti, progress map, type badges, keyboard, name entry, chamber theming, fail screen.

6. **Timer failure = detonation** — Timeout ends game with explosion (not continue).

7. **Layout iterations** — Mandatory name, fixed viewport, bomb left sidebar, floating frame, width via CSS variable, explosion glow on bomb frame.

8. **Documentation** — Initial `DOCUMENTATION.md` created as conversation reference.

9. **Removed Practice Run + Skip briefing** — Buttons dropped from UI; null-guarded listeners in `game.js` so init does not crash.

10. **Centered app content** — Removed `vault-active` top-align override; `.screen--active` uses `margin-block: auto`.

11. **Visual polish pass (8 items)**
    - Favicon + OG social preview
    - Staggered option entrance
    - Animated score counter
    - Chamber-specific atmosphere backgrounds
    - Richer progress map (3 dots per chamber)
    - Timer urgency vignette (10s / 5s)
    - Bomb device framing (corners, screws, serial)
    - Wire-cut color sync on bomb + progress

12. **Leaderboard review** — Confirmed localStorage-only; not useful for multi-attendee workshops as-is.

13. **Facilitator-only leaderboard** — Hidden from normal users; `?facilitator=1` + `showToUsers` toggle for future.

14. **Vercel discussion** — Vercel hosts static files but does not store leaderboard data without Vercel KV/Postgres + API routes (not implemented yet).

---

## 19. Vercel hosting & shared leaderboard (planned)

### What Vercel provides today
- Static hosting for this app ✅
- Shared leaderboard automatically ❌

### To get a real room-wide leaderboard on Vercel
1. Add **Serverless Functions** (`/api/score`, `/api/leaderboard`)
2. Add **Vercel KV** (simple top-N) or **Vercel Postgres** (sessions, export)
3. Update `ui.js` to `fetch()` the API instead of/in addition to `localStorage`

Recommended for workshop scale: **Vercel KV + 2 API routes**.

Keep facilitator toggle: players submit scores silently; facilitator view reads live rankings from API.

---

## 20. Known implementation notes

- **Start screen copy:** Each **answered** question cuts a wire (correct or wrong).
- **Practice mode** code exists but UI entry was removed.
- **Vault door strip** on start screen is commented out in `index.html`.
- **`py-1` timeLimit** may be `2` for testing detonation — set to `60` for workshops.
- **Checkbox / fill / choice** examples live in Python chamber.

---

## 21. Quick test checklist

- [ ] Start without name → blocked with error
- [ ] Full run → timeout triggers explosion + fail screen
- [ ] All three question types render and score
- [ ] Options stagger in; HUD score animates on correct answer
- [ ] Wires cut on each answer; wire-cut flash on bomb + progress
- [ ] Timer vignette at 10s and 5s
- [ ] Chamber atmosphere changes per chamber
- [ ] Sound toggle works
- [ ] Normal URL → no leaderboard visible, no scores saved
- [ ] `?facilitator=1` → leaderboard visible, scores saved after escape
- [ ] `?debrief=1` shows explanations
- [ ] Mobile: bomb collapsible; layout stacks
- [ ] Reduced motion: simplified animations

---

## 22. Suggested next steps

- Replace placeholder questions from governance Word doc
- Reset `py-1` `timeLimit` to 60 for production
- Deploy to Vercel; set absolute `og:image` URL
- Add Vercel KV + API routes for shared leaderboard (optional)
- Re-enable `showToUsers: true` when ready for public rankings
- Org logo / branding on start screen
- Restore vault door strip on start screen (currently commented out)

---

*Last updated: facilitator-only leaderboard, visual polish pass, Vercel planning, UI button removals, centered app layout.*
