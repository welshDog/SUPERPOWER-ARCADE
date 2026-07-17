const { test } = require('node:test');
const assert = require('node:assert/strict');
const { CHAMBER_META, cardFor, INTERSTITIAL_MS } = require('../js/core/InterstitialCard.js');

test('every chamber in the run order has a card', () => {
  // Mirrors SPA.CHAMBERS in app.js (browser-only, can't be required here).
  const chambers = ['pattern-blitz', 'color-cascade', 'number-rush', 'word-vault', 'scramble', 'vault-door'];
  for (const id of chambers) {
    const c = cardFor(id);
    assert.ok(c.icon && c.name, `no card for ${id}`);
    assert.equal(c, CHAMBER_META[id]);
  }
});

test('unknown ids get a safe fallback and the card is brief', () => {
  const c = cardFor('mystery-zone');
  assert.equal(c.icon, '🕹️');
  assert.equal(c.name, 'MYSTERY-ZONE');
  assert.ok(INTERSTITIAL_MS >= 800 && INTERSTITIAL_MS <= 1200, 'spec: ~0.8-1.2s');
});
