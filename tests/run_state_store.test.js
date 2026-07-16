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
