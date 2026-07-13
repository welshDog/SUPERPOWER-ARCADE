const { test } = require('node:test');
const assert = require('node:assert/strict');
const { submitRun, redeemQuestCode } = require('../js/core/api');

const cfg = { SUPABASE_URL: 'https://proj.supabase.co', SUPABASE_ANON_KEY: 'anon-key' };

test('submitRun POSTs to shared_runs with apikey headers', async () => {
  let captured;
  const fakeFetch = async (url, opts) => { captured = { url, opts }; return { ok: true, status: 201 }; };
  const res = await submitRun({ player_name: 'E' }, cfg, fakeFetch);
  assert.equal(res.ok, true);
  assert.equal(captured.url, 'https://proj.supabase.co/rest/v1/shared_runs');
  assert.equal(captured.opts.method, 'POST');
  assert.equal(captured.opts.headers.apikey, 'anon-key');
  assert.equal(captured.opts.headers.Authorization, 'Bearer anon-key');
  assert.equal(captured.opts.headers.Prefer, 'return=minimal');
  assert.equal(JSON.parse(captured.opts.body).player_name, 'E');
});

test('redeemQuestCode calls the RPC and returns first row, null when empty', async () => {
  const hit = async () => ({ ok: true, status: 200, json: async () => [{ invitee_name: 'Evan', message: 'hi' }] });
  const miss = async () => ({ ok: true, status: 200, json: async () => [] });
  assert.deepEqual(await redeemQuestCode('bolt', cfg, hit), { invitee_name: 'Evan', message: 'hi' });
  assert.equal(await redeemQuestCode('nope', cfg, miss), null);
});
