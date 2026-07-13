# SUPERPOWER ARCADE v1 ("The Evan Run") Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A vanilla-JS browser arcade (3 chambers + boss + character forks) that scores play locally, reveals a positive "superpower" archetype, and — only on the player's explicit share tap — sends the run to a private Supabase-backed dashboard for Lyndz.

**Architecture:** Zero-dependency static frontend. Pure logic modules (`SignalTracker`, `ForkFlow`, `profileMapper`, `runPayload`, `api`) are dual CJS/browser exports (same pattern as the ported `DifficultyDial`) and are TDD'd with Node's built-in `node --test`. DOM modules (app shell, 4 game chambers, fork/reveal/share screens, admin page) are thin consumers of the pure modules, verified by playing. Backend = Supabase REST/RPC via `fetch` (no SDK): `shared_runs` (anon insert-only), `quest_codes` (RPC-only redeem), admin reads with an authenticated session.

**Tech Stack:** Vanilla JS (ES2020, no build step) · Node ≥18 for tests only (`node --test`) · Supabase (Postgres + RLS + Auth) · static hosting (Vercel).

## Global Constraints

- **Repo:** all paths relative to `H:\HYPERFOCUSZONE\HperCore\SUPERPOWER-ARCADE`. Source engine repo: `H:\HYPERFOCUSZONE\HperCore\-ULTIMATE-ADHD-BRAIN-ARCADE-` (read-only; never modify it).
- **Zero runtime dependencies.** No npm packages, no bundler, no framework. `package.json` exists only to define `"scripts": {"test": "node --test tests/"}`.
- **Nothing leaves the device until the share tap.** No fetch calls anywhere except `js/core/api.js`, and `api.js` functions are only invoked from the share screen and quest-code entry.
- **No diagnosis language anywhere** (code, copy, comments, dashboard). Archetypes are strength patterns only. Reveal copy is positive-only.
- **Same chambers and forks for every player.** `DifficultyDial` adapts difficulty within a game; it never changes which chambers/forks appear.
- **Dual-export module pattern** (copy exactly — it's how the ported agents already work):
  ```js
  if (typeof module !== 'undefined' && module.exports) { module.exports = TheExport; }
  else { window.TheExport = TheExport; }
  ```
- **Local run:** `python -m http.server 8123` from repo root → http://localhost:8123 (game) and http://localhost:8123/admin/ (dashboard).
- **Tests:** `npm test` (= `node --test tests/`) from repo root. All tests must pass before every commit.
- **Commits:** small, after every task, message style `feat:`/`test:`/`docs:`/`chore:`. Never commit `.env` (there isn't one — the anon key in `js/config.js` is public by design; the service key must NEVER appear in this repo).
- **localStorage keys:** all prefixed `spa_` (`spa_run`, `spa_quest`).

## File Structure (final state)

```
SUPERPOWER-ARCADE/
├── index.html                 # game shell: one <section> per screen
├── style.css                  # self-contained neon arcade theme (defines all CSS vars)
├── app.js                     # screen router + chamber/fork sequencing (DOM only)
├── package.json               # {"scripts":{"test":"node --test tests/"}}
├── js/
│   ├── config.js              # window.SPA_CONFIG = { SUPABASE_URL, SUPABASE_ANON_KEY }
│   ├── agents/DifficultyDial.js    # ported VERBATIM from arcade repo
│   ├── agents/DopamineDJ.js        # ported VERBATIM from arcade repo
│   ├── systems/ParticleSystem.js   # ported VERBATIM from arcade repo
│   ├── core/SignalTracker.js  # pure: event log for a run
│   ├── core/ForkFlow.js       # pure: fork sequencing + repair injection
│   ├── core/profileMapper.js  # pure: events -> archetype + evidence notes
│   ├── core/runPayload.js     # pure: share payload builder
│   ├── core/api.js            # fetch wrappers (submitRun, redeemQuestCode) — injectable fetch
│   ├── games/patternBlitz.js  # chamber 1 (DOM)
│   ├── games/colorCascade.js  # chamber 2 (DOM)
│   ├── games/numberRush.js    # chamber 3 (DOM)
│   └── games/vaultDoor.js     # boss chamber, zero instructions (DOM)
├── data/
│   ├── forks.js               # fork definitions (JS not JSON so file:// works too)
│   └── profiles.js            # 5 archetypes: name, emoji, blurb
├── admin/
│   ├── index.html             # private dashboard (login + evidence-first run list)
│   └── admin.js
├── supabase/
│   └── migrations/001_init.sql
└── tests/
    ├── agents.test.js
    ├── signal_tracker.test.js
    ├── fork_flow.test.js
    ├── profile_mapper.test.js
    ├── run_payload.test.js
    └── api.test.js
```

---

### Task 1: Scaffold repo + port engine files verbatim

**Files:**
- Create: `package.json`, `js/agents/DifficultyDial.js`, `js/agents/DopamineDJ.js`, `js/systems/ParticleSystem.js`
- Test: `tests/agents.test.js`

**Interfaces:**
- Consumes: nothing (first task).
- Produces: `DifficultyDial` class — `new DifficultyDial({windowSize, boredomThresholdMs, frustrationThreshold})`, `.reset(startLevel)`, `.recordResponse(isCorrect, timeMs) -> {action:'increase'|'decrease'|'maintain', level, reason}`, `.getCurrentLevel()`. `DopamineDJ` class — `new DopamineDJ({baseDropChance, streakMultiplier})`, `.initializeSession(wallet)`, `.processResponse(isCorrect, timeMs, streak) -> {drop:boolean, amount?, type?, message?, effect?, totalWallet?}`, `.getWalletBalance()`. `ParticleSystem` — browser-only, `.emit(x, y, kind, count)`, `.celebrate()`.

- [ ] **Step 1: Verify Node version**

Run: `node --version`
Expected: `v18.x` or higher (needed for `node --test`). If lower, stop and flag.

- [ ] **Step 2: Create `package.json`**

```json
{
  "name": "superpower-arcade",
  "private": true,
  "version": "0.1.0",
  "scripts": {
    "test": "node --test tests/"
  }
}
```

- [ ] **Step 3: Copy the three engine files verbatim**

Run (Git Bash):
```bash
mkdir -p js/agents js/systems tests
cp "/h/HYPERFOCUSZONE/HperCore/-ULTIMATE-ADHD-BRAIN-ARCADE-/agents/DifficultyDial.js" js/agents/
cp "/h/HYPERFOCUSZONE/HperCore/-ULTIMATE-ADHD-BRAIN-ARCADE-/agents/DopamineDJ.js" js/agents/
cp "/h/HYPERFOCUSZONE/HperCore/-ULTIMATE-ADHD-BRAIN-ARCADE-/systems/ParticleSystem.js" js/systems/
```
Do NOT edit the copied files.

- [ ] **Step 4: Write the failing test** — `tests/agents.test.js`

```js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const DifficultyDial = require('../js/agents/DifficultyDial');
const DopamineDJ = require('../js/agents/DopamineDJ');

test('DifficultyDial lowers level after consecutive errors', () => {
  const dial = new DifficultyDial({ windowSize: 3, frustrationThreshold: 2 });
  dial.reset(5);
  dial.recordResponse(false, 2000);
  const res = dial.recordResponse(false, 2000);
  assert.equal(res.action, 'decrease');
  assert.equal(res.level, 4);
});

test('DifficultyDial raises level on fast all-correct window', () => {
  const dial = new DifficultyDial({ windowSize: 3, boredomThresholdMs: 1000, frustrationThreshold: 2 });
  dial.reset(3);
  dial.recordResponse(true, 500);
  dial.recordResponse(true, 600);
  const res = dial.recordResponse(true, 500);
  assert.equal(res.action, 'increase');
  assert.equal(res.level, 4);
});

test('DifficultyDial maintains in flow state', () => {
  const dial = new DifficultyDial({ windowSize: 3, boredomThresholdMs: 1000, frustrationThreshold: 2 });
  dial.reset(5);
  dial.recordResponse(true, 1500);
  dial.recordResponse(true, 1500);
  const res = dial.recordResponse(true, 1500);
  assert.equal(res.action, 'maintain');
});

test('DopamineDJ never drops on a wrong answer and banks coins on drops', () => {
  const dj = new DopamineDJ({ baseDropChance: 1.0, maxDropChance: 1.0 }); // force drops
  dj.initializeSession(0);
  assert.equal(dj.processResponse(false, 500, 0).drop, false);
  const reward = dj.processResponse(true, 500, 1);
  assert.equal(reward.drop, true);
  assert.ok(reward.amount >= 1);
  assert.equal(dj.getWalletBalance(), reward.totalWallet);
});
```

- [ ] **Step 5: Run tests**

Run: `npm test`
Expected: **PASS** (4 tests) — the ported files already implement this. If ParticleSystem's browser-only code throws on require, that's fine: we don't require it in tests.

- [ ] **Step 6: Commit**

```bash
git add package.json js/ tests/agents.test.js
git commit -m "feat: scaffold + port DifficultyDial, DopamineDJ, ParticleSystem from ADHD-BRAIN-ARCADE"
```

---

### Task 2: SignalTracker (pure event log)

**Files:**
- Create: `js/core/SignalTracker.js`
- Test: `tests/signal_tracker.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `SignalTracker` class — `new SignalTracker({storage})` (storage = object with `setItem(k,v)`/`getItem(k)`, e.g. localStorage; optional), `.startRun(energy)`, `.record(type, detail)`, `.count(type)`, `.events` (array of `{type, detail, at}`), `.toJSON() -> {meta:{energy, startedAt}, events}`. Event types used by later tasks: `game_response {game, correct, ms}`, `fork_choice {forkId, optionId, signal}`, `boss_move {}`, `boss_reset {}`, `boss_solved {ms}`, `difficulty_change {game, action, level}`, `coin_drop {amount}`.

- [ ] **Step 1: Write the failing test** — `tests/signal_tracker.test.js`

```js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const SignalTracker = require('../js/core/SignalTracker');

function fakeStorage() {
  const map = new Map();
  return { setItem: (k, v) => map.set(k, v), getItem: (k) => map.get(k) ?? null, map };
}

test('startRun resets events and stores meta', () => {
  const t = new SignalTracker();
  t.startRun('high');
  t.record('game_response', { game: 'pattern-blitz', correct: true, ms: 700 });
  t.startRun('low');
  assert.equal(t.events.length, 0);
  assert.equal(t.toJSON().meta.energy, 'low');
  assert.ok(t.toJSON().meta.startedAt);
});

test('record appends typed events with timestamps and count works', () => {
  const t = new SignalTracker();
  t.startRun('medium');
  t.record('game_response', { game: 'number-rush', correct: false, ms: 3000 });
  t.record('game_response', { game: 'number-rush', correct: true, ms: 2100 });
  t.record('fork_choice', { forkId: 'glitch', optionId: 'report', signal: 'honest' });
  assert.equal(t.count('game_response'), 2);
  assert.equal(t.count('fork_choice'), 1);
  assert.equal(t.events[0].detail.game, 'number-rush');
  assert.ok(typeof t.events[0].at === 'number');
});

test('persists full run JSON to storage under spa_run on every record', () => {
  const storage = fakeStorage();
  const t = new SignalTracker({ storage });
  t.startRun('high');
  t.record('boss_move', {});
  const saved = JSON.parse(storage.getItem('spa_run'));
  assert.equal(saved.meta.energy, 'high');
  assert.equal(saved.events.length, 1);
  assert.equal(saved.events[0].type, 'boss_move');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module '../js/core/SignalTracker'`.

- [ ] **Step 3: Write implementation** — `js/core/SignalTracker.js`

```js
/**
 * SignalTracker — the run's local event log.
 * Everything recorded here stays on-device until the player taps share.
 */
class SignalTracker {
  constructor({ storage = null } = {}) {
    this.storage = storage;
    this.meta = {};
    this.events = [];
  }

  startRun(energy) {
    this.meta = { energy, startedAt: new Date().toISOString() };
    this.events = [];
    this._persist();
  }

  record(type, detail = {}) {
    this.events.push({ type, detail, at: Date.now() });
    this._persist();
  }

  count(type) {
    return this.events.filter((e) => e.type === type).length;
  }

  toJSON() {
    return { meta: this.meta, events: this.events };
  }

  _persist() {
    if (this.storage) this.storage.setItem('spa_run', JSON.stringify(this.toJSON()));
  }
}

if (typeof module !== 'undefined' && module.exports) { module.exports = SignalTracker; }
else { window.SignalTracker = SignalTracker; }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS (all files).

- [ ] **Step 5: Commit**

```bash
git add js/core/SignalTracker.js tests/signal_tracker.test.js
git commit -m "feat: SignalTracker local event log"
```

---

### Task 3: Fork data + ForkFlow (sequencing, repair, promise)

**Files:**
- Create: `data/forks.js`, `js/core/ForkFlow.js`
- Test: `tests/fork_flow.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `SPA_FORKS` array (browser global / CJS export from `data/forks.js`). `ForkFlow` class — `new ForkFlow(forks)`, `.queueForChamber(n)` (call after chamber n completes; loads that chamber's forks), `.next() -> fork|null` (pops the next fork to show, including injected repair forks), `.choose(fork, optionId) -> {option, signal, grantsCoins, costsCoins}` (also auto-queues `option.repair` as the next fork if present). Fork shape: `{id, prompt, options: [{id, label, signal, grantsCoins?, costsCoins?, repair?}]}`.

- [ ] **Step 1: Write `data/forks.js`** (data first — tests reference it)

```js
/**
 * Character forks. Text-light, both paths always continue the game,
 * neither option is visually marked "correct".
 * signal vocabulary (consumed by profileMapper):
 *   promise_made / promise_avoided / promise_kept / promise_broken
 *   honest / self_gain / repaired / kept_gain
 *   generous / self_keep
 */
const SPA_FORKS = [
  {
    id: 'pip-promise',
    chamberAfter: 1,
    prompt: 'Behind a locked gate, a little spark called Pip is stuck. The gate won’t open yet. Pip: “Promise you’ll come back for me?”',
    options: [
      { id: 'promise', label: '\u{1F91D} I promise', signal: 'promise_made' },
      { id: 'shrug', label: '\u{1F937} Maybe… let’s see', signal: 'promise_avoided' }
    ]
  },
  {
    id: 'glitch',
    chamberAfter: 2,
    prompt: 'A vending machine glitches and starts printing free coins. Nobody saw it. The ⚠ report panel blinks beside it.',
    options: [
      { id: 'report', label: '⚠ Report the glitch', signal: 'honest' },
      {
        id: 'milk', label: '\u{1FA99} Pocket the coins', signal: 'self_gain', grantsCoins: 25,
        repair: {
          id: 'glitch-repair',
          prompt: 'Nobody noticed. But the return slot is right there, still open…',
          options: [
            { id: 'return', label: '↩️ Return the coins', signal: 'repaired', costsCoins: 25 },
            { id: 'keep', label: '\u{1F6B6} Keep walking', signal: 'kept_gain' }
          ]
        }
      }
    ]
  },
  {
    id: 'stranger',
    chamberAfter: 3,
    prompt: 'Another runner’s attempt just collapsed — they lost everything at the last chamber. They’re sitting by the door.',
    options: [
      { id: 'share', label: '\u{1FA99} Share 10 of your coins', signal: 'generous', costsCoins: 10 },
      { id: 'keep', label: '\u{1F4B0} Keep your stack', signal: 'self_keep' }
    ]
  },
  {
    id: 'pip-payoff',
    chamberAfter: 3,
    prompt: 'Two doors ahead. A golden bonus door, glowing with coins. And the rusty gate back to Pip — it’s unlocked now.',
    options: [
      { id: 'pip', label: '\u{1F511} Go back for Pip', signal: 'promise_kept' },
      { id: 'gold', label: '✨ Take the golden door', signal: 'promise_broken' }
    ]
  }
];

if (typeof module !== 'undefined' && module.exports) { module.exports = SPA_FORKS; }
else { window.SPA_FORKS = SPA_FORKS; }
```

- [ ] **Step 2: Write the failing test** — `tests/fork_flow.test.js`

```js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const ForkFlow = require('../js/core/ForkFlow');
const SPA_FORKS = require('../data/forks');

test('serves forks for the completed chamber in order', () => {
  const flow = new ForkFlow(SPA_FORKS);
  flow.queueForChamber(1);
  assert.equal(flow.next().id, 'pip-promise');
  assert.equal(flow.next(), null);
  flow.queueForChamber(3);
  assert.equal(flow.next().id, 'stranger');
  assert.equal(flow.next().id, 'pip-payoff');
  assert.equal(flow.next(), null);
});

test('choose returns the picked option and its signal', () => {
  const flow = new ForkFlow(SPA_FORKS);
  flow.queueForChamber(1);
  const fork = flow.next();
  const res = flow.choose(fork, 'promise');
  assert.equal(res.signal, 'promise_made');
  assert.equal(res.option.id, 'promise');
});

test('a self_gain choice injects its repair fork as the immediate next fork', () => {
  const flow = new ForkFlow(SPA_FORKS);
  flow.queueForChamber(2);
  const glitch = flow.next();
  const res = flow.choose(glitch, 'milk');
  assert.equal(res.signal, 'self_gain');
  assert.equal(res.grantsCoins, 25);
  const repair = flow.next();
  assert.equal(repair.id, 'glitch-repair');
  const repairRes = flow.choose(repair, 'return');
  assert.equal(repairRes.signal, 'repaired');
  assert.equal(repairRes.costsCoins, 25);
  assert.equal(flow.next(), null);
});

test('an honest choice injects nothing extra', () => {
  const flow = new ForkFlow(SPA_FORKS);
  flow.queueForChamber(2);
  const glitch = flow.next();
  flow.choose(glitch, 'report');
  assert.equal(flow.next(), null);
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module '../js/core/ForkFlow'`.

- [ ] **Step 4: Write implementation** — `js/core/ForkFlow.js`

```js
/** ForkFlow — sequences character forks, injecting repair (second-chance) forks. */
class ForkFlow {
  constructor(forks) {
    this.forks = forks;
    this.queue = [];
  }

  queueForChamber(n) {
    this.queue.push(...this.forks.filter((f) => f.chamberAfter === n));
  }

  next() {
    return this.queue.shift() || null;
  }

  choose(fork, optionId) {
    const option = fork.options.find((o) => o.id === optionId);
    if (!option) throw new Error(`Unknown option ${optionId} for fork ${fork.id}`);
    if (option.repair) this.queue.unshift(option.repair);
    return {
      option,
      signal: option.signal,
      grantsCoins: option.grantsCoins || 0,
      costsCoins: option.costsCoins || 0
    };
  }
}

if (typeof module !== 'undefined' && module.exports) { module.exports = ForkFlow; }
else { window.ForkFlow = ForkFlow; }
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add data/forks.js js/core/ForkFlow.js tests/fork_flow.test.js
git commit -m "feat: fork data + ForkFlow with repair (second-chance) injection"
```

---

### Task 4: Archetype data + profileMapper (signals → superpower + evidence)

**Files:**
- Create: `data/profiles.js`, `js/core/profileMapper.js`
- Test: `tests/profile_mapper.test.js`

**Interfaces:**
- Consumes: `SignalTracker.toJSON()` shape (Task 2), fork signal vocabulary (Task 3).
- Produces: `SPA_PROFILES` (object keyed by archetype id). `mapProfile(runJson) -> { archetype: {id, name, emoji, blurb}, scores: {hyperfocus, pattern, systems, chaos}, evidence: string[] }`. Evidence strings are the dashboard's behaviour notes; the reveal screen uses `archetype` only. **HARD RULE:** no diagnosis words in any blurb or evidence string.

- [ ] **Step 1: Write `data/profiles.js`**

```js
const SPA_PROFILES = {
  hyperfocus_hunter: {
    id: 'hyperfocus_hunter', name: 'Hyperfocus Hunter', emoji: '⚡',
    blurb: 'You lock on and GO. Speed, momentum, relentless retries — when something grabs you, you chase it down until it’s done. Teams ship faster with a Hunter on board.'
  },
  pattern_detective: {
    id: 'pattern_detective', name: 'Pattern Detective', emoji: '\u{1F50D}',
    blurb: 'You see the thing nobody else sees. Precision over panic — you take the extra beat and land the right answer. Detectives catch what everyone else ships broken.'
  },
  systems_architect: {
    id: 'systems_architect', name: 'Systems Architect', emoji: '\u{1F9E9}',
    blurb: 'You hold the whole structure in your head. Sequences, order, moving parts — you build the map while others are still staring at the pieces.'
  },
  chaos_creator: {
    id: 'chaos_creator', name: 'Chaos Creator', emoji: '\u{1F3A8}',
    blurb: 'You try the door nobody thought was a door. Wild experiments, fearless resets, unexpected wins — Creators find the path that isn’t on the map.'
  },
  wild_card: {
    id: 'wild_card', name: 'Wild Card', emoji: '\u{1F300}',
    blurb: 'You don’t fit one box — you fit four. Speed when it counts, precision when it matters, invention when it’s needed. The rarest profile in the arcade.'
  }
};

if (typeof module !== 'undefined' && module.exports) { module.exports = SPA_PROFILES; }
else { window.SPA_PROFILES = SPA_PROFILES; }
```

- [ ] **Step 2: Write the failing test** — `tests/profile_mapper.test.js`

```js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mapProfile } = require('../js/core/profileMapper');

function run(events, energy = 'medium') {
  return { meta: { energy, startedAt: '2026-07-13T12:00:00Z' }, events: events.map((e) => ({ ...e, at: 0 })) };
}
const resp = (game, correct, ms) => ({ type: 'game_response', detail: { game, correct, ms } });
const fork = (forkId, optionId, signal) => ({ type: 'fork_choice', detail: { forkId, optionId, signal } });

test('fast accurate play with many retries maps to Hyperfocus Hunter', () => {
  const events = [];
  for (let i = 0; i < 10; i++) events.push(resp('number-rush', true, 400));
  events.push(resp('number-rush', false, 400), resp('number-rush', true, 400)); // retry after fail
  events.push(resp('number-rush', false, 400), resp('number-rush', true, 400));
  const p = mapProfile(run(events));
  assert.equal(p.archetype.id, 'hyperfocus_hunter');
});

test('slow, near-perfect pattern play maps to Pattern Detective', () => {
  const events = [];
  for (let i = 0; i < 12; i++) events.push(resp('pattern-blitz', true, 2500));
  const p = mapProfile(run(events));
  assert.equal(p.archetype.id, 'pattern_detective');
});

test('boss solved with few moves and no resets boosts Systems Architect', () => {
  const events = [];
  for (let i = 0; i < 8; i++) events.push(resp('color-cascade', true, 1800));
  for (let i = 0; i < 6; i++) events.push({ type: 'boss_move', detail: {} });
  events.push({ type: 'boss_solved', detail: { ms: 30000 } });
  const p = mapProfile(run(events));
  assert.equal(p.archetype.id, 'systems_architect');
});

test('heavy boss experimentation with resets maps to Chaos Creator', () => {
  const events = [];
  for (let i = 0; i < 4; i++) events.push(resp('pattern-blitz', i % 2 === 0, 1200));
  for (let i = 0; i < 40; i++) events.push({ type: 'boss_move', detail: {} });
  events.push({ type: 'boss_reset', detail: {} }, { type: 'boss_reset', detail: {} });
  events.push({ type: 'boss_solved', detail: { ms: 90000 } });
  const p = mapProfile(run(events));
  assert.equal(p.archetype.id, 'chaos_creator');
});

test('no dominant signal maps to Wild Card', () => {
  const p = mapProfile(run([resp('pattern-blitz', true, 1000)]));
  assert.equal(p.archetype.id, 'wild_card');
});

test('evidence notes narrate character forks in plain human language', () => {
  const events = [
    fork('pip-promise', 'promise', 'promise_made'),
    fork('glitch', 'milk', 'self_gain'),
    fork('glitch-repair', 'return', 'repaired'),
    fork('stranger', 'share', 'generous'),
    fork('pip-payoff', 'pip', 'promise_kept'),
    resp('number-rush', false, 900), resp('number-rush', true, 800)
  ];
  const p = mapProfile(run(events));
  const joined = p.evidence.join(' | ');
  assert.match(joined, /promise/i);
  assert.match(joined, /returned the coins/i);
  assert.match(joined, /shared/i);
  assert.match(joined, /went back for Pip/i);
  assert.match(joined, /kept going after a miss/i);
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module '../js/core/profileMapper'`.

- [ ] **Step 4: Write implementation** — `js/core/profileMapper.js`

```js
/**
 * profileMapper — turns a run's event log into a strength archetype + evidence notes.
 * Strength patterns only. Never diagnostic. Reveal is positive for every profile.
 */
const SPA_PROFILES = (typeof module !== 'undefined' && module.exports)
  ? require('../../data/profiles')
  : window.SPA_PROFILES;

function stats(events) {
  const responses = events.filter((e) => e.type === 'game_response');
  const correct = responses.filter((e) => e.detail.correct);
  const times = correct.map((e) => e.detail.ms).filter((ms) => ms > 0);
  const avgMs = times.length ? times.reduce((a, b) => a + b, 0) / times.length : 0;
  const accuracy = responses.length ? correct.length / responses.length : 0;
  let retries = 0; // an answer that follows a miss in the same game = kept going
  for (let i = 1; i < responses.length; i++) {
    if (!responses[i - 1].detail.correct && responses[i].detail.game === responses[i - 1].detail.game) retries++;
  }
  const perGame = {};
  for (const r of responses) {
    const g = (perGame[r.detail.game] ||= { total: 0, correct: 0 });
    g.total++;
    if (r.detail.correct) g.correct++;
  }
  const bossMoves = events.filter((e) => e.type === 'boss_move').length;
  const bossResets = events.filter((e) => e.type === 'boss_reset').length;
  const bossSolved = events.some((e) => e.type === 'boss_solved');
  return { responses, avgMs, accuracy, retries, perGame, bossMoves, bossResets, bossSolved };
}

function gameAccuracy(perGame, game) {
  const g = perGame[game];
  return g && g.total >= 5 ? g.correct / g.total : 0;
}

function computeScores(s) {
  const scores = { hyperfocus: 0, pattern: 0, systems: 0, chaos: 0 };
  // Hyperfocus Hunter: speed + volume + retries
  if (s.avgMs > 0 && s.avgMs < 900) scores.hyperfocus += 40;
  if (s.responses.length >= 12) scores.hyperfocus += 20;
  scores.hyperfocus += Math.min(30, s.retries * 10);
  // Pattern Detective: careful + accurate, esp. pattern-blitz
  if (s.accuracy >= 0.9 && s.avgMs >= 1500) scores.pattern += 40;
  scores.pattern += Math.round(gameAccuracy(s.perGame, 'pattern-blitz') * 40);
  // Systems Architect: sequence memory + efficient boss solve
  scores.systems += Math.round(gameAccuracy(s.perGame, 'color-cascade') * 40);
  if (s.bossSolved && s.bossMoves > 0 && s.bossMoves <= 12 && s.bossResets === 0) scores.systems += 40;
  // Chaos Creator: exploration volume + fearless resets
  if (s.bossMoves >= 25) scores.chaos += 40;
  scores.chaos += Math.min(30, s.bossResets * 15);
  if (s.bossSolved && s.bossMoves >= 25) scores.chaos += 15;
  return scores;
}

const FORK_EVIDENCE = {
  promise_made: 'Made the promise to come back for Pip',
  promise_avoided: 'Didn’t commit to the promise up front',
  promise_kept: 'Went back for Pip instead of taking the golden door',
  promise_broken: 'Took the golden door instead of going back for Pip',
  honest: 'Reported the coin glitch instead of milking it',
  self_gain: 'Pocketed the glitch coins at first',
  repaired: 'Took the second chance and returned the coins',
  kept_gain: 'Kept the glitch coins at the second chance',
  generous: 'Shared coins with the runner whose attempt collapsed',
  self_keep: 'Kept the coin stack when the other runner lost theirs'
};

function buildEvidence(events, s) {
  const notes = [];
  for (const e of events) {
    if (e.type === 'fork_choice' && FORK_EVIDENCE[e.detail.signal]) notes.push(FORK_EVIDENCE[e.detail.signal]);
  }
  if (s.retries > 0) notes.push(`Kept going after a miss ${s.retries}× — no rage quits`);
  if (s.bossSolved) notes.push(`Cracked the boss vault in ${s.bossMoves} moves (${s.bossResets} resets)`);
  else if (s.bossMoves > 0) notes.push(`Worked the boss vault for ${s.bossMoves} moves without giving up`);
  if (s.accuracy > 0) notes.push(`Overall accuracy ${Math.round(s.accuracy * 100)}%, avg response ${Math.round(s.avgMs)}ms`);
  return notes;
}

function mapProfile(runJson) {
  const events = runJson.events || [];
  const s = stats(events);
  const scores = computeScores(s);
  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const [topKey, topScore] = ranked[0];
  const secondScore = ranked[1][1];
  const ids = { hyperfocus: 'hyperfocus_hunter', pattern: 'pattern_detective', systems: 'systems_architect', chaos: 'chaos_creator' };
  // Wild Card when nothing dominates: weak top score or a near-tie
  const archetypeId = (topScore < 40 || topScore - secondScore < 10) ? 'wild_card' : ids[topKey];
  return { archetype: SPA_PROFILES[archetypeId], scores, evidence: buildEvidence(events, s) };
}

if (typeof module !== 'undefined' && module.exports) { module.exports = { mapProfile }; }
else { window.mapProfile = mapProfile; }
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test`
Expected: PASS. If an archetype test fails, adjust the test INPUTS (not thresholds) only if the input genuinely doesn't represent the archetype; otherwise fix the scoring.

- [ ] **Step 6: Commit**

```bash
git add data/profiles.js js/core/profileMapper.js tests/profile_mapper.test.js
git commit -m "feat: profileMapper — signals to archetype + evidence notes"
```

---

### Task 5: runPayload builder + api client

**Files:**
- Create: `js/core/runPayload.js`, `js/core/api.js`
- Test: `tests/run_payload.test.js`, `tests/api.test.js`

**Interfaces:**
- Consumes: `mapProfile` result (Task 4), `SignalTracker.toJSON()` (Task 2).
- Produces: `buildRunPayload({runJson, profile, name, contact, questCode}) -> {player_name, contact, quest_code, archetype, evidence, signals}` (matches `shared_runs` columns, Task 11). `submitRun(payload, cfg, fetchImpl) -> Promise<{ok, status}>`; `redeemQuestCode(code, cfg, fetchImpl) -> Promise<{invitee_name, message}|null>`. `cfg = {SUPABASE_URL, SUPABASE_ANON_KEY}`.

- [ ] **Step 1: Write the failing tests**

`tests/run_payload.test.js`:
```js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { buildRunPayload } = require('../js/core/runPayload');

const runJson = { meta: { energy: 'high', startedAt: 'x' }, events: [{ type: 'boss_move', detail: {}, at: 1 }] };
const profile = { archetype: { id: 'wild_card', name: 'Wild Card', emoji: 'x' }, scores: { hyperfocus: 1 }, evidence: ['note'] };

test('builds a payload matching shared_runs columns', () => {
  const p = buildRunPayload({ runJson, profile, name: '  Evan  ', contact: 'evan@example.com', questCode: 'bolt-rising' });
  assert.deepEqual(p, {
    player_name: 'Evan',
    contact: 'evan@example.com',
    quest_code: 'BOLT-RISING',
    archetype: 'wild_card',
    evidence: ['note'],
    signals: { meta: runJson.meta, events: runJson.events, scores: { hyperfocus: 1 } }
  });
});

test('quest_code is null when absent and name/contact are required', () => {
  const p = buildRunPayload({ runJson, profile, name: 'A', contact: 'b', questCode: '' });
  assert.equal(p.quest_code, null);
  assert.throws(() => buildRunPayload({ runJson, profile, name: '', contact: 'b' }), /name/i);
  assert.throws(() => buildRunPayload({ runJson, profile, name: 'a', contact: ' ' }), /contact/i);
});
```

`tests/api.test.js`:
```js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { submitRun, redeemQuestCode } = require('../js/core/api');

const cfg = { SUPABASE_URL: 'https://proj.supabase.co', SUPABASE_ANON_KEY: 'anon-key' };

test('submitRun POSTs to shared_runs with apikey headers', async () => {
  let captured;
  const fakeFetch = async (url, opts) => { captured = { url, opts }; return { ok: true, status: 201 }; };
  const res = await submitRun({ player_name: 'E' }, cfg, fakeFetch);
  assert.equal(res.ok, true);
  assert.equal(captured.url, 'https://proj.supabase.co/rest/v1/shared_runs');
  assert.equal(captured.opts.method, 'POST');
  assert.equal(captured.opts.headers.apikey, 'anon-key');
  assert.equal(captured.opts.headers.Authorization, 'Bearer anon-key');
  assert.equal(captured.opts.headers.Prefer, 'return=minimal');
  assert.equal(JSON.parse(captured.opts.body).player_name, 'E');
});

test('redeemQuestCode calls the RPC and returns first row, null when empty', async () => {
  const hit = async () => ({ ok: true, status: 200, json: async () => [{ invitee_name: 'Evan', message: 'hi' }] });
  const miss = async () => ({ ok: true, status: 200, json: async () => [] });
  assert.deepEqual(await redeemQuestCode('bolt', cfg, hit), { invitee_name: 'Evan', message: 'hi' });
  assert.equal(await redeemQuestCode('nope', cfg, miss), null);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — both modules missing.

- [ ] **Step 3: Write implementations**

`js/core/runPayload.js`:
```js
/** Builds the consented share payload. Only ever called from the share screen. */
function buildRunPayload({ runJson, profile, name, contact, questCode }) {
  const player_name = (name || '').trim();
  const contactClean = (contact || '').trim();
  if (!player_name) throw new Error('name is required to share a run');
  if (!contactClean) throw new Error('contact is required to share a run');
  return {
    player_name,
    contact: contactClean,
    quest_code: (questCode || '').trim() ? questCode.trim().toUpperCase() : null,
    archetype: profile.archetype.id,
    evidence: profile.evidence,
    signals: { meta: runJson.meta, events: runJson.events, scores: profile.scores }
  };
}

if (typeof module !== 'undefined' && module.exports) { module.exports = { buildRunPayload }; }
else { window.buildRunPayload = buildRunPayload; }
```

`js/core/api.js`:
```js
/**
 * api — the ONLY module allowed to talk to the network.
 * Called exclusively from the share screen (submitRun) and quest-code entry (redeemQuestCode).
 */
function headers(cfg) {
  return {
    apikey: cfg.SUPABASE_ANON_KEY,
    Authorization: `Bearer ${cfg.SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json'
  };
}

async function submitRun(payload, cfg, fetchImpl) {
  const f = fetchImpl || fetch;
  const res = await f(`${cfg.SUPABASE_URL}/rest/v1/shared_runs`, {
    method: 'POST',
    headers: { ...headers(cfg), Prefer: 'return=minimal' },
    body: JSON.stringify(payload)
  });
  return { ok: res.ok, status: res.status };
}

async function redeemQuestCode(code, cfg, fetchImpl) {
  const f = fetchImpl || fetch;
  const res = await f(`${cfg.SUPABASE_URL}/rest/v1/rpc/redeem_quest_code`, {
    method: 'POST',
    headers: headers(cfg),
    body: JSON.stringify({ p_code: code })
  });
  if (!res.ok) return null;
  const rows = await res.json();
  return rows && rows.length ? rows[0] : null;
}

if (typeof module !== 'undefined' && module.exports) { module.exports = { submitRun, redeemQuestCode }; }
else { window.SPA_API = { submitRun, redeemQuestCode }; }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS (all suites).

- [ ] **Step 5: Commit**

```bash
git add js/core/runPayload.js js/core/api.js tests/run_payload.test.js tests/api.test.js
git commit -m "feat: run payload builder + Supabase REST client (injectable fetch)"
```

---

### Task 6: App shell — index.html, style.css, app.js flow skeleton

**Files:**
- Create: `index.html`, `style.css`, `app.js`, `js/config.js` (placeholder values)

**Interfaces:**
- Consumes: all pure modules (Tasks 1–5) as browser globals via `<script>` tags.
- Produces: screen sections with ids `screen-landing`, `screen-energy`, `screen-game`, `screen-fork`, `screen-reveal`, `screen-share`, `screen-thanks`. `SPA.showScreen(id)`, `SPA.state = {tracker, forkFlow, dial, dj, coins, questGreeting, profile}`, `SPA.games` registry (games register as `SPA.games['pattern-blitz'] = {icon, durationSec, mount(container, ctx)}`), chamber sequence `SPA.CHAMBERS = ['pattern-blitz','color-cascade','number-rush','vault-door']`. Game ctx contract: `{ difficulty(), onRound(correct, ms), grantCoins(n), complete() }` — `onRound` feeds tracker + DifficultyDial + DopamineDJ; `complete()` advances the flow.

- [ ] **Step 1: Write `js/config.js`** (placeholders; real values in Task 11)

```js
window.SPA_CONFIG = {
  SUPABASE_URL: 'REPLACE_IN_TASK_11',
  SUPABASE_ANON_KEY: 'REPLACE_IN_TASK_11'
};
```

- [ ] **Step 2: Write `index.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SUPERPOWER ARCADE</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <canvas id="particle-canvas"></canvas>
  <main id="app">

    <section id="screen-landing" class="screen">
      <h1 class="glow">SUPERPOWER<br>ARCADE</h1>
      <p class="tagline">The Arcade Keeper has opened the vault.<br>Find your superpower.</p>
      <button id="btn-enter" class="btn btn-primary">INSERT COIN ▶</button>
      <button id="btn-quest-code" class="btn btn-ghost">🔑 Got a key from a friend?</button>
      <div id="quest-entry" class="hidden">
        <input id="quest-input" class="input" placeholder="ENTER-CODE" autocomplete="off" maxlength="24">
        <button id="btn-quest-go" class="btn btn-secondary">Unlock</button>
        <p id="quest-feedback" class="small"></p>
      </div>
    </section>

    <section id="screen-energy" class="screen hidden">
      <h2>How's the engine today?</h2>
      <div class="row">
        <button class="btn btn-energy" data-energy="low">🌙 Low</button>
        <button class="btn btn-energy" data-energy="medium">🌤 Medium</button>
        <button class="btn btn-energy" data-energy="high">🔥 High</button>
      </div>
    </section>

    <section id="screen-game" class="screen hidden">
      <div class="hud">
        <span id="hud-icon"></span>
        <span id="hud-timer"></span>
        <span id="hud-coins">🪙 0</span>
      </div>
      <div id="game-content"></div>
      <div id="game-feedback" class="feedback"></div>
    </section>

    <section id="screen-fork" class="screen hidden">
      <div class="fork-card">
        <p id="fork-prompt"></p>
        <div id="fork-options" class="col"></div>
      </div>
    </section>

    <section id="screen-reveal" class="screen hidden">
      <p class="small">THE VAULT OPENS…</p>
      <div id="reveal-emoji" class="reveal-emoji"></div>
      <h2 id="reveal-name" class="glow"></h2>
      <p id="reveal-blurb" class="blurb"></p>
      <button id="btn-to-share" class="btn btn-primary">▶ Continue</button>
    </section>

    <section id="screen-share" class="screen hidden">
      <h2>📡 Send your run to the Arcade Keeper?</h2>
      <p id="share-greeting" class="small"></p>
      <p class="small">Legendary runs get invited to something real. Your run data leaves this device
         only if you tap send — otherwise it stays yours and disappears.</p>
      <input id="share-name" class="input" placeholder="Your name" maxlength="80">
      <input id="share-contact" class="input" placeholder="Email or Discord" maxlength="120">
      <div class="row">
        <button id="btn-share-send" class="btn btn-primary">🚀 Send my run</button>
        <button id="btn-share-skip" class="btn btn-ghost">Keep it to myself</button>
      </div>
      <p id="share-feedback" class="small"></p>
    </section>

    <section id="screen-thanks" class="screen hidden">
      <h2 id="thanks-title">🕹️ GG.</h2>
      <p id="thanks-body" class="small"></p>
      <button id="btn-again" class="btn btn-secondary">Play again</button>
    </section>

  </main>

  <script src="js/config.js"></script>
  <script src="js/agents/DifficultyDial.js"></script>
  <script src="js/agents/DopamineDJ.js"></script>
  <script src="js/systems/ParticleSystem.js"></script>
  <script src="js/core/SignalTracker.js"></script>
  <script src="js/core/ForkFlow.js"></script>
  <script src="js/core/profileMapper.js"></script>
  <script src="js/core/runPayload.js"></script>
  <script src="js/core/api.js"></script>
  <script src="data/forks.js"></script>
  <script src="data/profiles.js"></script>
  <script src="js/games/patternBlitz.js"></script>
  <script src="js/games/colorCascade.js"></script>
  <script src="js/games/numberRush.js"></script>
  <script src="js/games/vaultDoor.js"></script>
  <script src="app.js"></script>
</body>
</html>
```
(The four `js/games/*.js` files don't exist yet — that's fine for this task; a 404 script tag doesn't break the shell. They arrive in Tasks 7–10.)

- [ ] **Step 3: Write `style.css`** (self-contained; defines every var the ported code expects)

```css
:root {
  --bg: #0a0a14; --bg-card: #141428; --border: #2a2a4a;
  --neon-cyan: #4ECDC4; --neon-gold: #FFD700; --neon-pink: #FF6B9D; --neon-orange: #FF6B35;
  --text: #eaeaf5; --text-dim: #8a8aa8;
  --color-error: #E74C3C; --color-warning: #F39C12; --color-success: #2ECC71;
  --color-primary: var(--neon-cyan);
}
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  background: radial-gradient(ellipse at top, #14142e 0%, var(--bg) 60%);
  color: var(--text); font-family: 'Segoe UI', system-ui, sans-serif;
  min-height: 100vh; display: flex; align-items: center; justify-content: center;
}
#particle-canvas { position: fixed; inset: 0; pointer-events: none; z-index: 10; }
#app { width: min(680px, 94vw); padding: 24px; text-align: center; }
.screen { animation: fadein .4s ease; }
.hidden { display: none !important; }
@keyframes fadein { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; } }
h1 { font-size: clamp(2.2rem, 8vw, 4rem); letter-spacing: .08em; line-height: 1.1; }
h2 { font-size: clamp(1.3rem, 5vw, 2rem); margin-bottom: 16px; }
.glow { color: var(--neon-cyan); text-shadow: 0 0 18px rgba(78,205,196,.55), 0 0 60px rgba(78,205,196,.25); }
.tagline { color: var(--text-dim); margin: 18px 0 30px; line-height: 1.6; }
.small { color: var(--text-dim); font-size: .9rem; margin: 10px 0; line-height: 1.5; }
.blurb { margin: 14px auto 26px; max-width: 46ch; line-height: 1.65; }
.btn {
  font: inherit; cursor: pointer; border-radius: 12px; padding: 14px 26px; margin: 8px;
  border: 2px solid var(--border); background: var(--bg-card); color: var(--text);
  transition: transform .12s ease, box-shadow .12s ease;
}
.btn:hover { transform: translateY(-2px); }
.btn-primary { border-color: var(--neon-cyan); box-shadow: 0 0 14px rgba(78,205,196,.35); }
.btn-secondary { border-color: var(--neon-gold); }
.btn-ghost { border-color: transparent; color: var(--text-dim); }
.btn-energy { font-size: 1.1rem; min-width: 130px; }
.btn-energy.active { border-color: var(--neon-gold); box-shadow: 0 0 14px rgba(255,215,0,.4); }
.row { display: flex; justify-content: center; flex-wrap: wrap; gap: 6px; }
.col { display: flex; flex-direction: column; gap: 12px; align-items: stretch; }
.input {
  font: inherit; width: min(340px, 90%); margin: 8px auto; display: block;
  padding: 12px 16px; border-radius: 10px; border: 2px solid var(--border);
  background: var(--bg-card); color: var(--text); text-align: center;
}
.input:focus { outline: none; border-color: var(--neon-cyan); }
.hud { display: flex; justify-content: space-between; align-items: center;
  font-size: 1.2rem; margin-bottom: 18px; padding: 8px 14px;
  border: 1px solid var(--border); border-radius: 12px; background: rgba(20,20,40,.6); }
#hud-timer { color: var(--neon-gold); font-variant-numeric: tabular-nums; }
.feedback { min-height: 1.6em; margin-top: 14px; font-size: 1.1rem; font-weight: 600; }
.feedback.success { color: var(--color-success); }
.feedback.error { color: var(--color-error); }
.feedback.warning { color: var(--color-warning); }
.fork-card { border: 1px solid var(--border); border-radius: 16px; padding: 28px;
  background: var(--bg-card); box-shadow: 0 0 30px rgba(0,0,0,.5); }
#fork-prompt { font-size: 1.15rem; line-height: 1.7; margin-bottom: 22px; }
.reveal-emoji { font-size: 5rem; margin: 16px 0; }
.pattern-grid { display: grid; grid-template-columns: repeat(3, 84px); gap: 10px;
  justify-content: center; margin: 22px auto; }
.pattern-item { width: 84px; height: 84px; display: flex; align-items: center; justify-content: center;
  font-size: 2.2rem; background: var(--bg-card); border: 2px solid var(--border);
  border-radius: 12px; cursor: pointer; user-select: none; transition: transform .1s; }
.pattern-item:hover { transform: scale(1.06); border-color: var(--neon-cyan); }
.color-sequence { display: flex; justify-content: center; gap: 10px; flex-wrap: wrap; margin: 22px 0; }
.color-box { width: 62px; height: 62px; border-radius: 12px; cursor: pointer;
  transition: transform .15s, opacity .15s; }
.math-problem { font-size: 2.4rem; margin: 24px 0; color: var(--neon-gold);
  font-variant-numeric: tabular-nums; min-height: 1.3em; }
.vault-grid { display: grid; grid-template-columns: repeat(3, 92px); gap: 12px;
  justify-content: center; margin: 26px auto; }
.vault-tile { width: 92px; height: 92px; font-size: 2.6rem; display: flex; align-items: center;
  justify-content: center; border-radius: 14px; border: 2px solid var(--border);
  background: var(--bg-card); cursor: pointer; transition: transform .12s, box-shadow .2s; }
.vault-tile.lit { border-color: var(--neon-gold); box-shadow: 0 0 16px rgba(255,215,0,.5);
  background: rgba(255,215,0,.12); }
.vault-tile:hover { transform: scale(1.05); }
.vault-reset { font-size: 1.6rem; background: none; border: none; cursor: pointer; opacity: .5; }
.vault-reset:hover { opacity: 1; }
```

- [ ] **Step 4: Write `app.js`**

```js
/* SUPERPOWER ARCADE — flow controller. DOM only; all logic lives in js/core/. */
(function () {
  const SPA = (window.SPA = {
    games: window.SPA?.games || {},
    CHAMBERS: ['pattern-blitz', 'color-cascade', 'number-rush', 'vault-door'],
    state: {}
  });

  const $ = (id) => document.getElementById(id);

  SPA.showScreen = function (id) {
    document.querySelectorAll('.screen').forEach((s) => s.classList.add('hidden'));
    $(id).classList.remove('hidden');
  };

  function newRunState() {
    SPA.state = {
      tracker: new SignalTracker({ storage: window.localStorage }),
      forkFlow: new ForkFlow(window.SPA_FORKS),
      dial: new DifficultyDial({ windowSize: 5, boredomThresholdMs: 600, frustrationThreshold: 3 }),
      dj: new DopamineDJ({ baseDropChance: 0.15, streakMultiplier: 0.05 }),
      particles: typeof ParticleSystem !== 'undefined' ? new ParticleSystem() : null,
      coins: 0,
      streak: 0,
      chamberIndex: 0,
      quest: JSON.parse(localStorage.getItem('spa_quest') || 'null'),
      profile: null
    };
    SPA.state.dj.initializeSession(0);
  }

  function setCoins(n) {
    SPA.state.coins = Math.max(0, n);
    $('hud-coins').textContent = `🪙 ${SPA.state.coins}`;
  }

  function feedback(msg, kind) {
    const el = $('game-feedback');
    el.textContent = msg;
    el.className = `feedback ${kind || ''}`;
    setTimeout(() => { if (el.textContent === msg) el.textContent = ''; }, 1200);
  }

  // ---- chamber runner ----
  let chamberTimer = null;

  function runChamber(index) {
    const gameId = SPA.CHAMBERS[index];
    const game = SPA.games[gameId];
    if (!game) { console.error(`game ${gameId} not registered`); return afterChamber(index); }
    SPA.showScreen('screen-game');
    $('hud-icon').textContent = game.icon;
    setCoins(SPA.state.coins);
    SPA.state.dial.reset(1);

    const ctx = {
      difficulty: () => SPA.state.dial.getCurrentLevel(),
      onRound(correct, ms) {
        SPA.state.tracker.record('game_response', { game: gameId, correct, ms });
        SPA.state.streak = correct ? SPA.state.streak + 1 : 0;
        const analysis = SPA.state.dial.recordResponse(correct, ms);
        if (analysis.action !== 'maintain') {
          SPA.state.tracker.record('difficulty_change', { game: gameId, action: analysis.action, level: analysis.level });
          feedback(analysis.action === 'increase' ? '🚀 Level up!' : '🛡️ Easing off…', analysis.action === 'increase' ? 'success' : 'warning');
        }
        const reward = SPA.state.dj.processResponse(correct, ms, SPA.state.streak);
        if (reward.drop) {
          SPA.state.tracker.record('coin_drop', { amount: reward.amount });
          setCoins(SPA.state.coins + reward.amount);
          feedback(reward.message, 'success');
          SPA.state.particles?.emit(window.innerWidth / 2, window.innerHeight / 3, 'coins', reward.amount * 3);
        }
      },
      grantCoins: (n) => setCoins(SPA.state.coins + n),
      feedback,
      trackerRecord: (type, detail) => SPA.state.tracker.record(type, detail),
      complete: () => finishChamber(index)
    };

    game.mount($('game-content'), ctx);

    if (game.durationSec) {
      let left = game.durationSec;
      $('hud-timer').textContent = fmt(left);
      chamberTimer = setInterval(() => {
        left--;
        $('hud-timer').textContent = fmt(left);
        if (left <= 0) finishChamber(index);
      }, 1000);
    } else {
      $('hud-timer').textContent = ''; // boss: untimed, zero pressure text
    }
  }

  function fmt(s) { return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }

  let finishing = false;
  function finishChamber(index) {
    if (finishing) return;
    finishing = true;
    clearInterval(chamberTimer);
    chamberTimer = null;
    setTimeout(() => { finishing = false; afterChamber(index); }, 400);
  }

  function afterChamber(index) {
    SPA.state.forkFlow.queueForChamber(index + 1);
    nextForkOrChamber(index);
  }

  function nextForkOrChamber(index) {
    const fork = SPA.state.forkFlow.next();
    if (fork) return showFork(fork, index);
    const nextIndex = index + 1;
    if (nextIndex < SPA.CHAMBERS.length) return runChamber(nextIndex);
    return reveal();
  }

  // ---- forks ----
  function showFork(fork, chamberIndex) {
    SPA.showScreen('screen-fork');
    $('fork-prompt').textContent = fork.prompt;
    const box = $('fork-options');
    box.innerHTML = '';
    fork.options.forEach((opt) => {
      const btn = document.createElement('button');
      btn.className = 'btn btn-secondary';
      btn.textContent = opt.label;
      btn.addEventListener('click', () => {
        const res = SPA.state.forkFlow.choose(fork, opt.id);
        SPA.state.tracker.record('fork_choice', { forkId: fork.id, optionId: opt.id, signal: res.signal });
        if (res.grantsCoins) setCoins(SPA.state.coins + res.grantsCoins);
        if (res.costsCoins) setCoins(SPA.state.coins - res.costsCoins);
        nextForkOrChamber(chamberIndex);
      });
      box.appendChild(btn);
    });
  }

  // ---- reveal + share ----
  function reveal() {
    const profile = window.mapProfile(SPA.state.tracker.toJSON());
    SPA.state.profile = profile;
    SPA.showScreen('screen-reveal');
    $('reveal-emoji').textContent = profile.archetype.emoji;
    $('reveal-name').textContent = `Your Superpower: ${profile.archetype.name}`;
    $('reveal-blurb').textContent = profile.archetype.blurb;
    SPA.state.particles?.celebrate?.();
  }

  function showShare() {
    SPA.showScreen('screen-share');
    const q = SPA.state.quest;
    if (q) {
      $('share-greeting').textContent = `🔑 ${q.invitee_name} — ${q.message}`;
      $('share-name').value = q.invitee_name;
    }
  }

  async function sendRun() {
    const btn = $('btn-share-send');
    try {
      const payload = window.buildRunPayload({
        runJson: SPA.state.tracker.toJSON(),
        profile: SPA.state.profile,
        name: $('share-name').value,
        contact: $('share-contact').value,
        questCode: SPA.state.quest?.code || ''
      });
      btn.disabled = true;
      const res = await window.SPA_API.submitRun(payload, window.SPA_CONFIG);
      if (res.ok) return thanks(true);
      $('share-feedback').textContent = `Transmission failed (${res.status}) — try again?`;
      btn.disabled = false;
    } catch (e) {
      $('share-feedback').textContent = e.message;
      btn.disabled = false;
    }
  }

  function thanks(sent) {
    SPA.showScreen('screen-thanks');
    $('thanks-title').textContent = sent ? '📡 Run received by the Keeper.' : '🕹️ GG.';
    $('thanks-body').textContent = sent
      ? 'If your run lights up the board, you’ll hear from a real human. Watch your inbox.'
      : 'Your run stayed on this device, as promised. Come back any time.';
    localStorage.removeItem('spa_run');
  }

  // ---- quest codes ----
  async function tryQuestCode() {
    const code = $('quest-input').value.trim().toUpperCase();
    if (!code) return;
    $('quest-feedback').textContent = 'Checking the vault…';
    const row = await window.SPA_API.redeemQuestCode(code, window.SPA_CONFIG);
    if (row) {
      localStorage.setItem('spa_quest', JSON.stringify({ code, ...row }));
      $('quest-feedback').textContent = `🔓 Welcome, ${row.invitee_name}. The Keeper is expecting you.`;
    } else {
      $('quest-feedback').textContent = 'That key doesn’t fit any lock here.';
    }
  }

  // ---- wiring ----
  document.addEventListener('DOMContentLoaded', () => {
    $('btn-enter').addEventListener('click', () => SPA.showScreen('screen-energy'));
    $('btn-quest-code').addEventListener('click', () => $('quest-entry').classList.toggle('hidden'));
    $('btn-quest-go').addEventListener('click', tryQuestCode);
    document.querySelectorAll('.btn-energy').forEach((b) =>
      b.addEventListener('click', () => {
        newRunState();
        SPA.state.tracker.startRun(b.dataset.energy);
        runChamber(0);
      })
    );
    $('btn-to-share').addEventListener('click', showShare);
    $('btn-share-send').addEventListener('click', sendRun);
    $('btn-share-skip').addEventListener('click', () => thanks(false));
    $('btn-again').addEventListener('click', () => location.reload());
    SPA.showScreen('screen-landing');
  });
})();
```

- [ ] **Step 5: Manual verify the shell flow (games not built yet)**

Run: `python -m http.server 8123` then open http://localhost:8123
Expected: landing renders with neon title → INSERT COIN → energy screen → picking an energy shows the game screen (empty content + console error `game pattern-blitz not registered` is EXPECTED at this stage — chambers arrive next). Quest-code box toggles. No other console errors.

- [ ] **Step 6: Commit**

```bash
git add index.html style.css app.js js/config.js
git commit -m "feat: app shell — screens, chamber/fork flow, reveal, share, quest-code UI"
```

---

### Task 7: Chamber 1 — Pattern Blitz

**Files:**
- Create: `js/games/patternBlitz.js`

**Interfaces:**
- Consumes: `SPA.games` registry + ctx contract from Task 6 (`ctx.difficulty()`, `ctx.onRound(correct, ms)`, `ctx.complete()`).
- Produces: `SPA.games['pattern-blitz']` — 40-second odd-one-out grid (adapted from arcade repo's `initPatternBlitz`/`generatePatternBlitzRound`, but with per-round reaction timing fixed: rounds time from round start, not game start).

- [ ] **Step 1: Write `js/games/patternBlitz.js`**

```js
/* Chamber 1 — Pattern Blitz. Find the odd shape. Signals: pattern accuracy, speed. */
(function () {
  window.SPA = window.SPA || { games: {} };
  window.SPA.games = window.SPA.games || {};

  const SHAPES = ['●', '■', '▲', '♦', '★', '♠', '♣', '♥'];
  const COLORS = ['#FF6B35', '#4ECDC4', '#FFD700', '#96CEB4', '#E74C3C', '#9B59B6', '#3498DB'];

  window.SPA.games['pattern-blitz'] = {
    icon: '🔍',
    durationSec: 40,
    mount(container, ctx) {
      container.innerHTML = `
        <h3>🔍 One of these is not like the others</h3>
        <div class="pattern-grid" id="pb-grid"></div>`;
      let roundStart = 0;

      function round() {
        const grid = document.getElementById('pb-grid');
        if (!grid) return;
        const d = ctx.difficulty();
        const shapePool = SHAPES.slice(0, Math.min(4 + d, SHAPES.length));
        const colorPool = COLORS.slice(0, Math.min(3 + d, COLORS.length));
        const mainShape = shapePool[Math.floor(Math.random() * shapePool.length)];
        const mainColor = colorPool[Math.floor(Math.random() * colorPool.length)];
        let oddShape = mainShape, oddColor = mainColor;
        if (d <= 2 || Math.random() > 0.7) {
          const others = shapePool.filter((s) => s !== mainShape);
          oddShape = others[Math.floor(Math.random() * others.length)] || mainShape;
        } else {
          const others = colorPool.filter((c) => c !== mainColor);
          oddColor = others[Math.floor(Math.random() * others.length)] || mainColor;
        }
        const oddPos = Math.floor(Math.random() * 9);
        grid.innerHTML = '';
        for (let i = 0; i < 9; i++) {
          const cell = document.createElement('div');
          cell.className = 'pattern-item';
          cell.textContent = i === oddPos ? oddShape : mainShape;
          cell.style.color = i === oddPos ? oddColor : mainColor;
          cell.addEventListener('click', () => answer(i === oddPos));
          grid.appendChild(cell);
        }
        roundStart = Date.now();
      }

      function answer(correct) {
        ctx.onRound(correct, Date.now() - roundStart);
        ctx.feedback(correct ? '✓' : '✗', correct ? 'success' : 'error');
        setTimeout(round, correct ? 350 : 650);
      }

      round();
    }
  };
})();
```

- [ ] **Step 2: Manual verify**

Run: `python -m http.server 8123` → play through energy → chamber 1.
Expected: grid renders, odd shape clickable, ✓/✗ feedback, difficulty "Level up!" appears after fast streaks, coins drop occasionally, after 40s the flow advances to the **pip-promise fork**, choosing an option advances to chamber 2 (console error for unregistered `color-cascade` is expected until Task 8).

- [ ] **Step 3: Run tests still green + commit**

Run: `npm test` → PASS.
```bash
git add js/games/patternBlitz.js
git commit -m "feat: chamber 1 — Pattern Blitz with per-round timing"
```

---

### Task 8: Chamber 2 — Color Cascade

**Files:**
- Create: `js/games/colorCascade.js`

**Interfaces:**
- Consumes: ctx contract (Task 6).
- Produces: `SPA.games['color-cascade']` — 45-second sequence-memory game (adapted from arcade's `initColorCascade`; sequence length starts 3, grows on success, shrinks on miss; `onRound(correct, ms)` per completed/failed sequence with ms = time from "your turn" to final click).

- [ ] **Step 1: Write `js/games/colorCascade.js`**

```js
/* Chamber 2 — Color Cascade. Watch, then repeat the sequence. Signals: working memory. */
(function () {
  window.SPA = window.SPA || { games: {} };
  window.SPA.games = window.SPA.games || {};

  const COLORS = ['#FF4444', '#44DD44', '#4488FF', '#FFDD00', '#FF44FF', '#00DDDD'];

  window.SPA.games['color-cascade'] = {
    icon: '🌈',
    durationSec: 45,
    mount(container, ctx) {
      container.innerHTML = `
        <h3>🌈 Watch. Then repeat.</h3>
        <div class="color-sequence" id="cc-boxes"></div>
        <p class="small" id="cc-status"></p>`;
      const boxes = [];
      const boxEl = document.getElementById('cc-boxes');
      COLORS.forEach((c, i) => {
        const b = document.createElement('div');
        b.className = 'color-box';
        b.style.backgroundColor = c;
        b.style.opacity = '0.3';
        b.addEventListener('click', () => pick(i));
        boxEl.appendChild(b);
        boxes.push(b);
      });

      let seq = [], input = [], len = 3, showing = true, turnStart = 0;
      const status = (t) => { const el = document.getElementById('cc-status'); if (el) el.textContent = t; };

      function flash(i, done) {
        boxes[i].style.opacity = '1';
        boxes[i].style.transform = 'scale(1.15)';
        setTimeout(() => {
          boxes[i].style.opacity = '0.3';
          boxes[i].style.transform = 'scale(1)';
          setTimeout(done, 220);
        }, 480);
      }

      function newRound() {
        seq = Array.from({ length: len }, () => Math.floor(Math.random() * COLORS.length));
        input = [];
        showing = true;
        status('👀 Watch…');
        let i = 0;
        (function show() {
          if (i < seq.length) flash(seq[i++], show);
          else { showing = false; turnStart = Date.now(); status('🎯 Your turn'); }
        })();
      }

      function pick(i) {
        if (showing) return;
        flash(i, () => {});
        input.push(i);
        const pos = input.length - 1;
        if (input[pos] !== seq[pos]) {
          ctx.onRound(false, Date.now() - turnStart);
          ctx.feedback('✗ Sequence lost', 'error');
          len = Math.max(3, len - 1);
          setTimeout(newRound, 900);
          return;
        }
        if (input.length === seq.length) {
          ctx.onRound(true, Date.now() - turnStart);
          ctx.feedback(`✓ ${len} in a row!`, 'success');
          len = Math.min(8, len + 1);
          setTimeout(newRound, 700);
        }
      }

      newRound();
    }
  };
})();
```

- [ ] **Step 2: Manual verify**

Play through to chamber 2: sequence flashes, repeating it grows the next sequence, a miss shrinks it, after 45s flow advances to the **glitch fork** — choose "Pocket the coins" once to confirm the **repair fork appears immediately after**, then chamber 3 console error (expected until Task 9).

- [ ] **Step 3: `npm test` green + commit**

```bash
git add js/games/colorCascade.js
git commit -m "feat: chamber 2 — Color Cascade sequence memory"
```

---

### Task 9: Chamber 3 — Number Rush

**Files:**
- Create: `js/games/numberRush.js`

**Interfaces:**
- Consumes: ctx contract (Task 6).
- Produces: `SPA.games['number-rush']` — 45-second mental-math game (adapted from arcade's `generateMathProblem`; difficulty widens ranges/operations; Enter submits).

- [ ] **Step 1: Write `js/games/numberRush.js`**

```js
/* Chamber 3 — Number Rush. Speed math. Signals: speed-vs-accuracy trade-off. */
(function () {
  window.SPA = window.SPA || { games: {} };
  window.SPA.games = window.SPA.games || {};

  window.SPA.games['number-rush'] = {
    icon: '🔢',
    durationSec: 45,
    mount(container, ctx) {
      container.innerHTML = `
        <h3>🔢 Answer fast — or answer right. Your call.</h3>
        <div class="math-problem" id="nr-problem"></div>
        <input type="number" class="input" id="nr-input" placeholder="?" autocomplete="off">`;
      const input = document.getElementById('nr-input');
      let answer = 0, problemStart = 0;

      function problem() {
        const d = ctx.difficulty();
        const maxNum = Math.min(50, 10 + d * 8);
        const ops = ['+', '-', '×', '÷'].slice(0, Math.min(d + 1, 4));
        const op = ops[Math.floor(Math.random() * ops.length)];
        let a, b;
        if (op === '+') { a = rnd(maxNum); b = rnd(maxNum); answer = a + b; }
        else if (op === '-') { a = rnd(maxNum) + maxNum; b = rnd(maxNum / 2); answer = a - b; }
        else if (op === '×') { a = rnd(Math.min(12, d + 2)) + 1; b = rnd(Math.min(12, d + 2)) + 1; answer = a * b; }
        else { answer = rnd(15) + 1; b = rnd(10) + 1; a = answer * b; }
        document.getElementById('nr-problem').textContent = `${a} ${op} ${b} = ?`;
        input.value = '';
        input.focus();
        problemStart = Date.now();
      }
      const rnd = (n) => Math.floor(Math.random() * n) + 1;

      input.addEventListener('keypress', (e) => {
        if (e.key !== 'Enter' || input.value === '') return;
        const correct = parseInt(input.value, 10) === answer;
        ctx.onRound(correct, Date.now() - problemStart);
        ctx.feedback(correct ? '✓' : `✗ (${answer})`, correct ? 'success' : 'error');
        setTimeout(problem, correct ? 250 : 700);
      });

      problem();
    }
  };
})();
```

- [ ] **Step 2: Manual verify**

Play to chamber 3: problems appear, Enter submits, wrong answers show the correct one briefly, after 45s → **stranger fork** then **pip-payoff fork** back-to-back, then boss console error (expected until Task 10).

- [ ] **Step 3: `npm test` green + commit**

```bash
git add js/games/numberRush.js
git commit -m "feat: chamber 3 — Number Rush speed math"
```

---

### Task 10: Boss Chamber — The Vault Door (zero instructions)

**Files:**
- Create: `js/games/vaultDoor.js`

**Interfaces:**
- Consumes: ctx contract (Task 6) — uses `ctx.trackerRecord(type, detail)` for `boss_move`/`boss_reset`/`boss_solved`, and `ctx.complete()` when solved. No `durationSec` (untimed).
- Produces: `SPA.games['vault-door']` — Lights-Out-style 3×3 glyph grid, **no instructions anywhere** (Mind Vault DNA). Clicking a tile toggles it + orthogonal neighbours; all-lit opens the vault. Board generated by applying N random moves from solved state → always solvable, multiple valid paths. A wordless ↺ button resets to the same start board.

- [ ] **Step 1: Write `js/games/vaultDoor.js`**

```js
/* Boss — The Vault Door. Zero text, zero timer. How you explore IS the boss fight. */
(function () {
  window.SPA = window.SPA || { games: {} };
  window.SPA.games = window.SPA.games || {};

  window.SPA.games['vault-door'] = {
    icon: '🔐',
    durationSec: 0, // untimed
    mount(container, ctx) {
      container.innerHTML = `
        <div class="vault-grid" id="vd-grid"></div>
        <button class="vault-reset" id="vd-reset" aria-label="reset">↺</button>`;
      const N_SCRAMBLE = 4 + Math.min(3, ctx.difficulty());
      const startedAt = Date.now();

      // lit = true is the goal state for all 9
      let start, board;
      function toggle(b, i) {
        const r = Math.floor(i / 3), c = i % 3;
        [[r, c], [r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]].forEach(([rr, cc]) => {
          if (rr >= 0 && rr < 3 && cc >= 0 && cc < 3) b[rr * 3 + cc] = !b[rr * 3 + cc];
        });
      }
      function scramble() {
        const b = Array(9).fill(true);
        for (let k = 0; k < N_SCRAMBLE; k++) toggle(b, Math.floor(Math.random() * 9));
        return b.every(Boolean) ? scramble() : b; // never start solved
      }
      start = scramble();
      board = start.slice();

      const grid = document.getElementById('vd-grid');
      function render() {
        grid.innerHTML = '';
        board.forEach((lit, i) => {
          const t = document.createElement('div');
          t.className = 'vault-tile' + (lit ? ' lit' : '');
          t.textContent = lit ? '◆' : '◇';
          t.addEventListener('click', () => move(i));
          grid.appendChild(t);
        });
      }

      function move(i) {
        toggle(board, i);
        ctx.trackerRecord('boss_move', {});
        render();
        if (board.every(Boolean)) {
          ctx.trackerRecord('boss_solved', { ms: Date.now() - startedAt });
          ctx.feedback('🔓', 'success');
          setTimeout(ctx.complete, 900);
        }
      }

      document.getElementById('vd-reset').addEventListener('click', () => {
        board = start.slice();
        ctx.trackerRecord('boss_reset', {});
        render();
      });

      render();
    }
  };
})();
```

- [ ] **Step 2: Manual verify (full run now possible)**

Play a complete run: chambers 1–3 + all forks + boss. Expected: boss shows a glyph grid with NO text; clicking tiles toggles plus-shaped groups; solving it (all ◆ lit gold) shows 🔓 then the **reveal screen** with an archetype and blurb; Continue → share screen; "Keep it to myself" → thanks screen saying the run stayed on-device. Check DevTools → Network: **zero requests to any external host during the whole run**.

- [ ] **Step 3: `npm test` green + commit**

```bash
git add js/games/vaultDoor.js
git commit -m "feat: boss chamber — zero-instruction Vault Door puzzle"
```

---

### Task 11: Supabase backend — schema, RLS, RPC, config

**Files:**
- Create: `supabase/migrations/001_init.sql`
- Modify: `js/config.js` (real values)

**Interfaces:**
- Consumes: payload shape from `buildRunPayload` (Task 5), RPC name `redeem_quest_code(p_code text)` from `api.js` (Task 5).
- Produces: live `shared_runs` + `quest_codes` tables and RPC on a Supabase project; `js/config.js` filled with the project URL + anon key.

- [ ] **Step 1: Write `supabase/migrations/001_init.sql`**

```sql
-- SUPERPOWER ARCADE v1 — runs land here ONLY via the player's consented share tap.
create table public.shared_runs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  player_name text not null,
  contact text not null,
  quest_code text,
  archetype text not null,
  evidence jsonb not null default '[]',
  signals jsonb not null default '{}'
);
alter table public.shared_runs enable row level security;
create policy "game clients may insert runs" on public.shared_runs
  for insert to anon with check (true);
create policy "keeper may read runs" on public.shared_runs
  for select to authenticated using (true);

create table public.quest_codes (
  code text primary key,
  invitee_name text not null,
  message text not null,
  active boolean not null default true
);
alter table public.quest_codes enable row level security;
create policy "keeper may manage quest codes" on public.quest_codes
  for all to authenticated using (true) with check (true);
-- NOTE: no anon policy on quest_codes — anon reaches codes only through the RPC below.

create or replace function public.redeem_quest_code(p_code text)
returns table (invitee_name text, message text)
language sql
security definer
set search_path = public
as $$
  select invitee_name, message
  from quest_codes
  where code = upper(trim(p_code)) and active
$$;
-- Lock the SECURITY DEFINER function properly (revoking from anon/authenticated
-- alone is a no-op while PUBLIC still has execute):
revoke all on function public.redeem_quest_code(text) from public;
grant execute on function public.redeem_quest_code(text) to anon, authenticated;
```

- [ ] **Step 2: Create the Supabase project + apply the migration**

Use the Supabase MCP (this ecosystem's rule: **always `apply_migration`, never `db push`**):
1. `list_organizations` / `get_cost` / `confirm_cost` → `create_project` named `superpower-arcade` (free tier). If Lyndz prefers an existing org project, ask first.
2. `apply_migration` with name `001_init` and the SQL above.
3. `list_tables` → verify `shared_runs` and `quest_codes` exist with RLS enabled.

- [ ] **Step 3: Fill `js/config.js`**

Get values via MCP `get_project_url` + `get_publishable_keys`, then:
```js
window.SPA_CONFIG = {
  SUPABASE_URL: '<project url>',
  SUPABASE_ANON_KEY: '<anon/publishable key>'
};
```
(The anon key is designed to be public; RLS is the security boundary. The service key must never appear in this repo.)

- [ ] **Step 4: Verify security boundary from the outside**

Run (Git Bash; substitute real URL/key):
```bash
# anon INSERT allowed:
curl -s -o /dev/null -w "%{http_code}" -X POST "$URL/rest/v1/shared_runs" \
  -H "apikey: $ANON" -H "Authorization: Bearer $ANON" -H "Content-Type: application/json" \
  -d '{"player_name":"curl-test","contact":"x@y.z","archetype":"wild_card","evidence":[],"signals":{}}'
# Expected: 201

# anon SELECT blocked:
curl -s "$URL/rest/v1/shared_runs?select=*" -H "apikey: $ANON" -H "Authorization: Bearer $ANON"
# Expected: [] (empty — RLS hides all rows)

# anon direct read of quest_codes blocked:
curl -s "$URL/rest/v1/quest_codes?select=*" -H "apikey: $ANON" -H "Authorization: Bearer $ANON"
# Expected: [] or a permission error — never rows
```

- [ ] **Step 5: Run `get_advisors` (security) and fix anything it flags on these two tables/function.**

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/001_init.sql js/config.js
git commit -m "feat: Supabase schema — shared_runs (insert-only), quest_codes (RPC-only), locked RPC"
```

---

### Task 12: Wire share + quest codes end-to-end against live backend

**Files:**
- Modify: none expected (app.js from Task 6 already wires `sendRun`/`tryQuestCode`) — this task is integration verification; fix any wiring bugs found.

**Interfaces:**
- Consumes: everything.
- Produces: proven player-side loop.

- [ ] **Step 1: Seed a TEST quest code** (not Evan's yet)

Via Supabase MCP `execute_sql`:
```sql
insert into quest_codes (code, invitee_name, message)
values ('TEST-KEY', 'Test Runner', 'The Keeper left this door open for you.');
```

- [ ] **Step 2: Full integration pass**

Serve locally, then verify each:
1. Landing → "Got a key from a friend?" → enter `test-key` (lowercase on purpose) → expect `🔓 Welcome, Test Runner…`.
2. Enter a wrong code → expect "That key doesn't fit any lock here."
3. Play a full run → reveal → Continue → share screen shows the personal greeting + pre-filled name.
4. Tap "Send my run" with a contact filled → expect thanks screen "Run received by the Keeper."
5. Via MCP `execute_sql`: `select player_name, quest_code, archetype, jsonb_array_length(evidence) from shared_runs order by created_at desc limit 3;` → the run row is there with quest_code `TEST-KEY` and evidence notes.
6. Play another run and tap "Keep it to myself" → confirm via the same query that **no new row** appeared.
7. DevTools Network during play (before share): confirm the ONLY external call in the whole session was the quest-code RPC at the landing screen (player-initiated) — nothing during chambers/forks/boss/reveal.

- [ ] **Step 3: Fix anything broken, `npm test` green, commit**

```bash
git add -A
git commit -m "test: E2E player loop verified against live Supabase (share + skip + quest codes)"
```

---

### Task 13: Admin dashboard — evidence-first, Keeper's eyes only

**Files:**
- Create: `admin/index.html`, `admin/admin.js`

**Interfaces:**
- Consumes: Supabase auth password grant (`POST /auth/v1/token?grant_type=password`), `shared_runs` select policy (authenticated), `SPA_CONFIG` via `../js/config.js`.
- Produces: private dashboard listing runs newest-first, **behaviour evidence on top, archetype below** (spec §7: never just "this person is X"), mailto invite button.

- [ ] **Step 1: Create the Keeper's auth user**

In Supabase dashboard → Authentication → Add user: email `lyndzwills@gmail.com` + strong password (Lyndz sets it). Email confirm: mark confirmed. (Only this one user will ever exist.)

- [ ] **Step 2: Write `admin/index.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Arcade Keeper</title>
  <link rel="stylesheet" href="../style.css">
  <style>
    #app { width: min(860px, 96vw); text-align: left; }
    .run-card { border: 1px solid var(--border); border-radius: 14px; padding: 20px;
      margin: 14px 0; background: var(--bg-card); }
    .run-card h3 { margin-bottom: 4px; }
    .evidence { margin: 12px 0; padding-left: 20px; line-height: 1.7; }
    .archetype-line { color: var(--text-dim); }
    .meta-line { font-size: .85rem; color: var(--text-dim); }
    .quest-badge { color: var(--neon-gold); }
  </style>
</head>
<body>
  <main id="app">
    <section id="login">
      <h2>🗝️ Arcade Keeper</h2>
      <input id="email" class="input" type="email" placeholder="email" style="text-align:left">
      <input id="password" class="input" type="password" placeholder="password" style="text-align:left">
      <button id="btn-login" class="btn btn-primary">Open the vault</button>
      <p id="login-feedback" class="small"></p>
    </section>
    <section id="runs" class="hidden">
      <h2>📡 Shared runs</h2>
      <div id="run-list"></div>
    </section>
  </main>
  <script src="../js/config.js"></script>
  <script src="admin.js"></script>
</body>
</html>
```

- [ ] **Step 3: Write `admin/admin.js`**

```js
/* Arcade Keeper dashboard. Evidence first — the behaviour behind the profile, never just a label. */
(function () {
  const cfg = window.SPA_CONFIG;
  const $ = (id) => document.getElementById(id);
  let token = null;

  async function login() {
    $('login-feedback').textContent = 'Opening…';
    const res = await fetch(`${cfg.SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { apikey: cfg.SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: $('email').value.trim(), password: $('password').value })
    });
    const data = await res.json();
    if (!res.ok || !data.access_token) {
      $('login-feedback').textContent = 'That key doesn’t fit.';
      return;
    }
    token = data.access_token;
    $('login').classList.add('hidden');
    $('runs').classList.remove('hidden');
    loadRuns();
  }

  async function loadRuns() {
    const res = await fetch(
      `${cfg.SUPABASE_URL}/rest/v1/shared_runs?select=*&order=created_at.desc&limit=100`,
      { headers: { apikey: cfg.SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` } }
    );
    const runs = await res.json();
    const list = $('run-list');
    list.innerHTML = runs.length ? '' : '<p class="small">No runs shared yet.</p>';
    for (const run of runs) list.appendChild(card(run));
  }

  function card(run) {
    const div = document.createElement('div');
    div.className = 'run-card';
    const evidence = (run.evidence || []).map((e) => `<li>${escapeHtml(e)}</li>`).join('');
    const quest = run.quest_code ? `<span class="quest-badge">🔑 ${escapeHtml(run.quest_code)}</span>` : '';
    const subject = encodeURIComponent('Your Superpower Arcade run 🕹️');
    const body = encodeURIComponent(
      `Hey ${run.player_name},\n\nYour arcade run lit up the board. Fancy a relaxed chat about building things together? ` +
      `No interview energy — I’ll send the questions ahead of time.\n\n— Lyndz`);
    div.innerHTML = `
      <h3>${escapeHtml(run.player_name)} ${quest}</h3>
      <p class="meta-line">${new Date(run.created_at).toLocaleString()} · ${escapeHtml(run.contact)}</p>
      <ul class="evidence">${evidence}</ul>
      <p class="archetype-line">Profile summary: ${escapeHtml(run.archetype)}</p>
      <a class="btn btn-secondary" href="mailto:${encodeURIComponent(run.contact)}?subject=${subject}&body=${body}">
        🤝 Invite to crew</a>`;
    return div;
  }

  function escapeHtml(s) {
    return String(s ?? '').replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  document.addEventListener('DOMContentLoaded', () => {
    $('btn-login').addEventListener('click', login);
    $('password').addEventListener('keypress', (e) => { if (e.key === 'Enter') login(); });
  });
})();
```

- [ ] **Step 4: Manual verify**

Open http://localhost:8123/admin/ → wrong password → "That key doesn't fit." → correct login → run cards render **evidence bullets above the archetype line**, quest badge on the TEST-KEY run, "Invite to crew" opens a mail draft. Confirm a logged-out browser tab cannot fetch `shared_runs` rows (curl check from Task 11 already proves this).

- [ ] **Step 5: `npm test` green + commit**

```bash
git add admin/
git commit -m "feat: Arcade Keeper dashboard — evidence-first run cards + invite"
```

---

### Task 14: Evan's key, deploy, and the Definition-of-Done run

**Files:**
- Modify: `README.md` (replace placeholder structure section with real run/test/deploy instructions)

**Interfaces:**
- Consumes: everything.
- Produces: v1 DONE per spec §10.

- [ ] **Step 1: Seed Evan's real quest code** (get his preferred name from Lyndz if unsure)

Via Supabase MCP `execute_sql`:
```sql
insert into quest_codes (code, invitee_name, message)
values ('BOLT-RISING', 'Evan', 'The Keeper has been waiting for you. Show us what you’ve got.');
delete from quest_codes where code = 'TEST-KEY';
```
(If a different code word is wanted, Lyndz picks it — keep format `WORD-WORD`.)

- [ ] **Step 2: Update `README.md`**

Replace the "Project structure" and "How to run" sections to match reality:
```markdown
## How to run
- Play: `python -m http.server 8123` → http://localhost:8123
- Keeper dashboard: http://localhost:8123/admin/
- Tests: `npm test` (Node ≥18, zero dependencies)

## Project structure
- `app.js` + `index.html` + `style.css` — game shell and flow
- `js/core/` — pure logic (signals, forks, profile, payload, api) — all unit-tested
- `js/agents/`, `js/systems/` — engine ported from ULTIMATE-ADHD-BRAIN-ARCADE
- `js/games/` — the four chambers
- `data/` — forks and archetypes
- `admin/` — private Keeper dashboard
- `supabase/migrations/` — backend schema (applied via MCP apply_migration)
```
Keep the existing tone/sections otherwise.

- [ ] **Step 3: Deploy to Vercel (static)**

Use the `vercel:deploy` skill (or `vercel deploy` CLI) from the repo root — it's a static site, no build config needed. Verify the deployed URL serves the game AND `/admin/`. ⚠ This machine has a hard RAM ceiling — no local builds are involved here (static deploy), which is exactly why v1 has no bundler.

- [ ] **Step 4: THE DEFINITION-OF-DONE RUN (spec §10)**

On the deployed URL:
1. Enter quest code `BOLT-RISING` → personalized unlock message appears.
2. Play the full run: landing → energy → 3 chambers with forks (take the "pocket the coins" path once to see the repair fork) → boss → reveal → share pre-filled with "Evan" → tap send.
3. Log into `/admin/` → the run is there: evidence notes first (promise, glitch, generosity, repair, retries, boss moves), archetype below, 🔑 BOLT-RISING badge, contact, working invite button.
4. Play a second run, tap "Keep it to myself" → confirm zero new rows (`select count(*) from shared_runs`).
5. `npm test` → all green.

- [ ] **Step 5: Final commit + report**

```bash
git add README.md
git commit -m "docs: v1 run/test/deploy instructions — The Evan Run is live"
git push origin main
```
Report to Lyndz: deployed URL, Evan's quest code, dashboard URL, and what's explicitly NOT in v1 (spec §9).

---

## Self-Review (completed)

- **Spec coverage:** §1 purpose → Tasks 4/13 (evidence-first, Round-2 handoff copy in invite email); §2 merge → Task 1 (verbatim port) + zero-text boss (Task 10, Mind Vault soul); §3 privacy → Tasks 5/6/12 (api.js isolation, network-silence check, skip path); §4 journey → Tasks 6–10; §5 character signals incl. repair + promise → Tasks 3/4; §6 signal engine → Tasks 1/2/4; §7 architecture → all; §8 guardrails → same chambers hardcoded in `SPA.CHAMBERS`, positive-only blurbs (Task 4), no-diagnosis rule in Global Constraints; §9 exclusions respected (no 3D, no Python, no BROski$); §10 DoD → Task 14.
- **Placeholder scan:** `REPLACE_IN_TASK_11` in config.js is intentional and resolved by Task 11 Step 3. No TBD/TODO remain.
- **Type consistency:** ctx contract (`difficulty()`, `onRound`, `trackerRecord`, `complete`, `feedback`, `grantCoins`) matches across Tasks 6–10; payload keys match `shared_runs` columns (Tasks 5/11); RPC name + param (`redeem_quest_code`, `p_code`) match between api.js and SQL; fork signal vocabulary matches between forks.js, ForkFlow tests, and FORK_EVIDENCE map.
