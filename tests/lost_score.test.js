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
