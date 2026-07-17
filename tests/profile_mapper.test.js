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

test('avg response time is read from the chamber timeMs key, not only ms', () => {
  const events = [
    { type: 'game_response', detail: { game: 'pattern-blitz', correct: true, timeMs: 800 }, at: 1 },
    { type: 'game_response', detail: { game: 'pattern-blitz', correct: true, timeMs: 1000 }, at: 2 }
  ];
  const p = mapProfile(run(events));
  const line = p.evidence.find((n) => /avg response/.test(n));
  assert.ok(line && /avg response 900ms/.test(line), `expected avg 900ms from timeMs, got: ${line}`);
});
