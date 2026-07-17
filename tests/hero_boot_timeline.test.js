const { test } = require('node:test');
const assert = require('node:assert/strict');
const { HERO_BOOT_STAGES, applyReducedMotion } = require('../js/core/HeroBootTimeline.js');

test('stages are complete, ordered, and under the 2s settle budget', () => {
  assert.deepEqual(HERO_BOOT_STAGES.map(s => s.name), ['word-1', 'word-2', 'tagline', 'action-1', 'action-2']);
  for (let i = 1; i < HERO_BOOT_STAGES.length; i++) {
    assert.ok(HERO_BOOT_STAGES[i].delayMs >= HERO_BOOT_STAGES[i - 1].delayMs, 'delays must be monotonic');
  }
  const settle = Math.max(...HERO_BOOT_STAGES.map(s => s.delayMs + s.durationMs));
  assert.ok(settle < 2000, `boot must settle under 2s, got ${settle}ms`);
});

test('applyReducedMotion zeroes everything and never mutates the input', () => {
  const collapsed = applyReducedMotion(HERO_BOOT_STAGES, true);
  for (const s of collapsed) { assert.equal(s.delayMs, 0); assert.equal(s.durationMs, 0); }
  assert.ok(HERO_BOOT_STAGES[1].delayMs > 0, 'input mutated!');
  const untouched = applyReducedMotion(HERO_BOOT_STAGES, false);
  assert.deepEqual(untouched, HERO_BOOT_STAGES);
});
