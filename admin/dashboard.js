/**
 * 🔐 Keeper Dashboard — dashboard.js
 * Reads from Supabase via service_role key (never exposed to players).
 * Evidence bullets shown FIRST. Archetype label below.
 * ND-friendly invite email pre-filled.
 */

const Dashboard = (() => {
  let _url = '';
  let _key = '';
  let _allRuns = [];

  /* ── Auth ───────────────────────────────────────── */
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
      document.getElementById('loading').innerHTML =
        `<span style="color:#FF4757">Error: ${e.message}. Check your key/URL.</span>`;
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
    const qBadge  = r.quest_code ? `<span class="quest-badge">🔑 ${r.quest_code}</span>` : '';

    const evidenceItems = evidence.length
      ? evidence.map(e => `>${e}</li>`).join('')
      : '>No evidence captured.</li>';

    return `
    <div class="run-card">
      <div class="run-header">
        <div>
          <span class="archetype-badge">${r.archetype_name || r.archetype}</span>
          ${qBadge}
        </div>
        <div class="run-meta">
          <span class="energy-dot ${eDot}"></span>Energy: ${energy} &nbsp;|&nbsp; ${date}
        </div>
      </div>

      <p style="font-size:.78rem;color:var(--dim);margin-bottom:8px">What they actually did:</p>
      <ul class="evidence-list">${evidenceItems}</ul>

      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn-sm" onclick="Dashboard.toggleSignals('signals-${i}')">
          Raw signals
        </button>
        <button class="btn-invite" onclick="Dashboard.toggleInvite('invite-${i}', '${r.archetype_name}', '${r.id}')">
          ✉ Draft invite
        </button>
      </div>

      <div id="signals-${i}" style="display:none;margin-top:12px">
        <pre style="background:var(--bg);border-radius:6px;padding:12px;font-size:.75rem;overflow-x:auto;color:var(--dim)">${JSON.stringify(r.signals, null, 2)}</pre>
      </div>

      <div class="invite-block" id="invite-${i}">
        <p style="font-size:.8rem;color:var(--dim);margin-bottom:8px">ND-friendly invite — questions sent ahead:</p>
        <textarea id="invite-text-${i}"></textarea>
        <div style="margin-top:8px;display:flex;gap:8px">
          <button class="btn-sm" onclick="Dashboard.copyInvite('invite-text-${i}')">Copy</button>
        </div>
      </div>
    </div>`;
  }

  /* ── Toggle helpers ──────────────────────────────── */
  function toggleSignals(id) {
    const el = document.getElementById(id);
    el.style.display = el.style.display === 'none' ? 'block' : 'none';
  }