/**
 * 🔐 Keeper Dashboard — dashboard.js
 * Reads from Supabase via service_role key (never exposed to players).
 * Evidence bullets shown FIRST. Archetype label below.
 * ND-friendly invite email pre-filled.
 *
 * Single closure (same pattern as app.js) exposing only the API the HTML calls.
 * shared_runs allows anonymous inserts, so every DB field is untrusted — it goes
 * through esc() before touching innerHTML, and inline onclick handlers only ever
 * carry the numeric row index.
 */

const Dashboard = (() => {
  let _url = '';
  let _key = '';
  let _allRuns = [];
  let _viewRuns = [];

  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));

  /* ── Auth ───────────────────────────────────────── */
  function _showError(msg) {
    const el = document.getElementById('error-msg');
    el.textContent = msg;
    el.style.display = 'block';
  }

  function login() {
    const input = document.getElementById('keeper-key').value.trim();
    if (!input || input.length < 20) {
      _showError('Wrong key — try again.');
      return;
    }
    // Key format: "URL::SERVICE_KEY" pasted by keeper
    const parts = input.split('::');
    if (parts.length !== 2) {
      _showError('Format: SUPABASE_URL::SERVICE_ROLE_KEY');
      return;
    }
    _url = parts[0].trim();
    _key = parts[1].trim();
    document.getElementById('login-panel').style.display  = 'none';
    document.getElementById('dashboard').style.display    = 'block';
    load();
  }

  /* ── Load runs from Supabase ─────────────────────── */
  async function load() {
    document.getElementById('loading').style.display = 'block';
    document.getElementById('runs-list').innerHTML   = '';
    try {
      const res = await fetch(
        `${_url}/rest/v1/keeper_runs?select=*&order=shared_at.desc&limit=200`,
        { headers: { apikey: _key, Authorization: `Bearer ${_key}` } }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      _allRuns = await res.json();
      _updateStats(_allRuns);
      applyFilter();
    } catch (e) {
      const loading = document.getElementById('loading');
      loading.textContent = `Error: ${e.message}. Check your key/URL.`;
      loading.style.color = '#FF4757';
    }
  }

  /* ── Stats bar ───────────────────────────────────── */
  function _updateStats(runs) {
    const today = new Date().toDateString();
    const todayRuns  = runs.filter(r => new Date(r.shared_at).toDateString() === today);
    const questRuns  = runs.filter(r => r.quest_code);
    const archetypes = {};
    runs.forEach(r => { archetypes[r.archetype] = (archetypes[r.archetype] || 0) + 1; });
    const top = Object.entries(archetypes).sort((a,b) => b[1]-a[1])[0];
    document.getElementById('stat-total').textContent = runs.length;
    document.getElementById('stat-today').textContent = todayRuns.length;
    document.getElementById('stat-quest').textContent = questRuns.length;
    document.getElementById('stat-top').textContent   = top ? top[0].replace('_',' ') : '—';
  }

  /* ── Filter ──────────────────────────────────────── */
  function applyFilter() {
    const arch  = document.getElementById('filter-archetype').value;
    const quest = document.getElementById('filter-quest').value;
    let runs = [..._allRuns];
    if (arch)  runs = runs.filter(r => r.archetype === arch);
    if (quest) runs = runs.filter(r => r.quest_code);
    _render(runs);
  }

  /* ── Render run cards ────────────────────────────── */
  function _render(runs) {
    _viewRuns = runs;
    document.getElementById('loading').style.display = 'none';
    const list = document.getElementById('runs-list');
    if (!runs.length) {
      list.innerHTML = '<p style="color:var(--dim);text-align:center;padding:40px">No runs yet.</p>';
      return;
    }
    list.innerHTML = runs.map((r, i) => _runCard(r, i)).join('');
  }

  function _runCard(r, i) {
    const date    = new Date(r.shared_at).toLocaleString('en-GB', { dateStyle:'short', timeStyle:'short' });
    const energy  = r.energy || 'unknown';
    const eDot    = energy === 'high' ? 'energy-high' : energy === 'mid' ? 'energy-mid' : 'energy-low';
    const evidence = Array.isArray(r.evidence) ? r.evidence : [];
    const quest   = r.quest_code;
    const qBadge  = quest ? `<span class="quest-badge">🔑 ${esc(quest)}</span>` : '';

    const evidenceItems = evidence.length
      ? evidence.map(e => `<li>${esc(e)}</li>`).join('')
      : '<li>No evidence captured.</li>';

    return `
    <div class="run-card">
      <div class="run-header">
        <div>
          <span class="archetype-badge">${esc(r.archetype_name || r.archetype)}</span>
          ${qBadge}
        </div>
        <div class="run-meta">
          <span class="energy-dot ${eDot}"></span>Energy: ${esc(energy)} &nbsp;|&nbsp; ${esc(date)}
        </div>
      </div>

      <p style="font-size:.78rem;color:var(--dim);margin-bottom:8px">What they actually did:</p>
      <ul class="evidence-list">${evidenceItems}</ul>

      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn-sm" onclick="Dashboard.toggleSignals(${i})">
          Raw signals
        </button>
        <button class="btn-invite" onclick="Dashboard.toggleInvite(${i})">
          ✉ Draft invite
        </button>
      </div>

      <div id="signals-${i}" style="display:none;margin-top:12px">
        <pre style="background:var(--bg);border-radius:6px;padding:12px;font-size:.75rem;overflow-x:auto;color:var(--dim)">${esc(JSON.stringify(r.signals, null, 2))}</pre>
      </div>

      <div class="invite-block" id="invite-${i}">
        <p style="font-size:.8rem;color:var(--dim);margin-bottom:8px">ND-friendly invite — questions sent ahead:</p>
        <textarea id="invite-text-${i}"></textarea>
        <div style="margin-top:8px;display:flex;gap:8px">
          <button class="btn-sm" onclick="Dashboard.copyInvite(${i})">Copy</button>
        </div>
      </div>
    </div>`;
  }

  /* ── Invite draft ────────────────────────────────── */
  function _draftInvite(r) {
    const name = String(r.player_name || '').trim() || 'there';
    const arch = r.archetype_name || r.archetype || 'standout';
    return [
      `Hi ${name},`,
      '',
      'You played SUPERPOWER ARCADE and chose to share your run — thank you.',
      `It showed real ${arch} strengths, and I'd like to talk.`,
      '',
      'No surprises — here are the questions ahead of time, so you can answer at your own pace:',
      "1. Which chamber felt easiest, like you weren't even trying?",
      '2. What kind of work would you happily lose an afternoon to?',
      '3. What makes a first chat comfortable for you — video, voice, or text?',
      '',
      'Reply whenever suits. No deadline, no wrong answers.',
      '',
      '— The Keeper'
    ].join('\n');
  }

  /* ── Toggle helpers ──────────────────────────────── */
  function toggleSignals(i) {
    const el = document.getElementById(`signals-${i}`);
    el.style.display = el.style.display === 'none' ? 'block' : 'none';
  }

  function toggleInvite(i) {
    const el = document.getElementById(`invite-${i}`);
    const open = el.style.display !== 'block';
    el.style.display = open ? 'block' : 'none';
    if (!open) return;
    const ta = document.getElementById(`invite-text-${i}`);
    if (!ta.value) ta.value = _draftInvite(_viewRuns[i] || {});
  }

  async function copyInvite(i) {
    const ta = document.getElementById(`invite-text-${i}`);
    try {
      await navigator.clipboard.writeText(ta.value);
    } catch {
      ta.select();
      document.execCommand('copy');
    }
  }

  return { login, load, applyFilter, toggleSignals, toggleInvite, copyInvite };
})();
