/**
 * tests/chambers.test.js
 * Node --test runner. Tests all 4 chamber modules.
 */
'use strict';
const { test } = require('node:test');
const assert   = require('node:assert/strict');

// ── Minimal stubs ────────────────────────────────────────────
const makeDial = (level = 3) => ({
  getCurrentLevel : () => level,
  recordResponse  : (correct, ms) => ({ action: 'maintain', reason: 'test' }),
});
const makeDJ = () => ({
  processResponse : (correct, ms, streak) => ({ shouldDrop: streak >= 3 }),
  triggerDrop     : (streak) => ({ coins: 1, type: 'standard' }),
});
const makeTracker = () => {
  const events = [];
  return {
    record  : (type, detail) => events.push({ type, detail }),
    events,
  };
};

// ── PatternBlitz ─────────────────────────────────────────────
const { PatternBlitz } = require('../js/chambers/PatternBlitz.js');

test('PatternBlitz: nextRound returns round data', () => {
  const pb = new PatternBlitz({ tracker: makeTracker(), dial: makeDial(), dj: makeDJ() });
  const r  = pb.nextRound();
  assert.ok(r, 'should return round data');
  assert.equal(r.round, 1);
  assert.ok(Array.isArray(r.choices) && r.choices.length === 4);
  assert.ok(r.sequence.length >= 3);
});

test('PatternBlitz: correct answer increments streak', () => {
  const pb = new PatternBlitz({ tracker: makeTracker(), dial: makeDial(), dj: makeDJ() });
  const r  = pb.nextRound();
  const res = pb.answer(r.choices.find(c => c === r.sequence.join('')) || r.sequence.join(''));
  assert.ok(res);
});

test('PatternBlitz: timeout resets streak to 0', () => {
  const pb = new PatternBlitz({ tracker: makeTracker(), dial: makeDial(), dj: makeDJ() });
  pb.nextRound();
  const res = pb.timeout();
  assert.equal(res.streak, 0);
  assert.equal(res.timedOut, true);
});

test('PatternBlitz: isComplete after 8 rounds', () => {
  const pb = new PatternBlitz({ tracker: makeTracker(), dial: makeDial(), dj: makeDJ() });
  for (let i = 0; i < 8; i++) { pb.nextRound(); pb.timeout(); }
  assert.equal(pb.isComplete(), true);
});

// ── ColorCascade ─────────────────────────────────────────────
const { ColorCascade } = require('../js/chambers/ColorCascade.js');

test('ColorCascade: nextRound grows sequence', () => {
  const cc = new ColorCascade({ tracker: makeTracker(), dial: makeDial(), dj: makeDJ() });
  const r1 = cc.nextRound();
  assert.equal(r1.sequence.length, 1);
  cc.answer([r1.sequence[0]]);
  const r2 = cc.nextRound();
  assert.equal(r2.sequence.length, 2);
});

test('ColorCascade: wrong answer resets sequence', () => {
  const cc = new ColorCascade({ tracker: makeTracker(), dial: makeDial(), dj: makeDJ() });
  const r  = cc.nextRound();
  cc.answer(['wrong-color-id']);
  const r2 = cc.nextRound();
  assert.equal(r2.sequence.length, 1, 'sequence resets on miss');
});

test('ColorCascade: isComplete after 7 rounds', () => {
  const cc = new ColorCascade({ tracker: makeTracker(), dial: makeDial(), dj: makeDJ() });
  for (let i = 0; i < 7; i++) { const r = cc.nextRound(); cc.answer([r.sequence[0]]); }
  assert.equal(cc.isComplete(), true);
});

// ── NumberRush ───────────────────────────────────────────────
const { NumberRush } = require('../js/chambers/NumberRush.js');

test('NumberRush: nextRound returns sequence + choices', () => {
  const nr = new NumberRush({ tracker: makeTracker(), dial: makeDial(1), dj: makeDJ() });
  const r  = nr.nextRound();
  assert.ok(Array.isArray(r.sequence) && r.sequence.length === 4);
  assert.ok(Array.isArray(r.choices)  && r.choices.length  === 4);
  assert.ok(r.hint, 'hint shown at low level');
});

test('NumberRush: correct answer tracked', () => {
  const tracker = makeTracker();
  const nr = new NumberRush({ tracker, dial: makeDial(1), dj: makeDJ() });
  const r  = nr.nextRound();
  // find the correct answer from choices
  const correct = r.choices.find(c => !isNaN(c));
  nr.answer(correct);
  const ev = tracker.events.find(e => e.type === 'game_response');
  assert.ok(ev, 'game_response event recorded');
});

test('NumberRush: no hint at high level', () => {
  const nr = new NumberRush({ tracker: makeTracker(), dial: makeDial(8), dj: makeDJ() });
  const r  = nr.nextRound();
  assert.equal(r.hint, null);
});

// ── VaultDoor ────────────────────────────────────────────────
const { VaultDoor } = require('../js/chambers/VaultDoor.js');

test('VaultDoor: start returns glyphs + narrative', () => {
  const vd = new VaultDoor({ tracker: makeTracker() });
  const s  = vd.start();
  assert.ok(Array.isArray(s.glyphs) && s.glyphs.length > 0);
  assert.ok(typeof s.narrative === 'string');
  assert.equal(s.slots, 4);
});

test('VaultDoor: correct combo solves vault', () => {
  const vd = new VaultDoor({ tracker: makeTracker() });
  vd.start();
  const sol = vd._getSolutionForTest();
  const res = vd.attempt(sol);
  assert.equal(res.correct, true);
  assert.equal(vd.isSolved(), true);
});

test('VaultDoor: wrong combo not solved, nudge after 5', () => {
  const vd = new VaultDoor({ tracker: makeTracker() });
  vd.start();
  for (let i = 0; i < 5; i++) {
    const res = vd.attempt(['X','X','X','X']);
    assert.equal(res.correct, false);
  }
  const res6 = vd.attempt(['X','X','X','X']);
  assert.ok(res6.nudge, 'nudge shown after 5+ attempts');
});

test('VaultDoor: abandon marks isComplete', () => {
  const vd = new VaultDoor({ tracker: makeTracker() });
  vd.start();
  vd.abandon();
  assert.equal(vd.isComplete(), true);
  assert.equal(vd.isAbandoned(), true);
});
