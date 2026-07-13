/**
 * api — the ONLY module allowed to talk to the network.
 * Called exclusively from the share screen (submitRun) and quest-code entry (redeemQuestCode).
 */
function headers(cfg) {
  return {
    apikey: cfg.SUPABASE_ANON_KEY,
    Authorization: `Bearer ${cfg.SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json'
  };
}

async function submitRun(payload, cfg, fetchImpl) {
  const f = fetchImpl || fetch;
  const res = await f(`${cfg.SUPABASE_URL}/rest/v1/shared_runs`, {
    method: 'POST',
    headers: { ...headers(cfg), Prefer: 'return=minimal' },
    body: JSON.stringify(payload)
  });
  return { ok: res.ok, status: res.status };
}

async function redeemQuestCode(code, cfg, fetchImpl) {
  const f = fetchImpl || fetch;
  const res = await f(`${cfg.SUPABASE_URL}/rest/v1/rpc/redeem_quest_code`, {
    method: 'POST',
    headers: headers(cfg),
    body: JSON.stringify({ p_code: code })
  });
  if (!res.ok) return null;
  const rows = await res.json();
  return rows && rows.length ? rows[0] : null;
}

if (typeof module !== 'undefined' && module.exports) { module.exports = { submitRun, redeemQuestCode }; }
else { window.SPA_API = { submitRun, redeemQuestCode }; }
