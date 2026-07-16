# Deep Vault v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the Deep Vault Update — Word Vault (dual-mode verbal chamber), Lost Score (ethics under pressure + repair), The Scramble (chaos-to-plan gate), and save-and-resume with resume-as-signal — on top of the existing v1 arcade. Also fixes v1 schema/API drift that currently breaks share + quest codes.

**Architecture:** Follow v1's exact layering: logic classes in `js/chambers/` (constructor takes `{tracker, dial, dj}`, round API `nextRound()/answer()/timeout()/isComplete()`), DOM mount adapters in `js/games/` (register `window.SPA.games['<id>'] = {icon, durationSec, mount(el, ctx)}`), data in `data/*.js`, flow control only in `app.js`, network ONLY in `js/core/api.js`. Every module uses the dual export pattern (`module.exports` for node tests + `window.X` for the browser). Tests run with `node --test` (zero dependencies, no bundler — this machine has a hard RAM ceiling).

**Tech Stack:** Vanilla JS (no framework, no build step), Supabase (REST + RPC, anon key), `node --test`, static Vercel deploy.

**Spec:** `docs/superpowers/specs/2026-07-16-deep-vault-v2-design.md`

## Global Constraints

- **Consent-led share only:** nothing leaves the device except via `js/core/api.js`, called only from the share screen / quest-code entry. Any new module that imports/fetches network = defect.
- **No diagnosis labels anywhere.** Archetypes stay the same 5. Evidence strings are **descriptive, never interpretive** — state what happened with numbers ("reported 12 when true count was 8"), never judgments ("dishonest"). No composite trust score. No single signal presented as a solo verdict.
- **Lost Score honesty band:** reports within **±10%** of true value = honest. Only inflation **beyond +10%** triggers the repair offer. No in-game reward/penalty difference for honest vs inflated (lying stays free and profitable).
- **Repair-window (deterministic):** repair offer fires at the next scene transition after the Lost Score report, and **never later than Scramble entry**.
- **Scramble clueing:** the cued 3-item set must be derivable from the Scramble screen alone (boss-door preview glyphs shown next to the inventory). Never dependent on earlier-run memory.
- **Word Vault fairness:** both modes have the same item count and difficulty ramp; players compared within mode only; neither mode labelled easier.
- **Save/resume storage:** "client-side persisted run state" — implemented with `localStorage` key `spa_saved_run` in v2. `resume_gap` (ms away) and `finished_after_resume` (boolean) are **separate** signals.
- **Same tests for every player:** chamber order and content fixed; DifficultyDial adjusts difficulty within a game, never which tests appear.
- Dual export pattern in every new JS file: `if (typeof module !== 'undefined' && module.exports) { module.exports = X; } else { window.X = X; }`
- Run tests from repo root: `npm test` (runs `node --test`, discovers `tests/*.test.js`). Run a single file: `node --test tests/<file>.test.js`.
- Commit prefixes: `feat:` / `fix:` / `test:` / `docs:` / `chore:` only.
- Branch: `feat/deep-vault-v2` off `main`.

---

## File Structure

- **Fix:** `supabase/schema.sql` (drift repair + v2 seed), `js/core/api.js` (no change needed after schema fix — RPC name aligned in SQL)
- **Create:** `js/core/RunStateStore.js`, `js/chambers/WordVault.js`, `js/games/wordVault.js`, `data/wordVault.js`, `js/core/LostScore.js`, `js/chambers/Scramble.js`, `js/games/scramble.js`, `data/scramble.js`
- **Modify:** `js/core/SignalTracker.js` (restore), `app.js` (flow), `index.html` (screens + script tags), `js/core/profileMapper.js` (evidence), `admin/dashboard.js` (evidence rows already render the evidence array — verify only)
- **Tests:** `tests/run_state_store.test.js`, `tests/word_vault.test.js`, `tests/lost_score.test.js`, `tests/scramble.test.js` (create); `tests/api.test.js`, `tests/run_payload.test.js`, `tests/profile_mapper.test.js`, `tests/e2e.test.js` (extend)

---

### Task 1: Fix v1 schema/API drift (share + quest codes actually work)

**Files:**
- Modify: `supabase/schema.sql`
- Test: `tests/run_payload.test.js` (extend)

**Interfaces:**
- Consumes: `buildRunPayload` output keys (`js/core/runPayload.js:3-17`): `player_name, contact, quest_code, archetype, evidence, broski_coins, signals` — plus `archetype_name`, `energy` which the payload does NOT currently send (see Step 3).
- Produces: a `shared_runs` table whose columns are a superset of the payload keys; an RPC named `redeem_quest_code(p_code)` returning `invitee_name` + `message` (what `app.js:195-198` expects).

- [ ] **Step 1: Write the failing test — payload/schema column parity**

Append to `tests/run_payload.test.js`:

```js
const fs = require('node:fs');
const path = require('node:path');

test('every payload key has a shared_runs column in schema.sql', () => {
  const schema = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'schema.sql'), 'utf8');
  const tableDef = schema.split('create table if not exists public.shared_runs')[1].split(');')[0];
  const payload = buildRunPayload({
    runJson: { meta: { energy: 'high' }, events: [] },
    profile: { archetype: { id: 'wild_card', name: 'Wild Card' }, evidence: [], scores: {} },
    name: 'Test', contact: 't@t.com', questCode: 'BOLT-RISING'
  });
  for (const key of Object.keys(payload)) {
    assert.ok(tableDef.includes(key), `shared_runs is missing column for payload key: ${key}`);
  }
});

test('schema defines the RPC name api.js actually calls', () => {
  const schema = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'schema.sql'), 'utf8');
  const api = fs.readFileSync(path.join(__dirname, '..', 'js', 'core', 'api.js'), 'utf8');
  const rpcCalled = api.match(/rpc\/(\w+)/)[1];
  assert.ok(schema.includes(`function public.${rpcCalled}`), `schema.sql must define RPC ${rpcCalled}`);
  assert.ok(schema.includes('invitee_name'), 'quest RPC must return invitee_name (app.js expects it)');
});
```

(Match the file's existing `test`/`assert` import style at its top — it already requires `node:test` and `node:assert`.)

- [ ] **Step 2: Run to verify both fail**

Run: `node --test tests/run_payload.test.js`
Expected: FAIL — missing `player_name`/`contact` columns; RPC `redeem_quest_code` not in schema.

- [ ] **Step 3: Fix `supabase/schema.sql`**

Apply these changes:

1. In the `shared_runs` create table, add after `archetype_name text not null`:
```sql
  player_name   text        not null default '',
  contact       text        not null default '',
```
2. Make `archetype_name` nullable-with-default since the payload doesn't send it (v1 payload drift — the dashboard derives the name from `archetype` id anyway):
```sql
  archetype_name text       not null default '',
```
   And `energy` already exists and is nullable — payload doesn't send it either; leave as-is (it rides inside `signals.meta.energy`).
3. In the `quest_codes` table, add after `label text not null`:
```sql
  invitee_name text        not null default '',
  message      text        not null default 'The Keeper is expecting you.',
```
4. Replace the whole `validate_quest_code` function block with one named what the client calls, returning what the client reads:
```sql
-- RPC: redeem a quest code (the name js/core/api.js calls)
create or replace function public.redeem_quest_code(p_code text)
returns table (invitee_name text, message text)
language plpgsql security definer set search_path = public
as $$
begin
  return query
    update public.quest_codes qc
       set used_count = qc.used_count + 1
     where qc.code = upper(trim(p_code)) and qc.active = true
    returning qc.invitee_name, qc.message;
end;
$$;

revoke execute on function public.redeem_quest_code(text) from public;
grant  execute on function public.redeem_quest_code(text) to anon;
```
5. Update the Evan seed to fill the new columns:
```sql
insert into public.quest_codes (code, label, invitee_name, message, active)
values ('BOLT-RISING', 'Evan - BOLT-RISING VIP Access', 'Evan', 'The Keeper has been waiting for you. Show us what you''ve got.', true)
on conflict (code) do nothing;
```
6. Add `player_name` and `contact` to the `keeper_runs` view's select list.

- [ ] **Step 4: Run tests to verify pass**

Run: `node --test tests/run_payload.test.js` → PASS. Then `npm test` → no regressions.

- [ ] **Step 5: Commit**

```bash
git add supabase/schema.sql tests/run_payload.test.js
git commit -m "fix: align shared_runs/quest_codes schema with the payload and RPC the client actually sends"
```

---

### Task 2: RunStateStore — save/resume core + SignalTracker.restore

**Files:**
- Create: `js/core/RunStateStore.js`
- Modify: `js/core/SignalTracker.js`
- Test: `tests/run_state_store.test.js` (create)

**Interfaces:**
- Consumes: `SignalTracker.toJSON()` shape `{meta, events}` (`js/core/SignalTracker.js`).
- Produces (for Task 6): `new RunStateStore({storage})` with `save(state)`, `load()`, `clear()`, `markResumed(nowMs)`. `save` takes `{chamberIndex, coins, streak, sceneQueue, trackerJson, lostScoreState}` and stamps `savedAt`. `load()` returns the saved object or `null`. `markResumed(nowMs)` returns `{resumeGapMs}` and re-stamps. Also `SignalTracker.restore(json)` rehydrates `meta`+`events`.

- [ ] **Step 1: Write the failing tests**

Create `tests/run_state_store.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert');
const RunStateStore = require('../js/core/RunStateStore.js');
const SignalTracker = require('../js/core/SignalTracker.js');

function memStorage() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
}

test('save/load round-trips full run state', () => {
  const store = new RunStateStore({ storage: memStorage() });
  const state = { chamberIndex: 2, coins: 35, streak: 4, sceneQueue: ['lost-score'], trackerJson: { meta: { energy: 'high' }, events: [{ type: 'x', detail: {}, at: 1 }] }, lostScoreState: null };
  store.save(state);
  const loaded = store.load();
  assert.equal(loaded.chamberIndex, 2);
  assert.equal(loaded.coins, 35);
  assert.deepEqual(loaded.sceneQueue, ['lost-score']);
  assert.equal(loaded.trackerJson.events.length, 1);
  assert.ok(loaded.savedAt > 0);
});

test('load returns null when nothing saved, and after clear', () => {
  const store = new RunStateStore({ storage: memStorage() });
  assert.equal(store.load(), null);
  store.save({ chamberIndex: 0, coins: 0, streak: 0, sceneQueue: [], trackerJson: { meta: {}, events: [] } });
  store.clear();
  assert.equal(store.load(), null);
});

test('markResumed returns the gap and re-stamps savedAt', () => {
  const storage = memStorage();
  const store = new RunStateStore({ storage });
  store.save({ chamberIndex: 1, coins: 0, streak: 0, sceneQueue: [], trackerJson: { meta: {}, events: [] } });
  const saved = store.load();
  const later = saved.savedAt + 26 * 3600 * 1000;
  const { resumeGapMs } = store.markResumed(later);
  assert.equal(resumeGapMs, 26 * 3600 * 1000);
  assert.equal(store.load().savedAt, later);
});

test('SignalTracker.restore rehydrates a saved run log', () => {
  const t = new SignalTracker({});
  t.restore({ meta: { energy: 'low' }, events: [{ type: 'game_response', detail: { correct: true }, at: 5 }] });
  assert.equal(t.meta.energy, 'low');
  assert.equal(t.count('game_response'), 1);
});
```

- [ ] **Step 2: Run to verify fail** — `node --test tests/run_state_store.test.js` → FAIL (module not found / restore not a function).

- [ ] **Step 3: Implement**

Create `js/core/RunStateStore.js`:

```js
/**
 * RunStateStore — client-side persisted run state (save-and-resume).
 * Storage key: spa_saved_run. Everything stays on-device (spec §3).
 */
class RunStateStore {
  constructor({ storage, key = 'spa_saved_run' } = {}) {
    this.storage = storage;
    this.key = key;
  }

  save(state) {
    const record = { ...state, savedAt: state.savedAt || Date.now() };
    this.storage.setItem(this.key, JSON.stringify(record));
    return record;
  }

  load() {
    const raw = this.storage.getItem(this.key);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  }

  clear() { this.storage.removeItem(this.key); }

  markResumed(nowMs = Date.now()) {
    const saved = this.load();
    if (!saved) return { resumeGapMs: 0 };
    const resumeGapMs = Math.max(0, nowMs - saved.savedAt);
    saved.savedAt = nowMs;
    this.storage.setItem(this.key, JSON.stringify(saved));
    return { resumeGapMs };
  }
}

if (typeof module !== 'undefined' && module.exports) { module.exports = RunStateStore; }
else { window.RunStateStore = RunStateStore; }
```

Add to `js/core/SignalTracker.js`, after `startRun`:

```js
  restore(json) {
    this.meta = json?.meta || {};
    this.events = Array.isArray(json?.events) ? json.events : [];
    this._persist();
  }
```

- [ ] **Step 4: Run to verify pass** — `node --test tests/run_state_store.test.js` then `npm test` (no regressions).

- [ ] **Step 5: Commit**

```bash
git add js/core/RunStateStore.js js/core/SignalTracker.js tests/run_state_store.test.js
git commit -m "feat: RunStateStore save/resume core + SignalTracker.restore"
```

---

### Task 3: Word Vault — data, logic class, mount adapter

**Files:**
- Create: `data/wordVault.js`, `js/chambers/WordVault.js`, `js/games/wordVault.js`
- Test: `tests/word_vault.test.js` (create)

**Interfaces:**
- Consumes: `{tracker, dial, dj}` constructor pattern (`js/chambers/PatternBlitz.js:7-14`); adapter registration pattern (`js/games/patternBlitz.js`).
- Produces: `SPA.games['word-vault']` (Task 6 adds it to the run order); tracker events `verbal_mode_choice {mode}` and `game_response {game:'word-vault', mode, correct, timeMs, round, level}`.

- [ ] **Step 1: Create the item bank — `data/wordVault.js`**

8 rounds per mode, matched difficulty ramp (levels 1–4, two rounds each). Every item: `{level, prompt, choices, answer}`. Symbol-mode prompts use icon+single-word pairs; word-mode uses analogies/odd-one-out. Complete file:

```js
/**
 * Word Vault item bank. Two modes, SAME count and level ramp (spec §2a).
 * Symbol mode: reading load ≤ 1 word per element. Neither mode is "easier".
 */
const SPA_WORD_VAULT = {
  word: [
    { level: 1, prompt: 'hot is to cold as fast is to …', choices: ['slow', 'quick', 'warm', 'far'], answer: 'slow' },
    { level: 1, prompt: 'Odd one out:', choices: ['apple', 'banana', 'carrot', 'cherry'], answer: 'carrot' },
    { level: 2, prompt: 'kitten is to cat as puppy is to …', choices: ['dog', 'bone', 'bark', 'paw'], answer: 'dog' },
    { level: 2, prompt: 'Odd one out:', choices: ['whisper', 'shout', 'mutter', 'listen'], answer: 'listen' },
    { level: 3, prompt: 'key is to lock as password is to …', choices: ['account', 'letter', 'secret', 'keyboard'], answer: 'account' },
    { level: 3, prompt: 'Odd one out:', choices: ['glance', 'stare', 'blink', 'gaze'], answer: 'blink' },
    { level: 4, prompt: 'spark is to fire as seed is to …', choices: ['tree', 'soil', 'water', 'leaf'], answer: 'tree' },
    { level: 4, prompt: 'Odd one out:', choices: ['begin', 'commence', 'conclude', 'start'], answer: 'conclude' }
  ],
  symbol: [
    { level: 1, prompt: '🔥 hot → ❄️ …', choices: ['cold', 'wet', 'big', 'far'], answer: 'cold' },
    { level: 1, prompt: 'Odd one out:', choices: ['🍎', '🍌', '🥕', '🍒'], answer: '🥕' },
    { level: 2, prompt: '🐱 cat → 🐕 …', choices: ['dog', 'bone', 'ball', 'paw'], answer: 'dog' },
    { level: 2, prompt: 'Odd one out:', choices: ['🔊', '📢', '🔔', '👂'], answer: '👂' },
    { level: 3, prompt: '🔑 key → 🔒 · 🧠 idea → …', choices: ['💡', '📦', '🔑', '🚪'], answer: '💡' },
    { level: 3, prompt: 'Odd one out:', choices: ['👀', '🔭', '👁️', '😴'], answer: '😴' },
    { level: 4, prompt: '⚡ spark → 🔥 · 🌱 seed → …', choices: ['🌳', '🪨', '💧', '🍂'], answer: '🌳' },
    { level: 4, prompt: 'Odd one out:', choices: ['▶️', '🚀', '🏁', '🟢'], answer: '🏁' }
  ]
};

if (typeof module !== 'undefined' && module.exports) { module.exports = SPA_WORD_VAULT; }
else { window.SPA_WORD_VAULT = SPA_WORD_VAULT; }
```

- [ ] **Step 2: Write the failing tests**

Create `tests/word_vault.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert');
const { WordVault } = require('../js/chambers/WordVault.js');
const BANK = require('../data/wordVault.js');
const SignalTracker = require('../js/core/SignalTracker.js');

const fakeDial = { getCurrentLevel: () => 1, recordResponse: () => ({ action: 'maintain', level: 1 }) };
const fakeDj = { processResponse: () => null };

test('both modes have matched item counts and level ramps', () => {
  assert.equal(BANK.word.length, BANK.symbol.length);
  assert.deepEqual(BANK.word.map(i => i.level), BANK.symbol.map(i => i.level));
  for (const mode of ['word', 'symbol']) for (const item of BANK[mode]) {
    assert.ok(item.choices.includes(item.answer), `${mode} item "${item.prompt}" answer not in choices`);
  }
});

test('records mode choice and per-round responses with mode attached', () => {
  const tracker = new SignalTracker({});
  tracker.startRun('med');
  const wv = new WordVault({ tracker, dial: fakeDial, dj: fakeDj });
  wv.chooseMode('symbol');
  assert.equal(tracker.events.filter(e => e.type === 'verbal_mode_choice').length, 1);
  let round = wv.nextRound();
  assert.ok(round.prompt && round.choices.length === 4);
  wv.answer(round.answerForTest === undefined ? round.choices[0] : round.answerForTest);
  const rec = tracker.events.find(e => e.type === 'game_response' && e.detail.game === 'word-vault');
  assert.equal(rec.detail.mode, 'symbol');
});

test('completes after all 8 rounds and reports accuracy', () => {
  const tracker = new SignalTracker({});
  tracker.startRun('med');
  const wv = new WordVault({ tracker, dial: fakeDial, dj: fakeDj });
  wv.chooseMode('word');
  let round;
  while ((round = wv.nextRound())) wv.answer(BANK.word[wv.round - 1].answer);
  assert.ok(wv.isComplete());
  assert.equal(wv.correctCount, 8);
});
```

- [ ] **Step 3: Run to verify fail** — `node --test tests/word_vault.test.js` → FAIL (module not found).

- [ ] **Step 4: Implement `js/chambers/WordVault.js`**

```js
/**
 * The Word Vault — dual-mode verbal reasoning chamber (spec §2a).
 * Mode is the player's choice; recorded as verbal_mode_choice; compared within mode only.
 */
function getBank() {
  return (typeof module !== 'undefined' && module.exports)
    ? require('../../data/wordVault.js')
    : window.SPA_WORD_VAULT;
}

class WordVault {
  constructor({ tracker, dial, dj }) {
    this.tracker = tracker;
    this.dial = dial;
    this.dj = dj;
    this.mode = null;
    this.round = 0;
    this.correctCount = 0;
    this.done = false;
  }

  chooseMode(mode) {
    this.mode = mode === 'symbol' ? 'symbol' : 'word';
    this.items = getBank()[this.mode];
    this.ROUNDS = this.items.length;
    this.tracker.record('verbal_mode_choice', { mode: this.mode });
  }

  nextRound() {
    if (!this.mode || this.round >= this.ROUNDS) { this.done = true; return null; }
    const item = this.items[this.round];
    this.round++;
    this._current = { item, startMs: Date.now() };
    return { round: this.round, total: this.ROUNDS, prompt: item.prompt, choices: [...item.choices], timeLimit: 12000 };
  }

  answer(chosen) {
    if (!this._current) return;
    const timeMs = Date.now() - this._current.startMs;
    const correct = chosen === this._current.item.answer;
    if (correct) this.correctCount++;
    this.dial.recordResponse(correct, timeMs);
    this.tracker.record('game_response', {
      game: 'word-vault', mode: this.mode, correct, timeMs,
      round: this.round, level: this._current.item.level
    });
    return { correct, timeMs };
  }

  timeout() {
    this.dial.recordResponse(false, 99999);
    this.tracker.record('game_response', { game: 'word-vault', mode: this.mode, correct: false, timeMs: 12000, round: this.round, level: this._current?.item.level || 1, timedOut: true });
    return { correct: false, timedOut: true };
  }

  isComplete() { return this.done || (this.mode && this.round >= this.ROUNDS); }
}

if (typeof module !== 'undefined' && module.exports) { module.exports = { WordVault }; }
else { window.WordVault = WordVault; }
```

- [ ] **Step 5: Run to verify pass** — `node --test tests/word_vault.test.js` → PASS (fix the second test to use the bank answer like the third test does if it flakes — assert on the recorded event, not correctness).

- [ ] **Step 6: Implement the mount adapter `js/games/wordVault.js`**

Follow `js/games/patternBlitz.js`'s structure exactly (icon `📖`, `durationSec: null`). The mount shows a **mode-pick screen first** — two equal buttons ("📖 Word Vault" / "🔷 Symbol Vault", same size, no "easy" labelling), plus an OpenDyslexic toggle button shown only after Word mode is picked (`document.body.classList.toggle('font-od')`; add `.font-od { font-family: 'OpenDyslexic', sans-serif; }` to `style.css` with a graceful fallback). After mode pick → render rounds: prompt heading, 4 choice buttons in the 2×2 grid pattern, per-round `setTimeout` for the 12s limit calling `logic.timeout()` then next round; on `logic.isComplete()` call `ctx.complete()`. Wire responses through `ctx.onRound(correct, timeMs)` exactly as patternBlitz's adapter does so DifficultyDial/DopamineDJ/coins keep working.

- [ ] **Step 7: Run full suite** — `npm test` → all green (adapter is browser-only; logic is covered).

- [ ] **Step 8: Commit**

```bash
git add data/wordVault.js js/chambers/WordVault.js js/games/wordVault.js style.css tests/word_vault.test.js
git commit -m "feat: Word Vault dual-mode verbal chamber (logic + adapter + item bank)"
```

---

### Task 4: Lost Score — logic + repair window

**Files:**
- Create: `js/core/LostScore.js`
- Test: `tests/lost_score.test.js` (create)

**Interfaces:**
- Consumes: `SignalTracker.toJSON()` events (`game_response` with `{game, correct}`).
- Produces (for Task 6): `LostScore.computeBest(trackerJson)` → `{game, correctCount}` over the 3 v1 chambers + word-vault; `LostScore.report(reported)` → `{delta, honest, needsRepair}`; `LostScore.repair(tookIt)`; records `self_report_delta {game, reported, trueCount, delta}` and `repair_after_inflate {tookIt}`; `pendingRepair` flag Task 6 uses to enforce the ≤ Scramble-entry window.

- [ ] **Step 1: Write the failing tests**

Create `tests/lost_score.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert');
const { LostScore } = require('../js/core/LostScore.js');
const SignalTracker = require('../js/core/SignalTracker.js');

function trackerWith(counts) { // counts = {gameId: [correct booleans]}
  const t = new SignalTracker({});
  t.startRun('med');
  for (const [game, arr] of Object.entries(counts))
    for (const c of arr) t.record('game_response', { game, correct: c, timeMs: 500 });
  return t;
}

test('computeBest finds the chamber with most correct answers', () => {
  const t = trackerWith({ 'pattern-blitz': [true, true, true], 'number-rush': [true], 'word-vault': [true, true] });
  const best = LostScore.computeBest(t.toJSON());
  assert.equal(best.game, 'pattern-blitz');
  assert.equal(best.correctCount, 3);
});

test('honest within ±10%, no repair', () => {
  const t = trackerWith({ 'pattern-blitz': Array(10).fill(true) });
  const ls = new LostScore({ tracker: t });
  const res = ls.report(10);
  assert.equal(res.honest, true);
  assert.equal(res.needsRepair, false);
  const ev = t.events.find(e => e.type === 'self_report_delta');
  assert.equal(ev.detail.reported, 10);
  assert.equal(ev.detail.trueCount, 10);
});

test('inflation beyond +10% flags repair; repair recorded both ways', () => {
  const t = trackerWith({ 'pattern-blitz': Array(10).fill(true) });
  const ls = new LostScore({ tracker: t });
  const res = ls.report(14); // +40%
  assert.equal(res.honest, false);
  assert.equal(res.needsRepair, true);
  assert.equal(ls.pendingRepair, true);
  ls.repair(true);
  assert.equal(ls.pendingRepair, false);
  const ev = t.events.find(e => e.type === 'repair_after_inflate');
  assert.equal(ev.detail.tookIt, true);
});

test('under-reporting is honest-side (never triggers repair)', () => {
  const t = trackerWith({ 'pattern-blitz': Array(10).fill(true) });
  const ls = new LostScore({ tracker: t });
  const res = ls.report(6); // modest / forgot — not inflation
  assert.equal(res.needsRepair, false);
});
```

- [ ] **Step 2: Run to verify fail** — `node --test tests/lost_score.test.js` → FAIL.

- [ ] **Step 3: Implement `js/core/LostScore.js`**

> Correction from Task 4 review: the zero-true-score case now treats any nonzero report as full inflation (Bro's call) — the original snippet forced delta=0 here, which let a 0-correct chamber report any score as "honest".

```js
/**
 * The Lost Score — ethics under pressure (spec §2b).
 * The true score is never lost. ±10% = honest. Inflation beyond +10% queues ONE
 * repair offer, which app.js must fire within 1-2 scenes (never later than Scramble entry).
 * No in-game reward difference either way — lying stays free and profitable.
 */
const LS_GAMES = ['pattern-blitz', 'color-cascade', 'number-rush', 'word-vault'];

class LostScore {
  static computeBest(trackerJson) {
    const counts = {};
    for (const e of trackerJson.events || []) {
      if (e.type === 'game_response' && LS_GAMES.includes(e.detail.game) && e.detail.correct)
        counts[e.detail.game] = (counts[e.detail.game] || 0) + 1;
    }
    let best = { game: LS_GAMES[0], correctCount: 0 };
    for (const [game, correctCount] of Object.entries(counts))
      if (correctCount > best.correctCount) best = { game, correctCount };
    return best;
  }

  constructor({ tracker }) {
    this.tracker = tracker;
    this.best = LostScore.computeBest(tracker.toJSON());
    this.pendingRepair = false;
    this.reported = null;
  }

  report(reported) {
    this.reported = reported;
    const trueCount = this.best.correctCount;
    const delta = trueCount > 0 ? (reported - trueCount) / trueCount : (reported > 0 ? 1 : 0);
    const honest = delta <= 0.10; // under-reporting is never dishonest
    this.pendingRepair = !honest;
    this.tracker.record('self_report_delta', { game: this.best.game, reported, trueCount, delta: Number(delta.toFixed(3)) });
    return { delta, honest, needsRepair: this.pendingRepair };
  }

  repair(tookIt) {
    this.pendingRepair = false;
    this.tracker.record('repair_after_inflate', { tookIt: !!tookIt });
  }
}

if (typeof module !== 'undefined' && module.exports) { module.exports = { LostScore }; }
else { window.LostScore = LostScore; }
```

- [ ] **Step 4: Run to verify pass** — `node --test tests/lost_score.test.js`, then `npm test`.

- [ ] **Step 5: Commit**

```bash
git add js/core/LostScore.js tests/lost_score.test.js
git commit -m "feat: Lost Score ethics module — ±10% honest band, single repair offer"
```

---

### Task 5: The Scramble — data, logic, adapter

**Files:**
- Create: `data/scramble.js`, `js/chambers/Scramble.js`, `js/games/scramble.js`
- Test: `tests/scramble.test.js` (create)

**Interfaces:**
- Consumes: tracker record pattern.
- Produces (for Task 6): `SPA.games['scramble']`; tracker events `scramble_result {picks, cuedSet, matches, latencyMs, changes, timedOut}`. Data shape below is the contract the adapter renders.

- [ ] **Step 1: Create `data/scramble.js`**

The cue lives ON the screen: the boss-door preview shows three glyph slots; exactly 3 inventory items carry those glyphs. Clutter items are visually busy but glyph-less or wrong-glyph. **Solvable entirely from this screen (spec hard rule).**

```js
/**
 * The Scramble — messy inventory + boss-door preview (spec §2c).
 * doorGlyphs are SHOWN on the Scramble screen itself; the cued items carry them.
 * Never depends on earlier-run memory.
 */
const SPA_SCRAMBLE = {
  timeLimitSec: 30,
  doorGlyphs: ['🔺', '🌀', '🔋'],
  items: [
    { id: 'prism',    label: 'Cracked prism',    glyph: '🔺', cued: true },
    { id: 'coil',     label: 'Humming coil',     glyph: '🌀', cued: true },
    { id: 'cell',     label: 'Glowing cell',     glyph: '🔋', cued: true },
    { id: 'rope',     label: 'Frayed rope',      glyph: null, cued: false },
    { id: 'skull',    label: 'Neon skull',       glyph: '💀', cued: false },
    { id: 'boot',     label: 'Heavy boot',       glyph: null, cued: false },
    { id: 'radio',    label: 'Dead radio',       glyph: '📻', cued: false },
    { id: 'mirror',   label: 'Foggy mirror',     glyph: null, cued: false },
    { id: 'battery',  label: 'Leaky battery',    glyph: '🪫', cued: false },
    { id: 'ticket',   label: 'Golden ticket',    glyph: '🎫', cued: false }
  ]
};

if (typeof module !== 'undefined' && module.exports) { module.exports = SPA_SCRAMBLE; }
else { window.SPA_SCRAMBLE = SPA_SCRAMBLE; }
```

- [ ] **Step 2: Write the failing tests**

Create `tests/scramble.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert');
const { Scramble } = require('../js/chambers/Scramble.js');
const DATA = require('../data/scramble.js');
const SignalTracker = require('../js/core/SignalTracker.js');

test('cue is self-contained: every cued item glyph appears in doorGlyphs on the same screen payload', () => {
  const cued = DATA.items.filter(i => i.cued);
  assert.equal(cued.length, 3);
  for (const item of cued) assert.ok(DATA.doorGlyphs.includes(item.glyph), `cued item ${item.id} glyph missing from door preview`);
});

test('records picks, matches, latency, and changes', () => {
  const t = new SignalTracker({}); t.startRun('med');
  const s = new Scramble({ tracker: t, data: DATA, now: () => 1000 });
  s.begin();
  s._now = () => 5000;
  s.togglePick('prism'); s.togglePick('rope'); s.togglePick('rope'); s.togglePick('coil'); s.togglePick('cell');
  const res = s.confirm();
  assert.deepEqual(res.picks.sort(), ['cell', 'coil', 'prism']);
  assert.equal(res.matches, 3);
  assert.equal(res.latencyMs, 4000);
  assert.equal(res.changes, 1); // rope picked then unpicked
  const ev = t.events.find(e => e.type === 'scramble_result');
  assert.equal(ev.detail.matches, 3);
});

test('timeout auto-confirms whatever is picked (run always continues)', () => {
  const t = new SignalTracker({}); t.startRun('med');
  const s = new Scramble({ tracker: t, data: DATA, now: () => 0 });
  s.begin();
  s.togglePick('skull');
  const res = s.timeout();
  assert.equal(res.timedOut, true);
  assert.equal(res.picks.length, 1);
  assert.ok(t.events.some(e => e.type === 'scramble_result' && e.detail.timedOut));
});

test('cannot pick more than 3 at once', () => {
  const t = new SignalTracker({}); t.startRun('med');
  const s = new Scramble({ tracker: t, data: DATA, now: () => 0 });
  s.begin();
  ['prism', 'coil', 'cell'].forEach(id => s.togglePick(id));
  const r = s.togglePick('rope');
  assert.equal(r.rejected, true);
  assert.equal(s.picks.size, 3);
});
```

- [ ] **Step 3: Run to verify fail**, then **Step 4: Implement `js/chambers/Scramble.js`**

```js
/** The Scramble — chaos-to-plan gate logic (spec §2c). Any picks continue the run. */
class Scramble {
  constructor({ tracker, data, now }) {
    this.tracker = tracker;
    this.data = data;
    this._now = now || (() => Date.now());
    this.picks = new Set();
    this.changes = 0;
    this.startMs = null;
    this.firstCommitMs = null;
    this.doneRes = null;
  }

  begin() { this.startMs = this._now(); }

  togglePick(id) {
    if (this.picks.has(id)) { this.picks.delete(id); this.changes++; return { picked: false }; }
    if (this.picks.size >= 3) return { rejected: true };
    this.picks.add(id);
    if (this.firstCommitMs === null) this.firstCommitMs = this._now();
    return { picked: true };
  }

  _result(timedOut) {
    const picks = [...this.picks];
    const cuedSet = this.data.items.filter(i => i.cued).map(i => i.id);
    const matches = picks.filter(p => cuedSet.includes(p)).length;
    const latencyMs = (this.firstCommitMs ?? this._now()) - this.startMs;
    const res = { picks, cuedSet, matches, latencyMs, changes: this.changes, timedOut };
    this.tracker.record('scramble_result', res);
    this.doneRes = res;
    return res;
  }

  confirm() { return this.doneRes || this._result(false); }
  timeout() { return this.doneRes || this._result(true); }
}

if (typeof module !== 'undefined' && module.exports) { module.exports = { Scramble }; }
else { window.Scramble = Scramble; }
```

- [ ] **Step 5: Run to verify pass** — `node --test tests/scramble.test.js`, then `npm test`.

- [ ] **Step 6: Implement adapter `js/games/scramble.js`**

Pattern-match the other adapters: icon `🎒`, `durationSec: null` (it renders its own 30s countdown from `DATA.timeLimitSec`). Render: door preview strip (the 3 `doorGlyphs`, large) + shuffled item grid (buttons with `label` + `glyph` where present, deliberately cluttered CSS) + confirm button enabled at 3 picks. Timer expiry → `logic.timeout()` → `ctx.complete()`. Confirm → `logic.confirm()` → `ctx.complete()`. Shuffle display order at mount so item position isn't memorisable — the logic object receives the canonical data regardless.

- [ ] **Step 7: Commit**

```bash
git add data/scramble.js js/chambers/Scramble.js js/games/scramble.js tests/scramble.test.js
git commit -m "feat: The Scramble chaos-to-plan gate (self-contained cue, 30s, any-picks-continue)"
```

---

### Task 6: Flow integration — app.js, index.html, save/resume, repair window

**Files:**
- Modify: `app.js`, `index.html`
- Test: `tests/e2e.test.js` (extend — flow-level assertions that don't need DOM, see Step 5)

**Interfaces:**
- Consumes: everything Tasks 2–5 produced. Exact run order (spec §3): chambers `['pattern-blitz','color-cascade','number-rush','word-vault']` → Lost Score scene → Scramble → `'vault-door'` boss → reveal → share.
- Produces: `SPA.CHAMBERS = ['pattern-blitz','color-cascade','number-rush','word-vault','scramble','vault-door']` with the Lost Score scene injected between `word-vault` and `scramble`; save-and-resume; `finished_after_resume` recorded at reveal.

- [ ] **Step 1: index.html changes**

1. Add script tags (order matters — after existing core, before `app.js`): `js/core/RunStateStore.js`, `js/core/LostScore.js`, `data/wordVault.js`, `data/scramble.js`, `js/chambers/WordVault.js`, `js/chambers/Scramble.js`, `js/games/wordVault.js`, `js/games/scramble.js`.
2. Add two screens before `screen-reveal`:

```html
<section id="screen-resume" class="screen hidden">
  <h2>🗝️ The vault remembers you.</h2>
  <p id="resume-detail">Your run is saved exactly where you left it.</p>
  <button id="btn-resume" class="btn btn-primary">Continue my run</button>
  <button id="btn-start-fresh" class="btn btn-secondary">Start fresh</button>
</section>
<section id="screen-lost-score" class="screen hidden">
  <h2>⚠️ Score glitch</h2>
  <p id="lost-score-prompt"></p>
  <input id="lost-score-input" type="number" min="0" max="99" />
  <button id="btn-lost-score-send" class="btn btn-primary">That's my score</button>
</section>
```

(The repair offer reuses `screen-fork` — it's a two-option scene, exactly what that screen renders.)

- [ ] **Step 2: app.js — run order + Lost Score scene + repair window**

1. `SPA.CHAMBERS = ['pattern-blitz', 'color-cascade', 'number-rush', 'word-vault', 'scramble', 'vault-door'];`
2. In `newRunState()` add `store: new RunStateStore({ storage: window.localStorage })`, `lostScore: null`, `resumed: false`.
3. In `afterChamber(index)`: when the finished chamber is `'word-vault'` (index 3), show the Lost Score scene before continuing:

```js
function afterChamber(index) {
  SPA.state.forkFlow.queueForChamber(index + 1);
  if (SPA.CHAMBERS[index] === 'word-vault') return showLostScore(index);
  nextForkOrChamber(index);
}

function showLostScore(index) {
  SPA.state.lostScore = new LostScore({ tracker: SPA.state.tracker });
  const best = SPA.state.lostScore.best;
  SPA.showScreen('screen-lost-score');
  const gameNames = { 'pattern-blitz': 'Pattern Blitz', 'color-cascade': 'Color Cascade', 'number-rush': 'Number Rush', 'word-vault': 'the Word Vault' };
  $('lost-score-prompt').textContent =
    `The vault just corrupted one record — your best chamber, ${gameNames[best.game]}. How many did you get right in there? (Your word is the record now.)`;
  $('btn-lost-score-send').onclick = () => {
    const reported = parseInt($('lost-score-input').value, 10);
    if (Number.isNaN(reported)) return;
    const res = SPA.state.lostScore.report(reported);
    if (res.needsRepair) queueRepairScene();
    nextForkOrChamber(index);
  };
}

function queueRepairScene() {
  // Repair window (spec hard rule): unshift onto the fork queue so it fires at the
  // very next scene transition — always before the Scramble chamber starts.
  SPA.state.forkFlow.queue.unshift({
    id: 'lost-score-repair',
    prompt: 'The Keeper found a dusty backup of that record… want to double-check what you reported?',
    options: [
      { id: 'check', label: '📼 Check the backup', signal: '__repair_yes' },
      { id: 'leave', label: '🚶 Leave it as reported', signal: '__repair_no' }
    ]
  });
}
```

4. In `showFork`'s click handler, intercept the repair signals before the normal tracker record:

```js
if (res.signal === '__repair_yes' || res.signal === '__repair_no') {
  SPA.state.lostScore.repair(res.signal === '__repair_yes');
  return nextForkOrChamber(chamberIndex);
}
```

5. **Save/resume:** add `persistRun(index)` called at every scene boundary (`afterChamber`, after every fork choice, after Lost Score report):

```js
function persistRun(index) {
  SPA.state.store.save({
    chamberIndex: index,
    coins: SPA.state.coins,
    streak: SPA.state.streak,
    sceneQueue: SPA.state.forkFlow.queue.map(f => f.id),
    trackerJson: SPA.state.tracker.toJSON(),
    lostScorePending: !!SPA.state.lostScore?.pendingRepair,
    resumed: SPA.state.resumed
  });
}
```

On `DOMContentLoaded`, before showing the landing screen: if `new RunStateStore({storage: localStorage}).load()` returns a run, show `screen-resume` instead. "Continue" → rebuild state (`newRunState()`, `tracker.restore(saved.trackerJson)`, restore coins/streak, `store.markResumed()` → `tracker.record('run_resumed', { resumeGapMs })`, set `SPA.state.resumed = true`, re-queue forks whose ids are in `sceneQueue`, re-queue the repair scene if `lostScorePending`, then `runChamber(saved.chamberIndex)`). "Start fresh" → `store.clear()` → landing.
6. In `reveal()`: `if (SPA.state.resumed) SPA.state.tracker.record('finished_after_resume', {});` and `SPA.state.store.clear()`.
7. In `thanks()`: also `localStorage.removeItem('spa_saved_run')` (belt and braces with `reveal`'s clear).

- [ ] **Step 3: Word Vault feeds Lost Score** — no extra work: `LostScore.computeBest` reads `game_response` events which the WordVault logic already records (Task 3). Verify by reading, don't code.

- [ ] **Step 4: Manual smoke** — `npx serve .` (or any static server), play a full run in the browser: 4 chambers → lost score → (inflate → repair fork appears before Scramble) → scramble → boss → reveal. Reload mid-run → resume screen appears → continue works.

- [ ] **Step 5: Flow-level regression tests**

Append to `tests/e2e.test.js` (match its existing style — it tests logic modules without DOM):

```js
test('repair scene is queued ahead of any pending forks (fires within the window)', () => {
  const ForkFlow = require('../js/core/ForkFlow.js');
  const ff = new ForkFlow([{ id: 'later-fork', chamberAfter: 5, prompt: '', options: [] }]);
  ff.queueForChamber(5);
  ff.queue.unshift({ id: 'lost-score-repair', prompt: '', options: [] });
  assert.equal(ff.next().id, 'lost-score-repair');
});

test('resume gap and finished_after_resume are separate tracker events', () => {
  const SignalTracker = require('../js/core/SignalTracker.js');
  const t = new SignalTracker({});
  t.startRun('med');
  t.record('run_resumed', { resumeGapMs: 93600000 });
  t.record('finished_after_resume', {});
  assert.equal(t.count('run_resumed'), 1);
  assert.equal(t.count('finished_after_resume'), 1);
});
```

- [ ] **Step 6: Run full suite** — `npm test` → all green.

- [ ] **Step 7: Commit**

```bash
git add app.js index.html tests/e2e.test.js
git commit -m "feat: v2 run flow — 6-chamber order, Lost Score scene + repair window, save-and-resume"
```

---

### Task 7: profileMapper evidence + descriptive-language guard

**Files:**
- Modify: `js/core/profileMapper.js`
- Test: `tests/profile_mapper.test.js` (extend)

**Interfaces:**
- Consumes: the new tracker event types from Tasks 3–6.
- Produces: new evidence strings (descriptive only) in `mapProfile(...).evidence`; **no scoring changes** to the 4 archetype scores in v2 (the new signals are evidence for Lyndz, not archetype inputs — keeping v1 scoring untouched preserves comparability with v1 runs).

- [ ] **Step 1: Write the failing tests**

Append to `tests/profile_mapper.test.js`:

```js
test('v2 signals produce descriptive evidence strings', () => {
  const events = [
    { type: 'verbal_mode_choice', detail: { mode: 'symbol' }, at: 1 },
    { type: 'game_response', detail: { game: 'word-vault', mode: 'symbol', correct: true, timeMs: 900, round: 1, level: 1 }, at: 2 },
    { type: 'self_report_delta', detail: { game: 'pattern-blitz', reported: 12, trueCount: 8, delta: 0.5 }, at: 3 },
    { type: 'repair_after_inflate', detail: { tookIt: true }, at: 4 },
    { type: 'scramble_result', detail: { picks: ['prism','coil','cell'], cuedSet: ['prism','coil','cell'], matches: 3, latencyMs: 12000, changes: 1, timedOut: false }, at: 5 },
    { type: 'run_resumed', detail: { resumeGapMs: 93600000 }, at: 6 },
    { type: 'finished_after_resume', detail: {}, at: 7 }
  ];
  const profile = mapProfile({ meta: {}, events });
  const all = profile.evidence.join(' | ');
  assert.ok(all.includes('Symbol mode'));
  assert.ok(all.includes('reported 12') && all.includes('8'));
  assert.ok(all.includes('backup'));           // repair fact
  assert.ok(all.includes('3 of 3'));           // scramble fact
  assert.ok(all.includes('26h'));              // resume gap fact
  assert.ok(all.includes('finished'));          // finished-after-resume fact
});

test('evidence never contains interpretive judgment words', () => {
  const banned = ['dishonest', 'liar', 'lied', 'cheat', 'untrustworthy', 'lazy', 'bad'];
  const events = [
    { type: 'self_report_delta', detail: { game: 'pattern-blitz', reported: 20, trueCount: 8, delta: 1.5 }, at: 1 },
    { type: 'repair_after_inflate', detail: { tookIt: false }, at: 2 }
  ];
  const profile = mapProfile({ meta: {}, events });
  const all = profile.evidence.join(' ').toLowerCase();
  for (const word of banned) assert.ok(!all.includes(word), `evidence contains banned interpretive word: ${word}`);
});
```

- [ ] **Step 2: Run to verify fail**, then **Step 3: Implement in `js/core/profileMapper.js`**

Add to `buildEvidence(events, s)`, before the return:

```js
  for (const e of events) {
    if (e.type === 'verbal_mode_choice')
      notes.push(e.detail.mode === 'symbol' ? 'Chose Symbol mode for the Word Vault' : 'Chose Word mode for the Word Vault');
    if (e.type === 'self_report_delta') {
      const d = e.detail;
      notes.push(d.reported === d.trueCount
        ? `Reported the lost score exactly right (${d.trueCount})`
        : `Reported ${d.reported} when the true count was ${d.trueCount}`);
    }
    if (e.type === 'repair_after_inflate')
      notes.push(e.detail.tookIt ? 'Checked the backup and set the record straight' : 'Left the report as it was when offered the backup');
    if (e.type === 'scramble_result') {
      const d = e.detail;
      notes.push(`Scramble: matched ${d.matches} of 3 cued items in ${Math.round(d.latencyMs / 1000)}s (${d.changes} changes${d.timedOut ? ', ran the clock out' : ''})`);
    }
    if (e.type === 'run_resumed')
      notes.push(`Stepped away mid-run and came back after ${Math.round(e.detail.resumeGapMs / 3600000)}h`);
    if (e.type === 'finished_after_resume')
      notes.push('Resumed the run and finished it');
  }
```

Also add word-vault accuracy: in `buildEvidence`, using the existing `perGame` stats: `const wv = s.perGame['word-vault']; if (wv) notes.push(\`Word Vault: ${wv.correct}/${wv.total}\`);`

Fix the test expectation for "3 of 3" by making the scramble note read `matched 3 of 3 cued items` (as coded above).

- [ ] **Step 4: Run to verify pass** — `node --test tests/profile_mapper.test.js`, then `npm test`.

- [ ] **Step 5: Dashboard check (verify, likely no code):** `admin/dashboard.js` renders the `evidence` array as bullets already — confirm by reading `_renderRun`/equivalent. New facts flow through automatically. Only change if evidence rendering truncates.

- [ ] **Step 6: Commit**

```bash
git add js/core/profileMapper.js tests/profile_mapper.test.js
git commit -m "feat: descriptive evidence for v2 signals + banned-judgment-words guard test"
```

---

### Task 8: Privacy regression, README, DoD run

**Files:**
- Modify: `README.md`, `tests/e2e.test.js`

**Interfaces:**
- Consumes: everything.

- [ ] **Step 1: Privacy regression test**

Append to `tests/e2e.test.js`:

```js
test('no new module talks to the network — api.js stays the only fetch site', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const offenders = [];
  const scan = (dir) => {
    for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, f.name);
      if (f.isDirectory()) scan(p);
      else if (f.name.endsWith('.js') && !p.includes('api.js')) {
        const src = fs.readFileSync(p, 'utf8');
        if (/\bfetch\s*\(/.test(src) || /XMLHttpRequest/.test(src)) offenders.push(p);
      }
    }
  };
  scan(path.join(__dirname, '..', 'js'));
  scan(path.join(__dirname, '..', 'data'));
  assert.deepEqual(offenders, [], `network calls outside api.js: ${offenders.join(', ')}`);
});
```

- [ ] **Step 2: Run** — `npm test` → all green (fix any offender it catches).

- [ ] **Step 3: README** — add a "v2 — The Deep Vault Update" section: the three new moments (one line each), save-and-resume behaviour, the schema drift fix note ("re-run supabase/schema.sql — the RPC and shared_runs columns changed"), and the unchanged privacy promise.

- [ ] **Step 4: Definition-of-done run (spec §7)** — in a browser against the local static server:
1. Run A: word mode, report Lost Score honestly, finish, share → dashboard shows all new evidence rows.
2. Run B: symbol mode, inflate the Lost Score, take the repair, quit mid-run, reopen → resume screen → finish → share → dashboard shows "reported X when true count was Y", "Checked the backup…", "came back after…", "Resumed the run and finished it".
3. Run C: play, never tap share → `select count(*) from shared_runs` unchanged.
4. `npm test` → all green.

- [ ] **Step 5: Final commit + push**

```bash
git add README.md tests/e2e.test.js
git commit -m "docs: v2 README + network-isolation regression test — Deep Vault is done"
git push origin feat/deep-vault-v2
```

---

## Self-Review (completed)

- **Spec coverage:** §2a dual-mode + mode-as-signal + within-mode comparison → Task 3; §2b ±10% band, no reward difference, deterministic repair ≤ Scramble entry → Tasks 4 & 6 (queue-unshift makes it the literal next scene); §2c self-contained clueing hard rule → Task 5 (test asserts cue lives in the screen's own data payload); §3 run order + save/resume + resume_gap/finished_after_resume split → Tasks 2 & 6; §4 evidence descriptive-never-interpretive + no-solo-verdict → Task 7 (banned-words test); §4 schema note → satisfied via the `signals` jsonb (new events ride inside it; v1 rows stay valid) — **deliberate deviation from the spec's "additive columns" wording, same intent (additive, backward-compatible), zero migration risk; flagged here for the reviewer**; §6 test list → Tasks 1–8; §7 DoD → Task 8. Task 1 (schema drift) is outside the v2 spec but load-bearing: v1's share/quest flows are broken without it and v2 ships over the same pipe.
- **Placeholder scan:** none — every code step has complete code; adapter steps (3.6, 5.6) reference the exact existing adapter file to pattern-match, with behaviour fully specified.
- **Type consistency:** `RunStateStore.save/load/clear/markResumed` match between Tasks 2 and 6; `LostScore.report → {delta, honest, needsRepair}` + `pendingRepair` match Tasks 4 and 6; tracker event names (`verbal_mode_choice`, `self_report_delta`, `repair_after_inflate`, `scramble_result`, `run_resumed`, `finished_after_resume`) are identical across Tasks 3–7; `SPA.games` ids (`word-vault`, `scramble`) match `SPA.CHAMBERS` in Task 6.
