# Tetris — AI Model Evaluation PRD

> This document is a **special-purpose PRD for evaluating AI-model implementation quality**.
> Different AI models receive this same spec and each implements a complete web Tetris build.
> Results are then compared on **cumulative play time** and **player star ratings**.

---

## 📌 Instructions to the Implementing AI (Read First)

You are receiving this PRD as a standalone build brief. Follow these rules:

1. **Do not ask the user clarifying questions.** Every decision not explicitly fixed in this document is left to your judgement — make it and move on. The user will not be available during implementation.
2. **Implement the entire PRD end-to-end in a single run.** Work autonomously through every required section (§2 through §10 and §13 checklist).
3. **Write and run tests.** Include automated checks that exercise core logic (SRS rotation, 7-bag fairness, scoring formulas, line-clear edge cases, lock delay cap, hold rules, perfect clear detection) and run them before declaring completion. Also run a live smoke check (e.g. static file server + headless or manual verification) to confirm the game boots and is playable.
4. **Do not stop mid-way to confirm.** Do not send status updates. Do not ask whether to continue. Just build it.
5. **Only report back once everything is done.** When and only when every item on the §13 submission checklist passes and all tests are green, produce a single completion report to the user summarizing:
   - What was implemented (brief feature list)
   - Test results (how many passed / how they were run)
   - How to run the game locally
   - Any creative choices you made in the DANCER area (§8)
   - Any ambiguity you resolved yourself (note the decision, not a question)
6. **Fairness constraint.** §2–§7 specs must be implemented **exactly as stated** — same numbers, same keys, same formulas, same color hex values, same storage keys. Creative freedom is allowed **only** in §8 (DANCER area).

If you discover a true blocker that prevents completion, fix it or work around it with a reasonable default. Do not surface it as a question.

---

## 0. Purpose of This Document (Why This PRD Exists)

### 0.1 What is being evaluated
- A complete web-based Tetris build produced by an AI model that receives this PRD as its sole brief, and implements it **end-to-end** (spec → code → tests → polish).

### 0.2 Scoring Criteria
1. **Cumulative Play Time**
   - Unit: seconds (aggregated to minutes/hours for reporting)
   - Measured: wall-clock time spent in `GameState.Playing`
   - Excluded: Paused / Menu / GameOver states
   - Purpose: measures engagement and replay value across the total play length, not just session count.
2. **Player Star Rating**
   - Scale: 1–5 stars (integer)
   - Collected: in the Game Over scene
   - Aggregation: report mean, median, and sample size (n).

### 0.3 Fairness Principle
- Every functional spec / number / UI element defined in **§2 – §7** must be implemented **identically** across all model builds.
- Model-specific creativity is only permitted in the **§8 DANCER area**.
- Performance / input latency / frame rate must meet the same targets across every build.
- No external assets (image / audio files). Everything must be synthesized from code or vector-rendered.

---

## 1. Tech Stack (Fixed)

| Area | Choice | Notes |
| --- | --- | --- |
| Platform | Desktop web browser | Latest 2 versions of Chrome / Firefox / Edge / Safari |
| Language | HTML5 / CSS3 / Vanilla JavaScript (ES2020+) | **No bundlers / frameworks** |
| Modules | ES Modules (`<script type="module">`) | |
| Rendering | Canvas 2D API | No WebGL / SVG |
| Storage | `localStorage` | No IndexedDB / server storage |
| Sound | Web Audio API (synthesized only) | No external audio files |
| Font | Google Fonts `Press Start 2P` | This font only |
| Assets | **0 external image/audio files** | Sprites must be defined in code |

---

## 2. Gameplay Requirements (Fixed)

### 2.1 Board
- Playfield: **10 columns × 20 rows** (visible) + **2 hidden rows** above as spawn buffer
- Cell size: **30px**
- Blocks: 7 standard tetrominoes (I, O, T, S, Z, J, L)

### 2.2 Piece Generation
- **7-bag randomization** (each set of 7 contains all 7 tetrominoes exactly once)

### 2.3 Controls (Fixed Mapping)
| Key | Action |
| --- | --- |
| ← / → | Move left / right |
| ↓ | Soft drop |
| Space | Hard drop |
| ↑ / X | Rotate clockwise |
| Z | Rotate counter-clockwise |
| Shift / C | Hold |
| P / Esc | Pause |
| R | Restart (after game over) |

### 2.4 Input Timing (Fixed Values)
- **DAS (Delayed Auto Shift)**: `170ms`
- **ARR (Auto Repeat Rate)**: `50ms`
- **Soft Drop Factor**: `20×` gravity

### 2.5 Rotation System
- **SRS (Super Rotation System)** — standard implementation
- Wall-kick table: SRS standard (separate table for the I piece)

### 2.6 Modern Features (Fixed)
- **Hold**: one use per piece (until the piece locks)
- **Next Queue**: **5-piece** preview
- **Ghost Piece**: semi-transparent drop target (toggle in settings)
- **Lock Delay**: `500ms` grace, reset on move/rotate, **max 15** resets

---

## 3. Scoring & Level (Fixed Formulas)

### 3.1 Level Progression
- Start level: 1 (user-selectable 1–15 in settings)
- Level up: +1 every **10 lines** cleared
- Gravity formula:
  ```js
  gravityMs(level) = Math.pow(0.8 - (level - 1) * 0.007, level - 1) * 1000
  ```

### 3.2 Line Clear Scores
| Lines | Base Score |
| --- | --- |
| Single | `100 × level` |
| Double | `300 × level` |
| Triple | `500 × level` |
| Tetris | `800 × level` |

### 3.3 T-Spin Scores
| Action | Score |
| --- | --- |
| T-Spin (no lines) | `400 × level` |
| T-Spin Single | `800 × level` |
| T-Spin Double | `1200 × level` |
| T-Spin Triple | `1600 × level` |
| T-Spin Mini | `100 × level` |
| T-Spin Mini Single | `200 × level` |

T-Spin detection: **3-Corner Rule + 5th-kick exception**.

### 3.4 Back-to-Back (B2B)
- Successive Tetris or T-Spin line clears multiply that clear’s score by `1.5`.
- Broken by any 1–3 line clear that isn’t a T-Spin.

### 3.5 Combo
- Successive line clears award `50 × combo × level`.
- Reset when a lock places without clearing any line.

### 3.6 Other Scoring
- Soft Drop: `+1` per cell moved
- Hard Drop: `+2` per cell moved
- Perfect Clear bonus:
  - Single: `800 × level`
  - Double: `1200 × level`
  - Triple: `1800 × level`
  - Tetris: `2000 × level`

---

## 4. Screen Layout (Fixed)

### 4.1 Layout
```
┌─────────────────────────────────────────────────┐
│                    TETRIS                       │
├──────────────┬───────────────────┬──────────────┤
│   HOLD       │                   │    NEXT      │
│  (120×90)    │                   │  (120×450)   │
├──────────────┤   PLAY FIELD      │              │
│   SCORE      │   (300×600)       │  5 pieces    │
│   LEVEL      │   10 × 20 cells   │              │
│   LINES      │                   │              │
│   TIME       │                   │              │
├──────────────┤                   │              │
│  DANCER      │                   │              │
│  (120×140)   │                   │              │
│  ★ creative  │                   │              │
└──────────────┴───────────────────┴──────────────┘
         ← MOVE ↓ SOFT SPACE HARD ↑/X ROT Z CCW SHIFT HOLD P PAUSE R RESTART
```

### 4.2 Scenes (Fixed — 8 + How-To)
1. **Title / Main Menu**: `START GAME`, `LEADERBOARD`, `HOW TO PLAY`, `SETTINGS`
2. **Playing** (in-game HUD)
3. **Pause Overlay**: `RESUME`, `RESTART`, `MAIN MENU`
4. **Game Over Overlay**: final SCORE / LINES / LEVEL + `RESTART`, `MAIN MENU`
5. **Name Input (New Record)**: 3-character initials
6. **Leaderboard**: top-10 table (#, NAME, SCORE, LINES, LV, TIME, DATE) + `CLEAR SCORES`
7. **Confirm Dialog** (e.g. CLEAR SCORES confirmation)
8. **Settings**: start level, CRT scanlines, ghost, SFX/BGM volume & ON/OFF
9. **How to Play**: key map + rules summary

### 4.3 Visual Style (Fixed)
- Retro pixel / NES-style dot graphics
- Font: `Press Start 2P`
- Block colors (fixed):
  - `I=#00f0f0`, `O=#f0f000`, `T=#a000f0`, `S=#00f000`, `Z=#f00000`, `J=#0000f0`, `L=#f0a000`
  - Ghost: `rgba(255,255,255,0.22)`
  - Empty: `#14141f`
- Pixel border on blocks + interior highlight/shadow for a 3D feel
- **CRT scanline** overlay (toggleable in settings)

### 4.4 Animations / Effects (Fixed)
- Line clear: flash then clear animation (~300ms, 8Hz strobe)
- Tetris / T-Spin / Perfect Clear: screen shake (intensity & duration tiered)
- Level up: yellow flash overlay on board + border glow
- Score increment: ticker pulse animation
- Centered board popup (e.g. `TETRIS • B2B • +1,250`)

---

## 5. Sound (Fixed, Synthesized Only)

### 5.1 SFX (Minimum 10)
- `move`, `rotate`, `lock`, `hardDrop`, `hold`
- `lineClear(n)` (1–3 vs Tetris differentiated)
- `tSpin`, `levelUp`, `gameOver`, `perfectClear`
- Synthesized via Web Audio API `OscillatorNode` / `GainNode` (no external files)

### 5.2 BGM
- At least one looping background track (chiptune style, synthesized in code)
- Handle browser autoplay policy: call `AudioContext.resume()` on first user input
- ON/OFF and volume controls in settings

---

## 6. Leaderboard (Local, Fixed Schema)

### 6.1 Storage
- `localStorage` key: `tetris_leaderboard_v1`
- Keep top **10** entries

### 6.2 Entry Schema
```json
{
  "name": "AAA",
  "score": 125000,
  "lines": 142,
  "level": 15,
  "durationSec": 612,
  "date": "2026-04-17T10:23:00Z"
}
```

### 6.3 New Record Flow
- If the score places in the top 10, advance to the initials input scene.
- On submit: insert → sort → trim to top 10.
- Highlight the newly-inserted row on the leaderboard screen.

---

## 7. Game Over & Pause

### 7.1 Game Over Conditions
- New piece cannot be placed in the spawn buffer (Block Out)
- A piece locks entirely above the visible play area (Lock Out)

### 7.2 Pause
- Toggled by `P` / `Esc`
- While paused: **freeze all animations** and **stop play-time measurement**

---

## 8. DANCER Area (Creative Freedom — Model-Specific)

> This is the **only section where creativity is permitted**. It is the model’s signature space and will indirectly influence star ratings.

### 8.1 Fixed Constraints (Must Comply)
- Location: a panel labeled `DANCER` in the left side panel
- Canvas size: **120 × 140 px**
- Rendered with Canvas 2D (no image files — sprites defined in code)
- Must sustain 60fps alongside the game loop
- Must not harm game performance (target per-frame budget ≤ 2ms)

### 8.2 Required Reaction Triggers
The following events must each produce a **visually distinguishable** reaction:

| Trigger | Expected Intensity | Suggested Duration |
| --- | --- | --- |
| Triple (3-line clear) | Medium | ~1.6s |
| Tetris (4-line clear) | Strong | ~2.8s |
| T-Spin (1+ lines) | Strong | ~2.2s |
| Combo ≥ 3 | Medium (escalating) | `1.4s + combo × 0.15s` |
| Level Up | Strong | ~2.0s |
| Perfect Clear | Maximum | ~4.0s |
| Game Over | Reset (calm/collapse) | Immediate |

In the idle state (no events), the character must still show **subtle motion** (bobbing / breathing / idle sway).

### 8.3 API Contract
The model must export the following three functions. As long as the names match, the internal implementation is free:
```js
// Called every frame — draw the character onto ctx
export function renderCharacter(ctx: CanvasRenderingContext2D, nowMs: number): void;

// Called on event — schedule a reaction
// power: 1 (medium) / 2 (strong) / 3 (max)
export function triggerDance(durationMs?: number, power?: number): void;

// Called on game reset / game over
export function resetDance(): void;
```

### 8.4 Free-Choice Surface
- Character appearance: color, limbs, style (pixel / vector / particles / geometric, etc.)
- Reaction motion: bounce / spin / sparkle / color shift / camera zoom / etc.
- Background: solid / gradient / abstract pattern
- Narrative flourishes: blinking, winking, tired face, etc.

---

## 9. Evaluation Telemetry (Fixed)

> These instrumentation points must be implemented **identically** across every model build for fair comparison.

### 9.1 Play-Time Aggregation
- `localStorage` key: `tetris_eval_v1`
- Accumulate seconds spent in `GameState.Playing` (enter-time to exit-time deltas)
- Must pause accumulation while Paused

### 9.2 Star Rating UI
- Game Over scene must present a **1–5 star selector** (buttons or ★ toggles)
- Rating is optional (SKIP must be available)
- On submit, persist with this schema:

```json
{
  "cumulativePlaySec": 0,
  "sessions": [
    {
      "startedAt": "2026-04-24T10:00:00Z",
      "endedAt": "2026-04-24T10:08:23Z",
      "durationSec": 503,
      "finalScore": 42800,
      "lines": 38,
      "level": 5,
      "rating": 4
    }
  ]
}
```

### 9.3 Aggregation Rules
- Star average: simple arithmetic mean (2 decimal places)
- Also report median and sample size; only consider meaningful when `n ≥ 10`
- Cumulative play time: sum of all `durationSec`

---

## 10. Performance Requirements (Fixed Targets)

| Metric | Target |
| --- | --- |
| Frame rate | Sustain **60fps** (P99 frame ≤ 16.8ms) |
| Input latency | Key press → screen reflection **≤ 50ms** |
| SRS rotation / wall kicks | **100% match** with standard guideline |
| Memory leak | Heap growth < 20MB after 30 min continuous play |
| Dropped frames | 0 during normal gameplay |

---

## 11. File Structure (Recommended)

```
tetris-game/
├── index.html
├── styles/
│   └── main.css
├── src/
│   ├── main.js            # entry point, scene manager, eval telemetry
│   ├── game.js            # state machine
│   ├── board.js           # collision, movement, rotation, lock, line clear
│   ├── piece.js           # tetromino definitions
│   ├── bag.js             # 7-bag
│   ├── srs.js             # SRS wall-kick tables
│   ├── scoring.js         # scoring / B2B / Combo / PC / T-Spin
│   ├── input.js           # keyboard + DAS/ARR
│   ├── renderer.js        # Canvas rendering
│   ├── audio.js           # Web Audio API
│   ├── leaderboard.js     # localStorage ranking
│   ├── settings.js        # localStorage settings
│   ├── character.js       # ★ DANCER (creative area)
│   ├── eval.js            # ★ evaluation telemetry (play time / ratings)
│   └── config.js          # constants
└── PRD_AI_EVAL.md
```

Modules marked `★` are evaluation-specific. `character.js` is a free implementation; `eval.js` must be implemented identically across models.

---

## 12. Non-Goals (Out of Scope)

- Online multiplayer / server-based rankings
- Mobile / touch controls
- Accounts / login
- Custom key rebinding
- Extra modes (Sprint / 40L / Marathon variants etc.)

---

## 13. Submission Checklist (for the Implementing AI)

On completion, all of the following must hold:

- [ ] All features in §2–§7 implemented with identical values and key mappings
- [ ] Scoring formulas in §3 match exactly
- [ ] Block color hex values in §4.3 match exactly
- [ ] 10 SFX + BGM synthesized (0 external assets) per §5
- [ ] Leaderboard schema in §6 matches exactly (`tetris_leaderboard_v1`)
- [ ] DANCER API in §8 exports the 3 functions + all 7 required trigger reactions visible
- [ ] Evaluation telemetry stored under `tetris_eval_v1` per §9
- [ ] Performance targets in §10 met (frame rate / input latency)
- [ ] Runs with static file serving only — no bundler required
- [ ] Game Over scene shows a 1–5 star rating UI and persists the rating
- [ ] Automated tests cover core logic and pass
- [ ] A live smoke test confirmed the game boots and is playable

---

## 14. Evaluation Report Template

Each AI-model build is summarized in this form for side-by-side comparison:

```
Model: <model-name>
Build date: <YYYY-MM-DD>

[Playtime]
  Cumulative play time : <HHh MMm> (n sessions = <N>)
  Average session      : <MM:SS>
  Median session       : <MM:SS>

[Rating]
  Samples (n)          : <N>
  Average stars        : <x.xx> / 5
  Median stars         : <x> / 5
  Distribution         : ★5 <a>  ★4 <b>  ★3 <c>  ★2 <d>  ★1 <e>

[Compliance]
  Fairness spec pass   : <YES / NO>
  Performance target   : <60fps hit ratio>

[Dance area notes]
  Creative description : <one paragraph>
```

---

## 15. Completion Report (What to Return to the User)

When the entire PRD is implemented and all tests are passing, send **one** completion message to the user containing:

1. **Summary of what was built** — a short feature list mapped to §2–§9.
2. **Test results** — how tests were structured, how many pass, how to re-run them.
3. **How to run locally** — e.g. `npx http-server . -p 5173` and the URL to open.
4. **DANCER creative notes** — describe the character, its motion, and the reaction mapping you chose.
5. **Resolved ambiguities** — list any open choice you made and the decision (do not ask the user).

Do not send any intermediate status messages. One report at the end. Done.
