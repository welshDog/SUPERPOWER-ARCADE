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
