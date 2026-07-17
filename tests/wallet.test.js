const { test } = require('node:test');
const assert = require('node:assert/strict');
const Wallet = require('../js/core/Wallet.js');

test('coins add, spend, clamp at zero', () => {
  const w = new Wallet();
  w.addCoins(10);
  assert.equal(w.coins, 10);
  assert.equal(w.spendCoins(4), true);
  assert.equal(w.coins, 6);
  assert.equal(w.spendCoins(100), false);
  assert.equal(w.coins, 6);
  w.setCoins(-5);
  assert.equal(w.coins, 0, 'setCoins clamps at 0');
});

test('streak grows on correct, resets on wrong', () => {
  const w = new Wallet();
  assert.equal(w.recordAnswer(true).streak, 1);
  assert.equal(w.recordAnswer(true).streak, 2);
  assert.equal(w.recordAnswer(false).streak, 0);
  assert.equal(w.recordAnswer(true).streak, 1);
});

test('toJSON/fromJSON round-trips, tolerating legacy saves without a wallet key', () => {
  const w = new Wallet({ coins: 42, streak: 3 });
  const j = w.toJSON();
  assert.deepEqual(j, { coins: 42, streak: 3 });
  const back = Wallet.fromJSON(j);
  assert.equal(back.coins, 42);
  assert.equal(back.streak, 3);
  const legacy = Wallet.fromJSON(undefined);
  assert.equal(legacy.coins, 0);
  assert.equal(legacy.streak, 0);
});
