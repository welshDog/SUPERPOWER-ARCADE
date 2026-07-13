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
