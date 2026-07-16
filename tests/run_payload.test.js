const { test } = require('node:test');
const assert = require('node:assert/strict');
const { buildRunPayload } = require('../js/core/runPayload');
const fs = require('node:fs');
const path = require('node:path');

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

test('every payload key has a shared_runs column in schema.sql', () => {
  const schema = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'schema.sql'), 'utf8');
  const tableDef = schema.split('create table if not exists public.shared_runs')[1].split(');')[0];
  const payload = buildRunPayload({
    runJson: { meta: { energy: 'high' }, events: [] },
    profile: { archetype: { id: 'wild_card', name: 'Wild Card' }, evidence: [], scores: {} },
    name: 'Test', contact: 't@t.com', questCode: 'BOLT-RISING'
  });
  for (const key of Object.keys(payload)) {
    assert.ok(tableDef.includes(key), `shared_runs is missing column for payload key: ${key}`);
  }
});

test('schema defines the RPC name api.js actually calls', () => {
  const schema = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'schema.sql'), 'utf8');
  const api = fs.readFileSync(path.join(__dirname, '..', 'js', 'core', 'api.js'), 'utf8');
  const rpcCalled = api.match(/rpc\/(\w+)/)[1];
  assert.ok(schema.includes(`function public.${rpcCalled}`), `schema.sql must define RPC ${rpcCalled}`);
  assert.ok(schema.includes('invitee_name'), 'quest RPC must return invitee_name (app.js expects it)');
});
