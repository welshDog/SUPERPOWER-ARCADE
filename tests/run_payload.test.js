const { test } = require('node:test');
const assert = require('node:assert/strict');
const { buildRunPayload } = require('../js/core/runPayload');

const runJson = { meta: { energy: 'high', startedAt: 'x' }, events: [{ type: 'boss_move', detail: {}, at: 1 }] };
const profile = { archetype: { id: 'wild_card', name: 'Wild Card', emoji: 'x' }, scores: { hyperfocus: 1 }, evidence: ['note'] };

test('builds a payload matching shared_runs columns', () => {
  const p = buildRunPayload({ runJson, profile, name: '  Evan  ', contact: 'evan@example.com', questCode: 'bolt-rising' });
  assert.deepEqual(p, {
    player_name: 'Evan',
    contact: 'evan@example.com',
    quest_code: 'BOLT-RISING',
    archetype: 'wild_card',
    evidence: ['note'],
    broski_coins: 0,
    signals: { meta: runJson.meta, events: runJson.events, scores: { hyperfocus: 1 } }
  });
});

test('quest_code is null when absent and name/contact are required', () => {
  const p = buildRunPayload({ runJson, profile, name: 'A', contact: 'b', questCode: '' });
  assert.equal(p.quest_code, null);
  assert.throws(() => buildRunPayload({ runJson, profile, name: '', contact: 'b' }), /name/i);
  assert.throws(() => buildRunPayload({ runJson, profile, name: 'a', contact: ' ' }), /contact/i);
});
