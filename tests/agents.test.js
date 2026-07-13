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
