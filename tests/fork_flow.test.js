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
