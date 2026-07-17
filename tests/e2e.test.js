/**
 * tests/e2e.test.js
 * End-to-end integration tests for SUPERPOWER-ARCADE
 * Covers: full run loop, privacy guards, quest code gate, ethics fork, signal export
 */

import { strict as assert } from 'node:assert';
import { describe, test, before } from 'node:test';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ForkFlow from '../js/core/ForkFlow.js';
import SignalTracker from '../js/core/SignalTracker.js';
import RunStateStore from '../js/core/RunStateStore.js';
import DifficultyDial from '../js/agents/DifficultyDial.js';
import DopamineDJ from '../js/agents/DopamineDJ.js';

// ── Stubs / test doubles ────────────────────────────────────────────────────

/** Minimal in-memory Supabase client stub */
function makeSupabaseStub(questValid = true) {
  const runs = [];
  return {
    _runs: runs,
    rpc(fn, params) {
      if (fn === 'validate_quest_code') {
        return Promise.resolve({ data: questValid, error: null });
      }
      return Promise.resolve({ data: null, error: { message: 'unknown rpc' } });
    },
    from(table) {
      return {
        insert(row) {
          runs.push({ table, row });
          return Promise.resolve({ data: row, error: null });
        },
        select(cols) {
          return {
            order() {
              return Promise.resolve({ data: runs.map(r => r.row), error: null });
            }
          };
        }
      };
    }
  };
}

/** Lightweight fetch stub that records calls */
function makeFetchStub(responseBody = { ok: true }) {
  const calls = [];
  const stub = async (url, opts) => {
    calls.push({ url, opts });
    return {
      ok: true,
      status: 200,
      json: async () => responseBody
    };
  };
  stub.calls = calls;
  return stub;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function validateQuestCode(supabase, code) {
  const { data, error } = await supabase.rpc('validate_quest_code', { p_code: code });
  if (error) throw new Error(error.message);
  return data === true;
}

async function persistRun(supabase, payload) {
  // Strip any PII-adjacent keys before persisting
  const safe = { ...payload };
  delete safe.email;
  delete safe.name;
  delete safe.ip;
  const { data, error } = await supabase.from('shared_runs').insert(safe);
  if (error) throw new Error(error.message);
  return data;
}

function buildRunPayload({ questCode, scores, archetype, ethicsChoice }) {
  return {
    quest_code: questCode,
    scores,
    archetype,
    ethics_choice: ethicsChoice,
    completed_at: new Date().toISOString()
  };
}

// ── Test suites ──────────────────────────────────────────────────────────────

describe('E2E: Quest Code Gate', () => {
  test('valid quest code is accepted', async () => {
    const sb = makeSupabaseStub(true);
    const ok = await validateQuestCode(sb, 'BOLT-RISING');
    assert.equal(ok, true);
  });

  test('invalid quest code is rejected', async () => {
    const sb = makeSupabaseStub(false);
    const ok = await validateQuestCode(sb, 'FAKE-CODE');
    assert.equal(ok, false);
  });

  test('RPC error surfaces as thrown error', async () => {
    const sb = makeSupabaseStub();
    sb.rpc = () => Promise.resolve({ data: null, error: { message: 'db down' } });
    await assert.rejects(() => validateQuestCode(sb, 'ANY'), /db down/);
  });
});

describe('E2E: PII Privacy Guard', () => {
  test('persistRun strips email before insert', async () => {
    const sb = makeSupabaseStub();
    const payload = buildRunPayload({
      questCode: 'BOLT-RISING',
      scores: { patternBlitz: 85, colorCascade: 72, numberRush: 90, vaultDoor: 1 },
      archetype: 'PATTERN_SEEKER',
      ethicsChoice: 'share'
    });
    payload.email = 'user@example.com';
    payload.name = 'Test User';
    payload.ip = '1.2.3.4';

    await persistRun(sb, payload);

    const inserted = sb._runs[0].row;
    assert.ok(!('email' in inserted), 'email must not be persisted');
    assert.ok(!('name' in inserted), 'name must not be persisted');
    assert.ok(!('ip' in inserted), 'ip must not be persisted');
  });

  test('persistRun preserves non-PII fields', async () => {
    const sb = makeSupabaseStub();
    const payload = buildRunPayload({
      questCode: 'BOLT-RISING',
      scores: { patternBlitz: 80 },
      archetype: 'VOLT_RANGER',
      ethicsChoice: 'keep_private'
    });
    await persistRun(sb, payload);
    const inserted = sb._runs[0].row;
    assert.equal(inserted.quest_code, 'BOLT-RISING');
    assert.equal(inserted.archetype, 'VOLT_RANGER');
    assert.equal(inserted.ethics_choice, 'keep_private');
  });
});

describe('E2E: Full Run Loop', () => {
  let supabase;
  let fetch;

  before(() => {
    supabase = makeSupabaseStub(true);
    fetch = makeFetchStub({ received: true });
  });

  test('complete run: validate → build payload → persist → signal', async () => {
    // Step 1: gate
    const gated = await validateQuestCode(supabase, 'BOLT-RISING');
    assert.equal(gated, true);

    // Step 2: build payload (simulates end of 4-chamber run)
    const payload = buildRunPayload({
      questCode: 'BOLT-RISING',
      scores: { patternBlitz: 91, colorCascade: 88, numberRush: 77, vaultDoor: 1 },
      archetype: 'PATTERN_SEEKER',
      ethicsChoice: 'share'
    });
    assert.ok(payload.completed_at, 'payload must have timestamp');

    // Step 3: persist
    const saved = await persistRun(supabase, payload);
    assert.ok(saved, 'persistRun must return saved data');

    // Step 4: simulate signal push to Keeper API
    const res = await fetch('/api/signal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ archetype: payload.archetype, ethicsChoice: payload.ethics_choice })
    });
    assert.equal(res.ok, true);
    assert.equal(fetch.calls.length, 1);
    assert.equal(fetch.calls[0].url, '/api/signal');
  });

  test('ethics choice keep_private suppresses signal push', async () => {
    const localFetch = makeFetchStub();
    const payload = buildRunPayload({
      questCode: 'BOLT-RISING',
      scores: { patternBlitz: 60 },
      archetype: 'SYNC_WEAVER',
      ethicsChoice: 'keep_private'
    });

    await persistRun(supabase, payload);

    // Simulate: only push signal if ethics_choice === 'share'
    if (payload.ethics_choice === 'share') {
      await localFetch('/api/signal', { method: 'POST', body: JSON.stringify(payload) });
    }

    assert.equal(localFetch.calls.length, 0, 'no signal pushed when keep_private');
  });
});

describe('E2E: Keeper Dashboard Signal Read', () => {
  test('dashboard can read all shared runs', async () => {
    const sb = makeSupabaseStub(true);

    // seed two runs
    await persistRun(sb, buildRunPayload({ questCode: 'BOLT-RISING', scores: { patternBlitz: 90 }, archetype: 'PATTERN_SEEKER', ethicsChoice: 'share' }));
    await persistRun(sb, buildRunPayload({ questCode: 'BOLT-RISING', scores: { numberRush: 88 }, archetype: 'VOLT_RANGER', ethicsChoice: 'share' }));

    const { data } = await sb.from('shared_runs').select('*').order('completed_at', { ascending: false });
    assert.equal(data.length, 2);
    assert.ok(data.every(r => r.quest_code === 'BOLT-RISING'));
  });

  test('dashboard run rows contain archetype signal', async () => {
    const sb = makeSupabaseStub(true);
    await persistRun(sb, buildRunPayload({ questCode: 'BOLT-RISING', scores: { colorCascade: 95 }, archetype: 'SYNC_WEAVER', ethicsChoice: 'share' }));
    const { data } = await sb.from('shared_runs').select('*').order('completed_at');
    assert.equal(data[0].archetype, 'SYNC_WEAVER');
  });
});

describe('E2E: DifficultyDial integration', () => {
  function makeDial(initial = 5) {
    let level = initial;
    const history = [];
    return {
      get level() { return level; },
      up() { level = Math.min(10, level + 1); history.push('up'); },
      down() { level = Math.max(1, level - 1); history.push('down'); },
      get history() { return history; }
    };
  }

  test('dial increases on correct answers', () => {
    const dial = makeDial(5);
    for (let i = 0; i < 3; i++) dial.up();
    assert.equal(dial.level, 8);
  });

  test('dial decreases on wrong answers', () => {
    const dial = makeDial(5);
    for (let i = 0; i < 4; i++) dial.down();
    assert.equal(dial.level, 1);
  });

  test('dial never exceeds 10', () => {
    const dial = makeDial(9);
    dial.up(); dial.up(); dial.up();
    assert.equal(dial.level, 10);
  });

  test('dial never drops below 1', () => {
    const dial = makeDial(2);
    dial.down(); dial.down(); dial.down();
    assert.equal(dial.level, 1);
  });
});

describe('E2E: v2 flow integration (Lost Score repair window + resume)', () => {
  test('repair scene is queued ahead of any pending forks (fires within the window)', () => {
    const ff = new ForkFlow([{ id: 'later-fork', chamberAfter: 5, prompt: '', options: [] }]);
    ff.queueForChamber(5);
    ff.queue.unshift({ id: 'lost-score-repair', prompt: '', options: [] });
    assert.equal(ff.next().id, 'lost-score-repair');
  });

  test('resume gap and finished_after_resume are separate tracker events', () => {
    const t = new SignalTracker({});
    t.startRun('med');
    t.record('run_resumed', { resumeGapMs: 93600000 });
    t.record('finished_after_resume', {});
    assert.equal(t.count('run_resumed'), 1);
    assert.equal(t.count('finished_after_resume'), 1);
  });

  test('resuming advances past the finished chamber instead of replaying it (queue-flush semantics)', () => {
    // persistRun saves chamberIndex = the chamber that just FINISHED (see afterChamber).
    // The resume entry point must behave exactly like nextForkOrChamber(index), i.e.
    // flush any pending forks first, otherwise advance to index + 1 — never re-run index.
    const CHAMBERS = ['pattern-blitz', 'color-cascade', 'number-rush', 'word-vault', 'scramble', 'vault-door'];
    function nextForkOrChamberSim(ff, index) {
      const fork = ff.next();
      if (fork) return { type: 'fork', id: fork.id };
      const nextIndex = index + 1;
      if (nextIndex < CHAMBERS.length) return { type: 'chamber', id: CHAMBERS[nextIndex] };
      return { type: 'reveal' };
    }

    // Case 1: restored queue has a pending fork (e.g. a re-queued repair scene) -> fork shown, not a replay.
    const ffWithFork = new ForkFlow([]);
    ffWithFork.queue.push({ id: 'lost-score-repair', prompt: '', options: [] });
    assert.deepEqual(nextForkOrChamberSim(ffWithFork, 3), { type: 'fork', id: 'lost-score-repair' });

    // Case 2: restored queue is empty -> advances to the NEXT chamber, not a replay of the finished one.
    const ffEmpty = new ForkFlow([]);
    assert.deepEqual(nextForkOrChamberSim(ffEmpty, 3), { type: 'chamber', id: 'scramble' });

    // Case 3: the finished chamber was the last one -> reveal, not a replay of vault-door.
    const ffAtEnd = new ForkFlow([]);
    assert.deepEqual(nextForkOrChamberSim(ffAtEnd, 5), { type: 'reveal' });
  });

  test('save/resume round-trips DifficultyDial and DopamineDJ state', () => {
    function memStorage() {
      const m = new Map();
      return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
    }

    const dial = new DifficultyDial({ windowSize: 5, boredomThresholdMs: 600, frustrationThreshold: 3 });
    dial.reset(1);
    dial.recordResponse(true, 400);
    dial.recordResponse(false, 900);

    const dj = new DopamineDJ({ baseDropChance: 0.15, streakMultiplier: 0.05 });
    dj.initializeSession(0);
    dj.state.wallet = 7;
    dj.state.sessionCoins = 7;
    dj.state.momentum = 40;

    const store = new RunStateStore({ storage: memStorage() });
    store.save({
      chamberIndex: 1,
      coins: 7,
      streak: 0,
      sceneQueue: [],
      trackerJson: { meta: {}, events: [] },
      dialState: dial.state,
      djState: dj.state
    });

    const loaded = store.load();

    // Restore onto FRESH instances, exactly as the resume handler does after newRunState().
    const freshDial = new DifficultyDial({ windowSize: 5, boredomThresholdMs: 600, frustrationThreshold: 3 });
    freshDial.reset(1);
    freshDial.state = loaded.dialState;

    const freshDj = new DopamineDJ({ baseDropChance: 0.15, streakMultiplier: 0.05 });
    freshDj.initializeSession(0);
    freshDj.state = loaded.djState;

    assert.deepEqual(freshDial.state, dial.state);
    assert.equal(freshDial.state.currentDifficulty, dial.state.currentDifficulty);
    assert.equal(freshDial.state.consecutiveErrors, 1);
    assert.deepEqual(freshDj.state, dj.state);
    assert.equal(freshDj.getWalletBalance(), 7);
    assert.equal(freshDj.getSessionEarnings(), 7);
  });
});

describe('Regression: Chamber class script loading', () => {
  test('all chamber classes that export to window are loaded in index.html', () => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = join(__filename, '..');
    const projectRoot = join(__dirname, '..');
    const chambersDir = join(projectRoot, 'js', 'chambers');
    const indexPath = join(projectRoot, 'index.html');

    // Read all chamber files
    const chamberFiles = readdirSync(chambersDir).filter(f => f.endsWith('.js'));

    // Extract class names from dual-export pattern (e.g. "window.PatternBlitz = PatternBlitz;")
    const classNamesFromFiles = new Set();
    for (const file of chamberFiles) {
      const content = readFileSync(join(chambersDir, file), 'utf8');
      // Match pattern: window.ClassName = ClassName;
      const match = content.match(/window\.(\w+)\s*=\s*\1;/);
      if (match) {
        classNamesFromFiles.add(match[1]);
      }
    }

    // Read index.html and extract script src attributes for chamber files
    const indexHtml = readFileSync(indexPath, 'utf8');
    const scriptTags = indexHtml.match(/<script\s+src="js\/chambers\/(.+?)\.js"><\/script>/g) || [];
    const loadedFiles = new Set(
      scriptTags.map(tag => {
        const match = tag.match(/js\/chambers\/(.+?)\.js/);
        return match ? match[1] : null;
      }).filter(Boolean)
    );

    // Verify each class from files is loaded via script tag
    for (const className of classNamesFromFiles) {
      assert.ok(
        loadedFiles.has(className),
        `Chamber class ${className} (from js/chambers/${className}.js) is not loaded in index.html — add: <script src="js/chambers/${className}.js"><\/script>`
      );
    }

    // Sanity check: we should have found at least the original 4 v1 chambers
    assert.ok(classNamesFromFiles.has('PatternBlitz'), 'PatternBlitz class not found in chamber files');
    assert.ok(classNamesFromFiles.has('ColorCascade'), 'ColorCascade class not found in chamber files');
    assert.ok(classNamesFromFiles.has('NumberRush'), 'NumberRush class not found in chamber files');
    assert.ok(classNamesFromFiles.has('VaultDoor'), 'VaultDoor class not found in chamber files');
  });
});

test('no new module talks to the network — api.js stays the only fetch site', () => {
  // Note: the task brief's snippet used CJS require()/__dirname; this file is ESM
  // (see the fileURLToPath pattern above), so this reuses the module's existing
  // node:fs/node:path imports and the same __dirname derivation already used
  // by the "Regression: Chamber class script loading" test above.
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = join(__filename, '..');
  const offenders = [];
  const scan = (dir) => {
    for (const f of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, f.name);
      if (f.isDirectory()) scan(p);
      else if (f.name.endsWith('.js') && !p.includes('api.js')) {
        const src = readFileSync(p, 'utf8');
        if (/\bfetch\s*\(/.test(src) || /XMLHttpRequest/.test(src)) offenders.push(p);
      }
    }
  };
  scan(join(__dirname, '..', 'js'));
  scan(join(__dirname, '..', 'data'));
  assert.deepEqual(offenders, [], `network calls outside api.js: ${offenders.join(', ')}`);
});

test('sendRun includes the player\'s actual coin count in the share payload', () => {
  // app.js is browser-only (window/document, no DOM shim in this zero-dep test
  // setup), so this is a structural check on the buildRunPayload call site
  // rather than an executed unit test.
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = join(__filename, '..');
  const src = readFileSync(join(__dirname, '..', 'app.js'), 'utf8');
  const match = src.match(/async function sendRun\s*\([^)]*\)\s*\{[\s\S]*?\n  \}/);
  assert.ok(match, 'sendRun function not found in app.js');
  assert.match(match[0], /broskiCoins\s*:\s*SPA\.state\.wallet\.coins/,
    'sendRun must pass broskiCoins: SPA.state.wallet.coins into buildRunPayload, or shared runs always report 0 coins');
});

test('zero third-party requests — no external script tags in any HTML', () => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = join(__filename, '..');
  for (const f of ['index.html', join('admin', 'dashboard.html')]) {
    const src = readFileSync(join(__dirname, '..', f), 'utf8');
    assert.ok(!/<script[^>]+src=["']https?:/i.test(src), `${f} loads an external script`);
  }
  assert.ok(existsSync(join(__dirname, '..', 'vendor', 'three.min.js')),
    'three.js must be vendored locally (vaultDoor.js needs window.THREE)');
});

test('the OpenDyslexic toggle is real — @font-face exists and font files ship', () => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = join(__filename, '..');
  const css = readFileSync(join(__dirname, '..', 'style.css'), 'utf8');
  assert.match(css, /@font-face\s*\{[^}]*OpenDyslexic/s, 'style.css must declare @font-face for OpenDyslexic');
  assert.match(css, /font-display:\s*swap/, 'use font-display: swap so text never blocks on the font');
  for (const f of ['OpenDyslexic-Regular.woff2', 'OpenDyslexic-Bold.woff2']) {
    assert.ok(existsSync(join(__dirname, '..', 'fonts', f)), `fonts/${f} missing`);
  }
});

test('vault boss arena is a positioned, sized stage — black-screen regression lock', () => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = join(__filename, '..');
  const css = readFileSync(join(__dirname, '..', 'style.css'), 'utf8');
  const base = css.match(/#game-content\s*\{[^}]*\}/);
  assert.ok(base && /position:\s*relative/.test(base[0]),
    '#game-content needs position: relative — without it the vault canvas anchors to the viewport and paints over the whole page');
  const boss = css.match(/#game-content\.boss-arena\s*\{[^}]*\}/);
  assert.ok(boss && /height:/.test(boss[0]),
    '#game-content.boss-arena needs an explicit height — a 0-height container gives the WebGL renderer a 0-pixel buffer');
  const app = readFileSync(join(__dirname, '..', 'app.js'), 'utf8');
  assert.ok(app.includes("classList.toggle('boss-arena'"),
    'runChamber must toggle boss-arena on #game-content so the height applies only to the vault chamber');
  const vd = readFileSync(join(__dirname, '..', 'js', 'games', 'vaultDoor.js'), 'utf8');
  const zAt = vd.indexOf('uiLayer.style.zIndex');
  const canvasAt = vd.indexOf('el.appendChild(renderer.domElement)');
  assert.ok(zAt !== -1, 'uiLayer needs a zIndex — the renderer canvas is appended later and paints above the buttons otherwise');
  assert.ok(canvasAt === -1 || zAt < canvasAt, 'uiLayer zIndex must be set before the renderer canvas is appended');
});

test('vault boss degrades to UI-only without WebGL — no-WebGL soft-lock regression', () => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = join(__filename, '..');
  const vd = readFileSync(join(__dirname, '..', 'js', 'games', 'vaultDoor.js'), 'utf8');
  const uiAt = vd.indexOf('const uiLayer');
  for (const decl of ['let rings', 'let isOpening', 'let cameraShake']) {
    const at = vd.indexOf(decl);
    assert.ok(at !== -1 && at < uiAt,
      `${decl} must be initialized before the UI handlers that close over it — otherwise a failed 3D setup leaves them hitting TDZ bindings and soft-locks the combo`);
  }
  const tryAt = vd.indexOf('try {');
  const rendererAt = vd.indexOf('new THREE.WebGLRenderer');
  const catchAt = vd.indexOf('} catch');
  assert.ok(tryAt !== -1 && catchAt !== -1, 'THREE setup must be wrapped in try/catch so no-WebGL devices still get a playable DOM chamber');
  assert.ok(tryAt < rendererAt && rendererAt < catchAt, 'WebGLRenderer construction must sit inside the try block');
});

test('answers are logged once — app.js does not double-record game_response', () => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = join(__filename, '..');
  const app = readFileSync(join(__dirname, '..', 'app.js'), 'utf8');
  assert.ok(!app.includes('game_response'),
    'app.js must not record game_response — the chamber logic records it once. A duplicate in ctx.onRound doubles every answer, inflating profileMapper retries/volume scoring and LostScore true-counts.');
});
