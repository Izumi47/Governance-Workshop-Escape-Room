# The Data Governance Vault — Greenfield Improvement Plan

**Purpose of this file:** Complete rebuild + improvement blueprint for a **new workspace**.  
Export this document (and optionally copy content/assets from the source repo) and treat it as the single source of truth for the rewrite.

**Source project (legacy):** `governance-activity2`  
**Live reference:** https://governance-workshop-escape-room.vercel.app  
**GitHub (legacy):** `Izumi47/Governance-Workshop-Escape-Room`  
**Plan date:** 2026-07-20  
**Status:** Ready to execute in a new repo

---

## 0. How to use this plan in a new workspace

1. Create a new empty repo / Cursor workspace.
2. Copy this file in as `IMPROVEMENT-PLAN.md` (or `docs/IMPROVEMENT-PLAN.md`).
3. Copy **content + assets** from the legacy repo (see §16 Migration checklist).
4. Execute phases in order (§12). Do not skip Phase 0–1.
5. Use §14 Acceptance criteria as the definition of done for each phase.
6. Use §1–§11 as the product/spec inventory so you do not need the old code open constantly.

**Non-negotiable product promise:**  
Workshop participant opens a URL → plays a timed escape-room quiz → finishes (escape or detonate) → facilitator can debrief — all in under ~30 minutes, with zero install for players.

---

## 1. Product definition (keep)

### 1.1 What it is

Browser-based escape-room quiz for **data governance workshops**. Players answer timed questions across four chambers (**Python → Power BI → ALM → SOP**), cutting bomb wires as they go, to “escape the vault” before any question timer hits zero.

### 1.2 Audience

| Audience | Needs |
|----------|--------|
| Workshop participants | Fast start, clear UI, sound optional, no login |
| Facilitators | Leaderboard, debrief mode, chamber skip for demos, practice |
| Content owners | Edit questions without breaking the game |

### 1.3 Core metaphor (do not abandon)

- Vault / bomb defusal theme
- One wire per question (40 wires for 40 questions)
- Wire cut on every answered advance (including wrong answers)
- Timeout in full mode = detonation = game over
- Chamber colors / atmosphere / shutter transitions for spectacle

### 1.4 Modes (product requirements)

| Mode | Entry | Behavior |
|------|-------|----------|
| **Full mission** | Start button | Strict timers; timeout detonates; scores eligible for leaderboard |
| **Practice** | Dedicated CTA + `?practice=1` | Longer timers; no detonation; always debrief; scores not saved |
| **Debrief** | `?debrief=1` (or practice) | Show explanation after each question |
| **Facilitator** | `?facilitator=1` | Show leaderboard UI + badge; save scores |
| **Chamber skip** | `?chamber=` | After briefing, start at chamber; prior wires pre-cut |

---

## 2. Current system inventory (legacy — parity target)

Use this section as the **feature parity checklist**. New build must match behavior unless a change is listed under §8 Improvements.

### 2.1 Legacy file map

| Path | Role |
|------|------|
| `index.html` | App shell, all screens, fonts, OG, Speed Insights stub |
| `js/questions.js` | `window.GAME_DATA` — content, tiers, shuffle, leaderboard config |
| `js/game.js` | State, timers, scoring, URL params, keyboard (~monolith) |
| `js/bomb.js` | `BombWidget` — SVG wires, cut, explode, critical |
| `js/ui.js` | `GameUI` — progress, shutter, confetti, leaderboard, FX |
| `js/sounds.js` | `GameSounds` — Web Audio SFX + MP3 playlist |
| `css/styles.css` | Core tokens, layout, bomb, screens |
| `css/styles-enhancements.css` | Polish, audio dock, facilitator/practice badges |
| `css/spectacle.css` | Vault shutter, hero, triumph motion |
| `assets/icons/*.png` | Chamber icons |
| `assets/audio/*.mp3` | BGM tracks |
| `favicon.svg`, `og-image.svg` | Branding |
| `src/` | Source docx + raw audio masters (authoring) |
| `README.md` | Workshop-facing (partially stale) |
| `DOCUMENTATION.md` | Full design log (**gitignored** in legacy — do not repeat that mistake) |
| No `package.json`, no `vercel.json` | Static deploy |

**Script load order (legacy):** `questions → sounds → ui → bomb → game`.

### 2.2 Screens and flow

| Screen key | DOM ID (legacy) | Dramatic shutter? |
|------------|-----------------|-------------------|
| `start` | `#screen-start` | Yes (return) |
| `briefing` | `#screen-briefing` | Yes |
| `chamber` | `#screen-chamber` | Yes + door SFX |
| `question` | `#screen-question` | No |
| `chamberClear` | `#screen-chamber-clear` | Yes + fanfare |
| `fail` | `#screen-fail` | Yes + glitch |
| `results` | `#screen-results` | Yes + defuse + confetti + fanfare |

```
start → briefing → chamber intro × N
  → question loop (linear, no back)
    → each answer/timeout advance cuts a wire
    → full timeout → explode → fail → retry → start
  → chamber clear → next chamber OR results
results → restart → start
```

### 2.3 Required UI surfaces (parity)

**Chrome / FX**

- Chamber atmosphere layer
- Vault shutter overlay
- Confetti canvas
- Score-pop container
- Snip overlay (“SNIP”)
- Audio dock (mute, SFX volume, music volume)
- Bomb stage (SVG, legend, status, collapse toggle, explosion flash)
- Timer urgency vignette
- Vault progress map (4 chambers × question dots)

**Start**

- Player name input + validation error
- Start mission CTA
- Practice CTA (**restore — missing in legacy HTML**)
- Optional start leaderboard panel

**Briefing**

- Mode label (full / practice)
- Begin mission CTA
- Optional skip control (null-guarded historically)

**Chamber intro**

- Chamber number / total / icon / name / description
- Enter chamber CTA

**Question**

- HUD: score, chamber, progress
- Ring timer + text
- Type badge (Multiple Choice / Fill / Select All)
- Question text + options / fill input / checkboxes
- Debrief panel
- Hint line (keyboard shortcuts)

**Chamber clear**

- Name, message, chamber score, next CTA

**Fail**

- Message, detail, correct answer reveal, score so far, retry

**Results**

- Tier badge / eyebrow / title / score / message / player name
- Per-chamber breakdown
- Answer review list
- Leaderboard panel
- Restart CTA

### 2.4 `GAME_DATA` shape (content schema baseline)

```js
{
  title: "The Data Governance Vault",
  timeBonusMax: 50,
  shuffleQuestions: true,
  shuffleOptions: true,
  leaderboard: {
    showToUsers: false,
    facilitatorParam: "facilitator"
  },
  practice: {
    timeLimitMin: 90
  },
  tiers: [
    { minScore: 4500, eyebrow: "Governance Champion", title: "Flawless Escape!", message: "…" },
    { minScore: 3000, eyebrow: "Vault Specialist", title: "You Escaped!", message: "…" },
    { minScore: 1500, eyebrow: "Almost There", title: "Door Unlocked… Barely", message: "…" },
    { minScore: 0,    eyebrow: "Training Required", title: "Reality Check", message: "…" }
  ],
  chambers: [ /* 4 × 10 questions */ ]
}
```

**Chamber fields:** `id`, `name`, `icon`, `iconLabel`, `wireColor`, `description`, `questions[]`

**Chamber IDs (fixed order):** `python`, `powerbi`, `alm`, `sop`

**Wire / theme colors (source of truth — unify CSS tokens to these):**

| Chamber | `wireColor` | iconLabel | icon path |
|---------|-------------|-----------|-----------|
| python | `#3dd68c` | PY | `assets/icons/python.png` |
| powerbi | `#59c2ff` | PBI | `assets/icons/power-bi.png` |
| alm | `#f0a030` | ALM | `assets/icons/power-apps.png` |
| sop | `#f07178` | SOP | `assets/icons/sop.png` |

> Legacy CSS tokens `--chamber-alm` / `--chamber-sop` **differ** from wire colors. New build must use one palette.

**Question types**

| Type | Required fields |
|------|-----------------|
| `choice` (default) | `id`, `text`, `options[]`, `correct` (number index), `timeLimit`, `basePoints`, `explain?` |
| `fill` | `id`, `type:"fill"`, `text`, `answers[]` (string[]), `timeLimit`, `basePoints`, `explain?` |
| `checkbox` | `id`, `type:"checkbox"`, `options[]`, `correct` (number[]), `timeLimit`, `basePoints`, `explain?` |

**Content constants in live set**

- 4 chambers × 10 questions = **40**
- Every question: `timeLimit: 30`, `basePoints: 100`
- All questions have `explain`
- Approx mix: ~25 choice, ~10 checkbox, ~5 fill
- Max theoretical score: `40 × (100 + 50) = 6000`
- Total timer budget if sequential: `40 × 30 = 1200s` (~20 min)

### 2.5 Scoring rules (exact — port as pure functions)

```
if incorrect OR timedOut:
  points = 0
else:
  bonus = round((timeLeft / effectiveTimeLimit) * timeBonusMax)
  points = basePoints + bonus
```

| Rule | Detail |
|------|--------|
| Wrong answer | 0 pts; **still cuts wire**; feedback; auto-advance |
| Timeout (full) | 0 pts recorded; detonation sequence |
| Timeout (practice) | 0 pts; wire cut; continue |
| Checkbox grading | Exact set match after sort; no partial credit |
| Fill grading | Normalize: trim, lowercase, collapse whitespace; match any `answers[]` |
| Empty submit | Ignored (do not lock) — empty fill or zero checkboxes |
| Tier | Highest tier where `score >= minScore` |
| Practice | Do **not** persist to leaderboard; label results as practice |

### 2.6 Fail / timing delays (parity)

| Event | Delay |
|-------|-------|
| Correct/wrong feedback → next question | 1600ms (2200ms if debrief) |
| Practice timeout → next | 2200ms |
| Full timeout → explode | 500ms |
| Explode → fail screen | 2400ms |
| Vault shutter midpoint / end | ~290ms / ~900ms |
| Score pop lifetime | 1200ms |
| Correct celebrate bloom | 750ms |

**Fail condition (full only):** any question timer reaches 0.  
**Wrong answers do not end the run** (unless an improvement in §8.4 is adopted).

### 2.7 URL parameters

| Param | Effect |
|-------|--------|
| `?debrief=1` | Debrief after every question in full mode |
| `?facilitator=1` | Facilitator mode (param name configurable via content) |
| `?chamber=` | Start chamber: index `0–3`, or id (`python`…), or partial name |
| `?practice=1` | **Add in new build** (legacy has no URL; only dead button hook) |

### 2.8 Keyboard & navigation

| Input | Context | Action |
|-------|---------|--------|
| `1`–`4` | Choice question, unlocked | Submit option index |
| `Enter` | Checkbox | Submit selection |
| `Enter` | Fill | Form submit |
| Browser back | During mission / chamber clear | Block casual back (history push + popstate re-push) |

### 2.9 Accessibility (must preserve)

- `role="timer"` + `aria-live="polite"` on timer
- Options: listbox/option (or equivalent accessible pattern)
- Name field: required + alert error
- Visually hidden labels on volume controls
- Bomb: aria-labels; decorative elements `aria-hidden`
- Bomb collapse: `aria-expanded`
- `prefers-reduced-motion: reduce`: skip confetti, shutter drama, score pop, snip, shake, bloom, option stagger, score count-up; simplify explode; skip SFX when reduced motion

### 2.10 localStorage keys

| Key | Value | Purpose |
|-----|-------|---------|
| `vault-leaderboard` | JSON top 10 `{name, score, tier, date}` | Local board |
| `vault-sound-muted` | `"1"` / `"0"` | Mute |
| `vault-music-volume` | `"0"`–`"1"` | Music gain |
| `vault-sfx-volume` | `"0"`–`"1"` | SFX gain |

**New build:** keep these keys for continuity **or** migrate once with a versioned key + one-time read of old keys.

### 2.11 Audio system

**BGM playlist (loop through tracks):**

1. `assets/audio/01-ticking-mission.mp3`
2. `assets/audio/02-time-is-ticking.mp3`
3. `assets/audio/03-thinking-time.mp3`

**Defaults:** music `0.2`, SFX `0.5` (sync UI sliders on load from storage).

**SFX API (implement all; wire all used):**

| Method | Used | Notes |
|--------|------|-------|
| `unlock` | Yes | First user gesture starts audio context + BGM |
| `tick` | Yes | Timer ≤5s |
| `snip` | Yes | Wire cut |
| `correct` / `wrong` | Yes | Feedback |
| `boom` | Yes | Detonation |
| `fanfare` | Yes | Chamber clear + results |
| `door` | Yes | Chamber intro |
| `heartbeat` | Unused in legacy | Either implement meaningfully (critical timer) or delete |
| `toggleMute` / volume setters / `init` | Yes | Persist prefs |

### 2.12 Bomb widget API (parity)

```
init(chambers)
show() / hide()
reset()
cut(chamberIndex, questionIndex)
setDefused()
setTimerCritical(bool)   // display "!!" when timer ≤5s
explode()
```

- 40 wires; LED shows remaining count (padded)
- ≤3 wires remaining → critical visual (stage + body class)
- Timer ≤5s → amber `!!` display (separate from wire-count critical)
- Wire id scheme: `wire-{chamberIndex}-{questionIndex}`

### 2.13 UI spectacle features (parity)

- Confetti on results (~140 pieces, gold/green/blue/red/cream)
- Vault shutter with “SECURE” seal
- Debrief panel from `explain` (fallback to correct answer text)
- Progress map: 4 steps × 10 dots; done / active / locked
- Floating score pop `+pts`
- Snip overlay on wire cut
- Correct bloom
- Timer warning (≤10s) / danger (≤5s) body classes
- Per-chamber `data-chamber` + CSS variable for atmosphere
- Answer review on results
- Facilitator / practice body mode badges

### 2.14 Design tokens (legacy — consolidate)

```
--bg-deep #14161c
--bg-panel #1c1f27
--bg-card #252932
--border #3d4450
--text #ebe8e1
--text-muted #9a968c
--accent #c9921a
--success #3dd68c
--danger #e05a62
--warning #d4a017
--font-display Bebas Neue
--font-body IBM Plex Sans
--font-mono JetBrains Mono
--radius 6px
--bomb-layout-share 40%
```

Fonts: Google Fonts (or self-host in new build for workshop offline resilience).

### 2.15 Assets to copy

**Icons**

- `assets/icons/python.png`
- `assets/icons/power-bi.png`
- `assets/icons/power-apps.png`
- `assets/icons/sop.png`

**Runtime audio**

- `assets/audio/01-ticking-mission.mp3`
- `assets/audio/02-time-is-ticking.mp3`
- `assets/audio/03-thinking-time.mp3`

**Brand**

- `favicon.svg`
- `og-image.svg` (deploy with **absolute** OG URLs)

**Authoring sources (optional copy)**

- `src/Governance for Python & Power BI - Draft v1.docx`
- Raw MP3 masters in `src/` (do not ship duplicates in `public/` twice)

### 2.16 Deploy (legacy)

- Static site on Vercel: Framework **Other**, empty build, output `.`
- Speed Insights stub present; `speedInsightsBeforeSend` defined but never registered
- Shared leaderboard / KV: documented, not implemented
- No `vercel.json` in repo

### 2.17 Known legacy debt (must fix in rewrite)

1. Practice mode unreachable (no `#btn-practice`, no `?practice=1`)
2. `GameSounds.heartbeat` dead API
3. Speed Insights beforeSend never registered
4. README stale (“3 questions each”; missing audio/spectacle in tree)
5. DOCUMENTATION tiers/sounds stale; file gitignored
6. Chamber CSS tokens ≠ wireColors (ALM/SOP)
7. HTML volume defaults ≠ JS defaults until init
8. Shuffle **mutates** in-memory content for the page session
9. OG image relative URLs break social previews
10. No `vercel.json`
11. Leaderboard per-browser only
12. Fill/checkbox keyboard uneven vs choice
13. Wrong answers never risk fail (design choice — revisit §8.4)
14. Duplicate audio under `src/` and `assets/`
15. `game.js` monolith; hard to test
16. Three overlapping CSS files

---

## 3. Rebuild verdict (decisions)

### 3.1 What NOT to do

- Do **not** rebuild as Next.js / full React SSR “because modern”
- Do **not** add auth, user accounts, or analytics dashboards before the core loop is sharper
- Do **not** add a heavy component library (MUI, Chakra, etc.)
- Do **not** require a CMS before content schema + JSON editing works
- Do **not** gitignore the main documentation again

### 3.2 Recommended stack

| Layer | Choice | Why |
|-------|--------|-----|
| Build | **Vite + TypeScript** | Fast DX; ships static; typed modules |
| UI | **Lit** *or* **Preact** | Tiny runtime; bomb as one component |
| State | **XState** *or* hand-rolled FSM | Screens already are a state machine; testable |
| Content | **Zod** (+ JSON or YAML) | Validate 40 questions at build/dev time |
| Unit tests | **Vitest** | Pure engine tests without browser |
| E2E (optional P2) | **Playwright** | Workshop smoke: start → answer → results |
| Leaderboard (P1) | **Cloudflare Worker + KV** *or* **Supabase** *or* **Vercel KV** | Room-scoped shared board |
| Deploy | Static host (Vercel/Netlify/CF Pages) | Same workshop friction |

**Default recommendation:** Vite + TypeScript + Preact (or Lit) + Zod + Vitest + optional Cloudflare Worker for rooms.

### 3.3 Architecture principles

1. **Engine has zero DOM.** Scoring, timers, shuffle, grading, tiers = pure TS.
2. **UI has zero scoring rules.** UI renders state + sends intents (answer, timeout tick, next).
3. **Content is data.** Validated at build; never mutated in place — always clone then shuffle.
4. **Audio and bomb are adapters.** Swappable; game engine does not know SVG.
5. **Modes are flags on session**, not copy-pasted flows.
6. **Offline-first for play.** Leaderboard network is optional; game must work if API is down.

### 3.4 Target module layout (new repo)

```
/
├── IMPROVEMENT-PLAN.md          # this file
├── README.md                    # workshop + contrib
├── package.json
├── vite.config.ts
├── tsconfig.json
├── vercel.json                  # or host-equivalent
├── index.html
├── public/
│   ├── favicon.svg
│   ├── og-image.svg
│   ├── icons/
│   └── audio/
├── content/
│   ├── game.json                # title, tiers, flags
│   ├── chambers/
│   │   ├── python.json
│   │   ├── powerbi.json
│   │   ├── alm.json
│   │   └── sop.json
│   └── schema.ts                # Zod schemas
├── src/
│   ├── main.ts
│   ├── app/                     # shell, routing between screens
│   ├── engine/                  # FSM, score, grade, shuffle, timers
│   ├── content/                 # load + validate + clone
│   ├── components/
│   │   ├── bomb/
│   │   ├── screens/
│   │   ├── hud/
│   │   └── audio-dock/
│   ├── audio/
│   ├── leaderboard/
│   │   ├── local.ts
│   │   └── remote.ts            # room API client
│   └── styles/
│       ├── tokens.css
│       ├── base.css
│       ├── bomb.css
│       └── spectacle.css
├── server/                      # optional Worker for shared board
│   └── leaderboard/
└── tests/
    ├── engine/
    └── content/
```

### 3.5 Engine / FSM sketch

**States:** `start | briefing | chamberIntro | question | feedback | chamberClear | fail | results`

**Context (minimum):**

```ts
{
  mode: "full" | "practice"
  playerName: string
  chamberIndex: number
  questionIndex: number
  totalScore: number
  chamberScores: number[]
  answers: AnswerRecord[]   // per question: correct?, points, timeLeft, selected
  sessionContent: GameData  // cloned + shuffled copy
  flags: { debrief: boolean; facilitator: boolean; startChamber: number }
  locked: boolean
  timeLeftMs: number
  gameOver: boolean
}
```

**Events (minimum):** `START`, `BEGIN_MISSION`, `ENTER_CHAMBER`, `SUBMIT_ANSWER`, `TICK`, `TIMEOUT`, `ADVANCE`, `NEXT_CHAMBER`, `RETRY`, `RESTART`

---

## 4. Content system (rebuild)

### 4.1 Goals

- Non-devs can edit JSON safely
- Invalid content fails **at build/dev**, not mid-workshop
- Shuffle never mutates source files or the imported module singleton
- Optional later: Markdown/YAML authoring (§8.5)

### 4.2 Zod schema requirements

Validate:

- Exactly 4 chambers (or configurable `min/max` with workshop default 4)
- Unique question `id`s globally
- Choice: `correct` in range of `options`
- Checkbox: every index in `correct` in range; non-empty
- Fill: `answers` non-empty strings
- `timeLimit > 0`, `basePoints >= 0`
- Tier list sorted by `minScore` descending; includes a 0 floor
- Icon paths resolve under `public/`

### 4.3 Build-time checks

- `npm run check:content` — schema + uniqueness + asset existence
- Fail CI / `vite build` if content invalid
- Snapshot test: question counts per chamber = 10 (or configured)

### 4.4 Content migration from legacy

1. Export `window.GAME_DATA` from `js/questions.js` into `content/`
2. Split chambers into separate files
3. Keep all `explain` text
4. Fix any legacy `answer` singular → `answers[]`
5. Re-verify ALM/SOP placeholders vs org-specific content (still may be placeholders)

---

## 5. Gameplay / UX improvements

### 5.1 P0 — must ship with rewrite

| ID | Improvement | Detail |
|----|-------------|--------|
| P0-1 | Practice mode UI + URL | `#`/`Start` practice button + `?practice=1`; briefing copy differs |
| P0-2 | Immutable shuffle | Deep clone session content; Fisher–Yates on clone only |
| P0-3 | Typed content schema | Zod + build validation |
| P0-4 | Pure engine + tests | Scoring, grading, tiers, timeout rules unit-tested |
| P0-5 | Docs that ship | README + this plan + short `docs/FACILITATOR.md` committed |
| P0-6 | Absolute OG URLs | Env-based site URL for `og:image` / twitter cards |
| P0-7 | `vercel.json` (or host config) | SPA/static headers, cache for audio/icons |
| P0-8 | Unify colors | One chamber palette shared by wires, CSS, progress |
| P0-9 | Restore parity checklist | All screens, SFX, bomb, shutter, reduced-motion |

### 5.2 P1 — workshop value upgrades

| ID | Improvement | Detail |
|----|-------------|--------|
| P1-1 | Shared room leaderboard | Create/join room code; POST score; facilitator view polls/refreshes |
| P1-2 | Wrong-answer stakes | Pick one policy (§5.2.1) and implement consistently |
| P1-3 | Heartbeat SFX | Use under timer danger **or** remove API |
| P1-4 | Keyboard parity | Document + support Enter for all types; optional letter keys |
| P1-5 | Facilitator QR / link helper | Screen or README snippet: participant URL, debrief URL, room code |
| P1-6 | Speed Insights properly | Register beforeSend to strip PII query params if used |
| P1-7 | Self-host fonts option | Workshop rooms with flaky Google Fonts access |

#### 5.2.1 Wrong-answer stakes (choose one before coding)

| Option | Behavior | Pros | Cons |
|--------|----------|------|------|
| **A. Strikes** | 3 wrong → fail (configurable) | Clear tension | Harsh for learning workshops |
| **B. Soft fail** | Wrong shortens next timer or removes speed bonus eligibility | Keeps escape possible | More rules to explain |
| **C. Wire integrity** | Wrong answers cut a “penalty wire” / don’t cut progress wire | Metaphor-rich | Needs bomb redesign |
| **D. Keep legacy** | Wrong never fails; only timeout fails | Familiar; low friction | Can escape with low knowledge |

**Recommendation for workshops:** **D** as default, with **A** available via `content/game.json` flag `wrongAnswerStrikes: 0 | 3` so facilitators can choose.

### 5.3 P2 — nice to have

| ID | Improvement | Detail |
|----|-------------|--------|
| P2-1 | Markdown/YAML chamber authoring | Compile to JSON at build |
| P2-2 | Per-chamber practice picker | Practice only ALM, etc. |
| P2-3 | Playwright smoke tests | CI path for critical flow |
| P2-4 | i18n shell | Only if multi-language workshops appear |
| P2-5 | Difficulty presets | Shorter timers / fewer questions for demos |
| P2-6 | Post-game export | Download CSV of answers for facilitator debrief |
| P2-7 | Pause / facilitator freeze | Freeze all timers for discussion mid-run |
| P2-8 | Question bank larger than 10 | Random draw N per chamber from bank |

### 5.4 Explicitly out of scope (until asked)

- User accounts / SSO
- Real-time multiplayer same-bomb cooperation
- Native mobile apps
- CMS admin UI
- AI-generated questions at runtime
- Payment / licensing gates

---

## 6. Shared leaderboard design (P1)

### 6.1 Goals

- Multiple participants on different devices see one workshop ranking
- No accounts
- Room dies or expires after workshop (TTL)
- Local leaderboard remains as offline fallback

### 6.2 UX flow

1. Facilitator opens `?facilitator=1` → **Create room** → gets code `AB7K`
2. Participants open base URL (or `?room=AB7K`) → enter name → play
3. On escape (full mode), client POSTs `{ room, name, score, tier, finishedAt }`
4. Facilitator board auto-refreshes top 10–20
5. Practice runs never POST

### 6.3 API sketch

```
POST /api/rooms              → { roomCode, expiresAt }
GET  /api/rooms/:code        → { entries: [...] }
POST /api/rooms/:code/scores → { ok }  body: { name, score, tier }
```

**Rules**

- Name length limit; sanitize display text
- One score per name per room (update if higher) **or** append attempts — decide and document (recommend: keep best)
- Rate limit by IP
- TTL 24h default
- CORS allow workshop origin(s)

### 6.4 Implementation options

| Option | When to pick |
|--------|--------------|
| Cloudflare Worker + KV | Simple, cheap, edge |
| Vercel KV / Redis | Already on Vercel |
| Supabase table | Want SQL + dashboard |

**Client:** `leaderboard/remote.ts` with graceful fallback to `local.ts` if network fails.

---

## 7. Audio & spectacle plan

### 7.1 Must port

- All used SFX + BGM playlist
- Mute + dual volume sliders + persistence
- Unlock on first gesture
- Reduced-motion silences SFX
- Shutter, confetti, snip, bloom, score pop, urgency classes

### 7.2 Improvements

- Single audio module with typed event names
- Preload BGM after unlock; handle missing file without crashing game
- Decide heartbeat: wire to `timer-danger` pulse **or** delete
- Compress/normalize MP3 loudness so tracks feel even
- Keep masters in `src/audio-masters/` (not public); ship only optimized `public/audio/`

### 7.3 Visual polish (do not overbuild)

- One token file; delete CSS duplication
- Keep vault aesthetic (deep steel, gold accent, mono timer)
- Mobile: bomb may collapse by default; question column primary
- Fixed workshop laptop view remains primary target

---

## 8. Documentation plan (new repo)

Commit all of these:

| Doc | Contents |
|-----|----------|
| `README.md` | Purpose, live URL, how to run, workshop links, customize content, deploy |
| `IMPROVEMENT-PLAN.md` | This file (living plan; update checkboxes as done) |
| `docs/FACILITATOR.md` | URL flags, room codes, debrief tips, timing expectations |
| `docs/CONTENT.md` | Schema, examples for choice/fill/checkbox, validation commands |
| `docs/ARCHITECTURE.md` | Engine vs UI, FSM diagram, leaderboard |
| `docs/TEST-CHECKLIST.md` | Manual workshop QA (§14) |

**Correct facts for docs (fix legacy staleness):**

- 4 chambers × **10** questions (not 3)
- Tiers: **4500 / 3000 / 1500 / 0**
- Sounds include **MP3 BGM** + Web Audio SFX
- Practice via button + `?practice=1`

---

## 9. Testing strategy

### 9.1 Unit (required)

- Grade choice / checkbox / fill (including normalization)
- Score formula boundaries (`timeLeft=0`, full time, mid)
- Tier selection
- Shuffle: source unchanged; clone shuffled
- Effective time limit practice vs full
- Timeout transition: full → fail path; practice → continue
- Chamber skip resolution (index, id, name)

### 9.2 Content tests (required)

- Schema valid
- 40 questions, unique ids
- Assets exist

### 9.3 Manual QA (required before workshop)

See §14.

### 9.4 E2E (P2)

- Start → answer all with mocked timers → results
- Timeout → fail
- Practice path
- Facilitator local board save

---

## 10. Deploy & ops

### 10.1 Static app

```
Framework: Vite
Build: npm run build
Output: dist/
```

### 10.2 `vercel.json` (minimum)

- Correct SPA/static routes
- Long-cache for hashed assets; shorter for `index.html`
- Security headers baseline (`nosniff`, `referrer-policy`)

### 10.3 Environment variables

| Var | Purpose |
|-----|---------|
| `VITE_SITE_URL` | Absolute OG/meta URLs |
| `VITE_LEADERBOARD_URL` | Optional API base |
| Server secrets | KV tokens — never in client |

### 10.4 Workshop runbook (facilitator)

1. Deploy / confirm live URL
2. Create room (if shared board enabled)
3. Share participant link (+ room)
4. Open facilitator view on projector
5. Optional: `?debrief=1` for teaching runs
6. After session: export/screenshot board; room expires

---

## 11. Accessibility, privacy, security

### 11.1 A11y

- Preserve reduced-motion behavior
- Focus management on screen changes (move focus to heading or primary CTA)
- Color contrast for timer danger states
- Do not rely on color alone for correct/wrong (icons/text)

### 11.2 Privacy

- Player names stored in localStorage and/or room KV — disclose in facilitator doc
- Strip sensitive query params from analytics (`debrief`, names if any)
- No third-party trackers beyond optional host analytics

### 11.3 Security

- Sanitize names for XSS in leaderboard render
- Rate-limit score POST
- Validate score server-side against max possible (6000) to reduce obvious spoofing (best-effort; client game can always cheat)

---

## 12. Phased execution plan

> Estimates assume one developer familiar with the domain.  
> Total to workshop-ready rewrite with P0: **~5 days**.  
> P0 + P1 shared board + stakes flag: **~6–7 days**.

### Phase 0 — Bootstrap (half day)

**Goal:** Empty Vite+TS app runs; assets copied; CI script stubs.

- [ ] Create repo from Vite TypeScript template (+ Preact or Lit)
- [ ] Copy icons, audio, favicon, og-image, question content
- [ ] Add ESLint/Prettier optional; Vitest wired
- [ ] Commit `IMPROVEMENT-PLAN.md`, draft README
- [ ] `npm run dev` shows placeholder shell

**Exit:** Dev server green; assets in `public/`.

### Phase 1 — Engine (1–1.5 days)

**Goal:** Pure game logic with tests; no pretty UI required.

- [ ] Zod schemas + load content
- [ ] Clone + shuffle helpers
- [ ] Grade functions (choice/fill/checkbox)
- [ ] Score + tier functions
- [ ] FSM with all states/events
- [ ] Timer tick/timeout rules for full vs practice
- [ ] URL flag parser (`debrief`, `facilitator`, `chamber`, `practice`)
- [ ] Unit tests for §9.1

**Exit:** `npm test` covers engine; CLI or tiny harness can simulate a full run.

### Phase 2 — UI screens + bomb + audio (2 days)

**Goal:** Feature parity with legacy playable experience.

- [ ] Screen components for all 7 screens
- [ ] HUD, progress map, debrief panel
- [ ] Bomb widget port (SVG wires, cut, explode, critical)
- [ ] Audio module + dock + persistence
- [ ] Spectacle: shutter, confetti, snip, bloom, urgency
- [ ] Reduced-motion paths
- [ ] Keyboard shortcuts
- [ ] Back-button guard
- [ ] Practice CTA + `?practice=1`
- [ ] Facilitator badge + local leaderboard
- [ ] Tokens CSS unified (fix ALM/SOP color drift)

**Exit:** Manual playthrough matches legacy feel; practice reachable.

### Phase 3 — Hardening & docs (0.5–1 day)

**Goal:** Workshop-safe.

- [ ] Absolute OG URLs
- [ ] Host config (`vercel.json`)
- [ ] Content check in build
- [ ] README / FACILITATOR / CONTENT docs (accurate numbers)
- [ ] Manual checklist §14 executed
- [ ] Remove dead APIs or wire heartbeat
- [ ] Deploy preview URL

**Exit:** P0 complete; ready for a real workshop dry-run.

### Phase 4 — Shared leaderboard + stakes (1–1.5 days) [P1]

- [ ] Room create/join UX
- [ ] API + KV/store + TTL
- [ ] Client remote adapter + fallback
- [ ] `wrongAnswerStrikes` config (default 0)
- [ ] Facilitator auto-refresh board
- [ ] Rate limit + name sanitize + max score clamp

**Exit:** Two browsers, one room, ranked scores visible to facilitator.

### Phase 5 — Polish backlog [P2]

- [ ] Per-chamber practice picker
- [ ] CSV export of answer review
- [ ] Playwright smoke
- [ ] Markdown authoring pipeline
- [ ] Font self-hosting
- [ ] Question bank / draw-N
- [ ] Facilitator pause

---

## 13. Day-by-day schedule (suggested)

| Day | Focus | Done when |
|-----|-------|-----------|
| 1 | Phase 0 + Engine schemas/grade/score | Tests for grading + scoring pass |
| 2 | FSM + timers + URL flags | Simulated full + practice + fail paths pass |
| 3 | Screens shell + question UI + HUD | Can play without bomb polish |
| 4 | Bomb + audio + spectacle | Feels like the vault |
| 5 | Practice + docs + deploy + QA checklist | Dry-run ready |
| 6 | Shared leaderboard API + UI | Two-device room works |
| 7 | Buffer: stakes flag, bugs, facilitator doc polish | Workshop pack complete |

---

## 14. Acceptance criteria & test checklist

### 14.1 Functional

- [ ] Enter name → full mission → briefing → 4 chambers × 10 questions
- [ ] Each advance cuts the correct wire
- [ ] Correct answer awards `basePoints + speed bonus`
- [ ] Wrong answer awards 0, cuts wire, continues
- [ ] Full timeout detonates and shows fail; retry returns to start
- [ ] Completing all chambers shows results + correct tier
- [ ] Answer review lists all questions with status
- [ ] Practice mode reachable; timeout does not detonate; no leaderboard save
- [ ] `?debrief=1` shows explanations
- [ ] `?facilitator=1` shows board + saves local scores
- [ ] `?chamber=alm` (and ids/indices) skips ahead; prior wires pre-cut
- [ ] `?practice=1` starts practice path
- [ ] Mute persists across reload
- [ ] Volume sliders persist
- [ ] Shuffle does not change a second run’s source order after reload (source file stable); within a session, restarts use a fresh shuffle clone
- [ ] Reduced motion: no confetti/shutter drama/SFX spam
- [ ] Keyboard 1–4 works for choice
- [ ] Checkbox exact-match grading; fill normalization works
- [ ] Empty submit does not lock the question

### 14.2 Content / build

- [ ] Invalid question fails `check:content` / build
- [ ] All icons and MP3s 200 OK in production
- [ ] OG tags absolute

### 14.3 Leaderboard (P1)

- [ ] Facilitator creates room
- [ ] Two clients submit scores into same room
- [ ] Practice does not submit
- [ ] Offline/API fail falls back to local without breaking results screen

### 14.4 Workshop dry-run

- [ ] Full run completes in ~20–30 minutes for target audience
- [ ] Projector/facilitator view readable
- [ ] Sound levels comfortable on laptop speakers
- [ ] Content accuracy signed off by governance owner

---

## 15. Risk register

| Risk | Impact | Mitigation |
|------|--------|------------|
| Rewrite takes too long for next workshop | High | Phase 2 parity first; delay P1 board |
| Content edits break live session | High | Zod + build checks; freeze content tag for event |
| Shared board abuse / spoofed scores | Medium | Rate limit, max clamp, room TTL |
| Audio autoplay policies | Medium | Unlock on first click only |
| Large MP3s slow first load | Medium | Compress; preload after unlock |
| Over-design (Next, CMS, auth) | High | This plan’s §3.1 veto list |
| Color/token drift returns | Low | Single tokens file; Story/checklist |

---

## 16. Migration checklist (legacy → new workspace)

Copy from legacy repo:

- [ ] `js/questions.js` content → `content/**`
- [ ] `assets/icons/*` → `public/icons/`
- [ ] `assets/audio/*` → `public/audio/`
- [ ] `favicon.svg`, `og-image.svg`
- [ ] Optional: `src/*.docx` and audio masters into `authoring/` (not deployed)
- [ ] This `IMPROVEMENT-PLAN.md`
- [ ] Any facilitator notes from local `DOCUMENTATION.md` § decision log worth keeping → `docs/ARCHITECTURE.md` appendix

Do **not** copy blindly:

- [ ] Three CSS files as-is (re-derive tokens once)
- [ ] IIFE globals (`window.GAME_DATA` pattern)
- [ ] Gitignore rule that excludes documentation
- [ ] Dead `heartbeat` without a decision
- [ ] Stale README claims (3 questions, old tiers)

---

## 17. Definition of done (project-level)

The rewrite is done for workshop use when:

1. All **P0** items in §5.1 are complete  
2. §14.1 and §14.2 checklists pass  
3. Docs in §8 are committed and match the running app  
4. A preview/production URL is deployed  
5. One full dry-run with a real content owner has signed off  

**P1** (shared leaderboard) is done when §14.3 passes.  
**P2** items never block a workshop.

---

## 18. Open decisions (resolve on Day 1 of new workspace)

Record answers here when decided:

| # | Question | Options | Decision |
|---|----------|---------|----------|
| 1 | UI library | Lit / Preact / Solid | _TBD_ |
| 2 | FSM library | XState / hand-rolled | _TBD_ |
| 3 | Wrong-answer policy default | A/B/C/D (§5.2.1) | _TBD — recommend D + optional strikes_ |
| 4 | Shared board host | CF Worker / Vercel KV / Supabase / defer | _TBD_ |
| 5 | Package name / repo name | — | _TBD_ |
| 6 | Keep localStorage key names | yes / migrate | _TBD — recommend yes_ |
| 7 | Self-host fonts in v1 | yes / no | _TBD_ |

---

## 19. Quick reference — workshop URLs (target)

| Audience | URL pattern |
|----------|-------------|
| Participants | `https://<host>/` |
| Participants + room | `https://<host>/?room=AB7K` |
| Facilitator | `https://<host>/?facilitator=1` |
| Debrief teaching run | `https://<host>/?debrief=1` |
| Practice | `https://<host>/?practice=1` |
| Skip to chamber | `https://<host>/?chamber=python` (or `0`–`3`) |
| Combinations | `?facilitator=1&room=AB7K`, `?debrief=1&chamber=alm`, etc. |

---

## 20. Appendix A — Legacy DOM ID map (optional parity)

Use if you want 1:1 HTML id compatibility for CSS porting:

`screen-start`, `player-name`, `player-name-error`, `btn-start`, `btn-practice` (**restore**), `start-leaderboard`, `screen-briefing`, `briefing-mode`, `btn-briefing-go`, `screen-chamber`, `chamber-number`, `chamber-total`, `chamber-icon`, `chamber-name`, `chamber-desc`, `btn-enter-chamber`, `screen-question`, `hud-score`, `hud-chamber`, `hud-progress`, `timer`, `timer-ring`, `timer-text`, `question-card`, `question-type-badge`, `question-text`, `options`, `debrief-panel`, `question-hint`, `screen-chamber-clear`, `clear-chamber-name`, `clear-chamber-msg`, `clear-chamber-score`, `btn-next-chamber`, `screen-fail`, `fail-message`, `fail-detail`, `fail-answer`, `fail-score`, `btn-retry`, `screen-results`, `tier-badge`, `results-tier-eyebrow`, `results-title`, `results-score`, `results-message`, `results-player`, `breakdown`, `answer-review`, `results-leaderboard`, `btn-restart`, `chamber-atmosphere`, `vault-shutter`, `confetti-canvas`, `score-pop-container`, `snip-overlay`, `audio-dock`, `btn-sound`, `sfx-volume`, `music-volume`, `bomb-stage`, `btn-bomb-toggle`, `explosion-flash`, `bomb-svg`, `bomb-legend`, `bomb-status`, `timer-urgency`, `vault-progress`, `app`

---

## 21. Appendix B — Scoring examples

| Case | timeLimit | timeLeft | base | bonus max | points |
|------|-----------|----------|------|-----------|--------|
| Instant correct | 30 | 30 | 100 | 50 | 150 |
| Half time left | 30 | 15 | 100 | 50 | 125 |
| Last second correct | 30 | 1 | 100 | 50 | 102 |
| Wrong | 30 | 20 | 100 | 50 | 0 |
| Timeout | 30 | 0 | 100 | 50 | 0 |
| Practice timer 90, half left | 90 | 45 | 100 | 50 | 125 |

---

## 22. Appendix C — Progress tracking

Update as you execute in the new workspace:

| Phase | Status | Date | Notes |
|-------|--------|------|-------|
| 0 Bootstrap | Not started | | |
| 1 Engine | Not started | | |
| 2 UI parity | Not started | | |
| 3 Hardening | Not started | | |
| 4 Shared board | Not started | | |
| 5 P2 polish | Not started | | |

---

**End of plan.**  
Next action in the new workspace: resolve §18 open decisions (especially UI library + board host), then start Phase 0.
