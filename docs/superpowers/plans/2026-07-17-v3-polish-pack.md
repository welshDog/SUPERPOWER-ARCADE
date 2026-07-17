# v3 Polish Pack Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship v3 "The Polish Pack" — four verified repairs (CDN purge, real OpenDyslexic, Keeper access docs, dashboard rebuild) plus four polish layers (cinematic entrance hero, native Web Audio sound, chamber interstitials, unified wallet + momentum HUD).

**Architecture:** Follow the repo's exact layering: pure logic in `js/core/` (dual export, `node --test`-covered), canvas/FX in `js/systems/`, flow control only in `app.js`, network ONLY in `js/core/api.js`. New browser-only code (canvas, AudioContext calls) is covered by structural/source-scan tests in `tests/e2e.test.js`, same policy as existing DOM adapters. Third-party code moves from CDNs into a top-level `vendor/` dir (NOT under `js/` — the network-isolation test scans `js/` recursively and three.min.js contains `fetch`).

**Tech Stack:** Vanilla JS (no framework, no build step), Web Audio API (native, no Howler), `node --test` (zero npm dependencies), static Vercel deploy.

**Spec:** `docs/superpowers/specs/2026-07-17-v3-polish-pack-design.md` (incorporates `2026-07-16-cinematic-entrance-hero-idea.md` by reference)

## Global Constraints

- **Zero npm dependencies, no build step.** `package.json` stays exactly `{"scripts": {"test": "node --test"}}`. Vendored files (`vendor/`, `fonts/`) are committed assets, not dependencies.
- **Zero third-party requests at runtime** (spec DoD): after Task 1, no `<script src="http...">` in any HTML file — three.js is vendored, howler/ethers/supabase-js deleted.
- **Network isolation:** nothing outside `js/core/api.js` may contain `fetch(` or `XMLHttpRequest` — enforced by the existing scan in `tests/e2e.test.js` over `js/` and `data/`. All new modules must pass it.
- **Consent/ethics hard rules carried forward:** no data leaves the device without the share tap; descriptive-never-interpretive evidence; no diagnosis mapping.
- **Web3 stays dormant:** no ethers, no chain calls; `js/systems/BROskiWallet.js` stays in-repo but unloaded, clearly marked.
- **Accessibility:** all new animation respects `@media (prefers-reduced-motion: reduce)`; sound defaults muted for reduced-motion users on first visit; `.font-od` toggle must never be broken by new CSS (never touch `font-family` in new animation rules).
- **`#btn-enter` clickable from t=0** — entrance animation is cosmetic, never a gate.
- Dual export pattern in every new JS module: `if (typeof module !== 'undefined' && module.exports) { module.exports = X; } else { window.X = X; }`
- Run tests from repo root: `npm test`. Single file: `node --test tests/<file>.test.js`. Baseline: 75 passing — must never drop.
- Commit prefixes: `feat:` / `fix:` / `test:` / `docs:` / `chore:` only.
- Branch: `feat/v3-polish-pack` off `main` (create in an isolated worktree via superpowers:using-git-worktrees at execution start).

---

## File Structure

- **New:** `vendor/three.min.js` (vendored r128) · `fonts/OpenDyslexic-Regular.woff2`, `fonts/OpenDyslexic-Bold.woff2` · `js/core/HeroBootTimeline.js` · `js/systems/HeroField.js` · `js/systems/SoundEngine.js` · `js/core/InterstitialCard.js` · `js/core/Wallet.js` · `tests/hero_boot_timeline.test.js` · `tests/sound_engine.test.js` · `tests/interstitial_card.test.js` · `tests/wallet.test.js`
- **Rewrite:** `admin/dashboard.js` (truncated + fatally broken — full rebuild from the recovered original plus the never-written tail)
- **Modify:** `index.html` (script tags, hero spans, interstitial screen, HUD mute/streak) · `style.css` (@font-face, hero keyframes, interstitial, HUD pulse, z-index fix) · `app.js` (hero boot, sound wiring, interstitials, Wallet swap) · `admin/dashboard.html` (broken `<label>` tag) · `js/games/vaultDoor.js` (one `ctx.sound` line) · `js/systems/BROskiWallet.js` (dormant-notice header only) · `tests/e2e.test.js` (structural tests) · `README.md` · `docs/README.md`

---

### Task 1: CDN purge — vendor three.js, delete howler/ethers/supabase-js

> **✅ DONE 2026-07-17 (outside plan execution).** Steps 1–4 complete: structural test in `tests/e2e.test.js` (watched fail→pass), `vendor/three.min.js` vendored (603KB, license header verified), all four CDN tags replaced with the one vendored tag, BROskiWallet tag removed + dormant notice added. Browser-verified: `THREE.REVISION === "128"` from the vendored file, zero non-localhost requests, zero console errors. Step 5 (commit) left for Lyndz — changes are uncommitted in the working tree.

**Files:**
- Create: `vendor/three.min.js`
- Modify: `index.html:94-97`, `index.html:102` (BROskiWallet tag), `js/systems/BROskiWallet.js:1-4` (header note)
- Test: `tests/e2e.test.js` (extend)

**Interfaces:**
- Consumes: nothing.
- Produces: `window.THREE` still available to `js/games/vaultDoor.js` (unchanged consumer); index.html with zero external scripts (Tasks 2-10 rely on this test staying green).

- [ ] **Step 1: Write the failing test**

Append to `tests/e2e.test.js` (ESM file — match its existing `fileURLToPath` pattern; add `existsSync` to the existing `node:fs` import at the top of the file):

```js
test('zero third-party requests — no external script tags in any HTML', () => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = join(__filename, '..');
  for (const f of ['index.html', join('admin', 'dashboard.html')]) {
    const src = readFileSync(join(__dirname, '..', f), 'utf8');
    assert.ok(!/<script[^>]+src=["']https?:/i.test(src), `${f} loads an external script`);
  }
  assert.ok(existsSync(join(__dirname, '..', 'vendor', 'three.min.js')),
    'three.js must be vendored locally (vaultDoor.js needs window.THREE)');
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test tests/e2e.test.js`
Expected: FAIL — index.html has 4 external script tags; vendor/three.min.js missing.

- [ ] **Step 3: Vendor three.js and fix index.html**

```bash
mkdir -p vendor
curl -sL -o vendor/three.min.js https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js
# sanity: r128 minified is ~600KB
ls -la vendor/three.min.js
head -c 100 vendor/three.min.js   # should look like JS, not an HTML error page
```

In `index.html`, replace lines 94-97:

```html
  <script src="https://cdnjs.cloudflare.com/ajax/libs/ethers/6.7.0/ethers.umd.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/howler/2.2.4/howler.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
```

with:

```html
  <script src="vendor/three.min.js"></script>
```

(ethers: only consumer is the dormant BROskiWallet — web3 stays off per spec. howler: zero usage. supabase-js: zero usage — `js/core/api.js` uses raw REST.)

Also delete line 102 (`<script src="js/systems/BROskiWallet.js"></script>`) — the wallet scaffold stays in-repo but unloaded (Task 9 replaces its local half; spec 3d says don't silently delete). Prepend this notice to `js/systems/BROskiWallet.js` (above the existing comment block):

```js
/**
 * ⚠️ DORMANT SCAFFOLD — not loaded by index.html since v3.
 * Web3/on-chain BROski$ minting is out of scope until explicitly signed off
 * (see docs/superpowers/specs/2026-07-17-v3-polish-pack-design.md §3d).
 * Local coin/streak accounting lives in js/core/Wallet.js.
 */
```

- [ ] **Step 4: Run tests + manual smoke**

Run: `npm test` → all pass including the new test.
Smoke: `npx serve .` → play into the VaultDoor boss (fastest path: temporarily reorder isn't allowed — just click through a run) and confirm the 3D vault renders from the vendored file, devtools Network tab shows zero third-party requests.

- [ ] **Step 5: Commit**

```bash
git add vendor/three.min.js index.html js/systems/BROskiWallet.js tests/e2e.test.js
git commit -m "fix: zero third-party requests — vendor three.js, drop dead howler/ethers/supabase-js CDN tags"
```

---

### Task 2: Real OpenDyslexic — self-hosted @font-face

> **✅ DONE 2026-07-17 (outside plan execution).** Steps 1–4 complete: structural test in `tests/e2e.test.js` (watched fail→pass), both woff2 files fetched and magic-bytes-verified (`wOF2`, ~103/108KB), @font-face block added at the top of `style.css`. NOTE: this task's `master`-branch URLs 404 into GitHub HTML pages — the working URLs are `https://raw.githubusercontent.com/antijingoist/opendyslexic/main/compiled/OpenDyslexic-{Regular,Bold}.woff2` (branch is `main`). Browser-verified: `document.fonts.check('16px OpenDyslexic')` and bold both true after load. Step 5 (commit) left for Lyndz. Suite baseline is now **87** green.

**Files:**
- Create: `fonts/OpenDyslexic-Regular.woff2`, `fonts/OpenDyslexic-Bold.woff2`
- Modify: `style.css` (add @font-face block above `:root`)
- Test: `tests/e2e.test.js` (extend)

**Interfaces:**
- Consumes: existing `.font-od` rule (`style.css:77`) — unchanged.
- Produces: the font family `'OpenDyslexic'` actually resolving in-browser.

- [ ] **Step 1: Write the failing test**

Append to `tests/e2e.test.js`:

```js
test('the OpenDyslexic toggle is real — @font-face exists and font files ship', () => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = join(__filename, '..');
  const css = readFileSync(join(__dirname, '..', 'style.css'), 'utf8');
  assert.match(css, /@font-face\s*\{[^}]*OpenDyslexic/s, 'style.css must declare @font-face for OpenDyslexic');
  assert.match(css, /font-display:\s*swap/, 'use font-display: swap so text never blocks on the font');
  for (const f of ['OpenDyslexic-Regular.woff2', 'OpenDyslexic-Bold.woff2']) {
    assert.ok(existsSync(join(__dirname, '..', 'fonts', f)), `fonts/${f} missing`);
  }
});
```

- [ ] **Step 2: Run to verify it fails** — `node --test tests/e2e.test.js` → FAIL (no @font-face, no files).

- [ ] **Step 3: Fetch the fonts (OFL-licensed) and add @font-face**

```bash
mkdir -p fonts
curl -sL -o fonts/OpenDyslexic-Regular.woff2 "https://github.com/antijingoist/opendyslexic/raw/master/compiled/OpenDyslexic-Regular.woff2"
curl -sL -o fonts/OpenDyslexic-Bold.woff2    "https://github.com/antijingoist/opendyslexic/raw/master/compiled/OpenDyslexic-Bold.woff2"
# VERIFY: each file must start with the woff2 magic bytes "wOF2" and be >20KB.
head -c 4 fonts/OpenDyslexic-Regular.woff2   # expect: wOF2
ls -la fonts/
```

> If those URLs 404 (repo layout may have shifted), download the woff2 files from https://opendyslexic.org (also OFL) and place them at the same paths — the magic-bytes check above is the gate, not the URL.

Add at the very top of `style.css` (before `:root`):

```css
@font-face {
  font-family: 'OpenDyslexic';
  src: url('fonts/OpenDyslexic-Regular.woff2') format('woff2');
  font-weight: normal;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: 'OpenDyslexic';
  src: url('fonts/OpenDyslexic-Bold.woff2') format('woff2');
  font-weight: bold;
  font-style: normal;
  font-display: swap;
}
```

- [ ] **Step 4: Run tests + manual verify** — `npm test` → green. Smoke: serve, reach Word Vault in word mode, click "Aa OpenDyslexic" — glyphs must visibly change to OpenDyslexic's heavy-bottomed letterforms (NOT Comic Sans). Devtools Network shows `fonts/OpenDyslexic-Regular.woff2` loading from same origin.

- [ ] **Step 5: Commit**

```bash
git add fonts/ style.css tests/e2e.test.js
git commit -m "fix: OpenDyslexic toggle loads the real font — self-hosted woff2 + @font-face (OFL)"
```

---

### Task 3: Rebuild admin/dashboard.js + fix dashboard.html + document Keeper access

> **✅ MOSTLY DONE 2026-07-17 (outside plan execution — design-brain audit session).** The dashboard.js rebuild and dashboard.html `<label>` fix already shipped, locked by `tests/dashboard_repair.test.js` (10 structural tests; baseline is now **85** green, not 75). **Do NOT apply this task's inline dashboard.js listing** — it predates the security hardening and would reintroduce a stored-XSS: the shipped version routes every DB field through an `esc()` helper and passes only numeric row indexes through onclick (`toggleSignals(i)` / `toggleInvite(i)` / `copyInvite(i)`, run data read from the module's `_viewRuns`), whereas the listing below interpolates raw fields and pushes player data through onclick strings. Step 5 (README "local only" access docs, spec §2c) was also completed 2026-07-17 — **this entire task is done**; skip it and keep the shipped `admin/dashboard.js`.

**Files:**
- Rewrite: `admin/dashboard.js` (whole file — it is truncated mid-file and fatally references `SPA_CONFIG`, which `dashboard.html` never loads)
- Modify: `admin/dashboard.html:74` (broken `<label>`), `README.md` (Admin section)
- Test: `tests/e2e.test.js` (extend)

**Interfaces:**
- Consumes: `dashboard.html`'s onclick surface: `Dashboard.login()`, `Dashboard.load()`, `Dashboard.applyFilter()`, `Dashboard.toggleSignals(id)`, `Dashboard.toggleInvite(blockId, archetypeName, runId)`, `Dashboard.copyInvite(textareaId)`; elements `#keeper-key #error-msg #login-panel #dashboard #loading #runs-list #stat-total #stat-today #stat-quest #stat-top #filter-archetype #filter-quest`.
- Produces: a working Keeper dashboard, served locally.

**Known defects being fixed (all verified):** (1) `const Dashboard = () => {}` — broken IIFE, everything leaks global, no API object so every onclick throws; (2) references `SPA_CONFIG` at load time → `ReferenceError` before anything runs; (3) file truncated — `toggleInvite`, `copyInvite`, `_showError` never existed in any commit; (4) `_runCard` evidence items miss the opening `<li`: `` evidence.map(e => `>${e}</li>`) ``; (5) `dashboard.html:74` reads `abel style=...>Filter:</label>` — missing `<l`.

- [ ] **Step 1: Write the failing structural test**

Append to `tests/e2e.test.js`:

```js
test('dashboard.js is a closed IIFE exposing exactly the API dashboard.html calls', () => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = join(__filename, '..');
  const src = readFileSync(join(__dirname, '..', 'admin', 'dashboard.js'), 'utf8');
  assert.match(src, /const Dashboard = \(\(\) => \{/, 'must be an IIFE, not a bare arrow');
  assert.match(src, /\}\)\(\);\s*$/, 'IIFE must be closed and invoked');
  for (const fn of ['login', 'load', 'applyFilter', 'toggleSignals', 'toggleInvite', 'copyInvite', '_showError']) {
    assert.ok(src.includes(`function ${fn}`), `dashboard.js missing function ${fn}`);
  }
  assert.match(src, /return\s*\{[^}]*login[^}]*copyInvite[^}]*\}/s, 'must return the public API object');
  assert.ok(!src.includes('SPA_CONFIG'), 'dashboard.html never loads js/config.js — SPA_CONFIG would crash on load');
  assert.ok(src.includes('<li'), 'evidence items must render as real <li> elements');
  const html = readFileSync(join(__dirname, '..', 'admin', 'dashboard.html'), 'utf8');
  assert.ok(!html.includes('abel style'), 'dashboard.html has a mangled <label> tag');
});
```

- [ ] **Step 2: Run to verify it fails** — `node --test tests/e2e.test.js` → FAIL on every assertion.

- [ ] **Step 3: Rewrite `admin/dashboard.js`**

Full replacement file. It keeps the recovered original's working middle (login parsing, load, stats, filter, cards) with the `<li` fix, drops `SPA_CONFIG`, and writes the missing tail:

```js
/**
 * 🔐 Keeper Dashboard — dashboard.js
 * Reads from Supabase via service_role key (never exposed to players).
 * Evidence bullets shown FIRST. Archetype label below.
 * ND-friendly invite email pre-filled.
 * Served locally only — prod /admin/* is blocked at the Vercel edge (see README).
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
    document.getElementById('login-panel').style.display = 'none';
    document.getElementById('dashboard').style.display = 'block';
    load();
  }

  function _showError(msg) {
    const el = document.getElementById('error-msg');
    el.textContent = msg;
    el.style.display = 'block';
  }

  /* ── Load runs from Supabase ─────────────────────── */
  async function load() {
    document.getElementById('loading').style.display = 'block';
    document.getElementById('runs-list').innerHTML = '';
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
    const top = Object.entries(archetypes).sort((a, b) => b[1] - a[1])[0];
    document.getElementById('stat-total').textContent = runs.length;
    document.getElementById('stat-today').textContent = todayRuns.length;
    document.getElementById('stat-quest').textContent = questRuns.length;
    document.getElementById('stat-top').textContent   = top ? top[0].replace('_', ' ') : '—';
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
    const date    = new Date(r.shared_at).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' });
    const energy  = r.energy || 'unknown';
    const eDot    = energy === 'high' ? 'energy-high' : energy === 'mid' ? 'energy-mid' : 'energy-low';
    const evidence = Array.isArray(r.evidence) ? r.evidence : [];
    const qBadge  = r.quest_code ? `<span class="quest-badge">🔑 ${r.quest_code}</span>` : '';

    const evidenceItems = evidence.length
      ? evidence.map(e => `<li>${e}</li>`).join('')
      : '<li>No evidence captured.</li>';

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
        <button class="btn-invite" onclick="Dashboard.toggleInvite('invite-${i}', '${r.archetype_name || r.archetype}', '${r.player_name || ''}')">
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

  function toggleInvite(blockId, archetypeName, playerName) {
    const block = document.getElementById(blockId);
    const showing = block.style.display === 'block';
    block.style.display = showing ? 'none' : 'block';
    if (!showing) {
      const ta = block.querySelector('textarea');
      if (!ta.value) ta.value = _inviteTemplate(archetypeName, playerName);
    }
  }

  function _inviteTemplate(archetypeName, playerName) {
    const name = (playerName || '').trim() || 'there';
    const arch = (archetypeName || 'legendary').replace(/_/g, ' ');
    return `Hey ${name}!

Your Arcade run lit up the board — that ${arch} energy is exactly what I look for.

I'd love a short, zero-pressure chat about something real we could build together. So you can prep (or decide it's not for you, also fine):

1. What's a project you hyperfocused on and loved?
2. What kind of tasks drain you fastest?
3. What does a good working day look like for you?

No interviews, no trick questions — you've already shown me how you think.

— The Arcade Keeper`;
  }

  function copyInvite(textareaId) {
    const ta = document.getElementById(textareaId);
    ta.select();
    navigator.clipboard.writeText(ta.value).catch(() => document.execCommand('copy'));
  }

  return { login, load, applyFilter, toggleSignals, toggleInvite, copyInvite };
})();
```

(Note: `toggleInvite`'s third argument is now the player name, not the run id — more useful for the template, and dashboard.js owns both sides of that contract since `_runCard` generates the onclick.)

- [ ] **Step 4: Fix `admin/dashboard.html:74`**

Replace `abel style="color:var(--dim);font-size:.85rem">Filter:</label>` with `<label style="color:var(--dim);font-size:.85rem">Filter:</label>`.

- [ ] **Step 5: Update README Admin section**

In `README.md`'s "Admin / Keeper Dashboard" section, replace the access line with:

```markdown
Access — **local only, by design**: prod `/admin/*` is blocked for everyone at the Vercel edge. To use the dashboard:

```bash
npx serve .
# then open http://localhost:3000/admin/dashboard.html
# and paste  SUPABASE_URL::SERVICE_ROLE_KEY  at the login prompt
```
```

- [ ] **Step 6: Run tests + manual verify**

`npm test` → green (structural test passes; the network-isolation scan doesn't cover `admin/`, and dashboard.js legitimately fetches).
Manual: `npx serve .` → open `localhost:.../admin/dashboard.html` → paste the real `URL::SERVICE_KEY` → runs load, evidence bullets render as arrowed list items, Raw signals toggles, Draft invite opens with the template, Copy works.

- [ ] **Step 7: Commit**

```bash
git add admin/dashboard.js admin/dashboard.html README.md tests/e2e.test.js
git commit -m "fix: rebuild truncated Keeper dashboard — closed IIFE, no SPA_CONFIG crash, invite drafting, evidence <li> render"
```

---

### Task 4: HeroBootTimeline — pure timing module

> **✅ DONE 2026-07-17** exactly as specced (commit 93654e9): TDD red→green, `tests/hero_boot_timeline.test.js` 2 tests.

**Files:**
- Create: `js/core/HeroBootTimeline.js`
- Test: `tests/hero_boot_timeline.test.js` (create)

**Interfaces:**
- Consumes: nothing.
- Produces (for Task 5): `window.HeroBootTimeline` = `{ HERO_BOOT_STAGES, applyReducedMotion }`. `HERO_BOOT_STAGES`: ordered array of `{ name: string, delayMs: number, durationMs: number }` with names exactly `['word-1','word-2','tagline','action-1','action-2']`. `applyReducedMotion(stages, prefersReduced)` → new array; when `prefersReduced` is true every `delayMs`/`durationMs` is `0`; input array never mutated.

- [ ] **Step 1: Write the failing tests**

Create `tests/hero_boot_timeline.test.js`:

```js
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
```

- [ ] **Step 2: Run to verify fail** — `node --test tests/hero_boot_timeline.test.js` → FAIL (module not found).

- [ ] **Step 3: Implement `js/core/HeroBootTimeline.js`**

```js
/**
 * HeroBootTimeline — single source of truth for the entrance boot sequence
 * timing (spec §3a). Pure data + pure function; app.js applies these as
 * animation-delay/duration on the landing screen elements.
 */
const HERO_BOOT_STAGES = [
  { name: 'word-1',   delayMs: 0,    durationMs: 600 },
  { name: 'word-2',   delayMs: 180,  durationMs: 600 },
  { name: 'tagline',  delayMs: 700,  durationMs: 450 },
  { name: 'action-1', delayMs: 950,  durationMs: 350 },
  { name: 'action-2', delayMs: 1050, durationMs: 350 }
];

function applyReducedMotion(stages, prefersReduced) {
  return stages.map(s => prefersReduced ? { ...s, delayMs: 0, durationMs: 0 } : { ...s });
}

const HeroBootTimeline = { HERO_BOOT_STAGES, applyReducedMotion };

if (typeof module !== 'undefined' && module.exports) { module.exports = HeroBootTimeline; }
else { window.HeroBootTimeline = HeroBootTimeline; }
```

- [ ] **Step 4: Run to verify pass** — `node --test tests/hero_boot_timeline.test.js` → PASS; `npm test` → no regressions.

- [ ] **Step 5: Commit**

```bash
git add js/core/HeroBootTimeline.js tests/hero_boot_timeline.test.js
git commit -m "feat: HeroBootTimeline — pure boot-sequence timing with reduced-motion collapse"
```

---

### Task 5: Entrance hero — HeroField canvas + markup + CSS + app.js wiring

> **✅ DONE 2026-07-17** exactly as specced (commit d7c7787). Browser-verified: stagger delays applied per timeline, field runs on cold load, INSERT COIN tears down (boot-playing removed, RAF stopped), resume path skips the boot, Start fresh replays it. reduced-motion collapse covered by unit tests + CSS media query (not browser-emulated). Suite baseline: **91** green.

**Files:**
- Create: `js/systems/HeroField.js`
- Modify: `index.html:13-17` (hero spans + boot-actions), `index.html` script block (2 new tags), `style.css` (z-index fix + keyframes), `app.js` (enterLandingWithBoot)

**Interfaces:**
- Consumes: `HeroBootTimeline` (Task 4, exact shape above); the existing dead `<canvas id="particle-canvas">` (`index.html:10`); existing palette hexes `#4ECDC4 #FFD700 #FF6B9D`.
- Produces: `window.HeroField` — `class HeroField { constructor({ canvas, particleCount = 40 }); start(); stop(); }`. `stop()` cancels the RAF loop and clears the canvas. Task 7 does NOT depend on this; nothing else consumes HeroField.

- [ ] **Step 1: Implement `js/systems/HeroField.js`**

(Browser-only canvas code — no unit test, covered by the existing network-isolation scan + manual verification, same policy as `js/games/` adapters.)

```js
/**
 * HeroField — ambient drifting particle layer for the entrance hero (spec §3a).
 * Claims the #particle-canvas element (previously dead markup). Deliberately
 * separate from ParticleSystem: that engine is burst physics (spawn→arc→die);
 * this is a persistent, slow, low-density field. start()/stop() lifecycle only.
 */
class HeroField {
  constructor({ canvas, particleCount = 40 } = {}) {
    this.canvas = canvas;
    this.ctx = canvas ? canvas.getContext('2d') : null;
    this.particleCount = particleCount;
    this.particles = [];
    this.raf = null;
    this.pixelRatio = window.devicePixelRatio || 1;
    this._onResize = () => this._resize();
  }

  _resize() {
    this.canvas.width = window.innerWidth * this.pixelRatio;
    this.canvas.height = window.innerHeight * this.pixelRatio;
    this.ctx.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
  }

  _spawn() {
    const COLORS = ['#4ECDC4', '#FFD700', '#FF6B9D'];
    this.particles = Array.from({ length: this.particleCount }, () => {
      const depth = 0.4 + Math.random() * 0.6; // 3 visual layers via continuous depth
      return {
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vy: -(0.1 + depth * 0.25),            // deeper = slightly faster drift up
        size: 1 + depth * 2.2,
        alpha: 0.08 + depth * 0.22,
        color: COLORS[Math.floor(Math.random() * COLORS.length)]
      };
    });
  }

  start() {
    if (!this.ctx || this.raf) return;
    this._resize();
    window.addEventListener('resize', this._onResize);
    this._spawn();
    const step = () => {
      this.ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      for (const p of this.particles) {
        p.y += p.vy;
        if (p.y < -5) { p.y = window.innerHeight + 5; p.x = Math.random() * window.innerWidth; }
        this.ctx.globalAlpha = p.alpha;
        this.ctx.fillStyle = p.color;
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        this.ctx.fill();
      }
      this.ctx.globalAlpha = 1;
      this.raf = requestAnimationFrame(step);
    };
    this.raf = requestAnimationFrame(step);
  }

  stop() {
    if (this.raf) { cancelAnimationFrame(this.raf); this.raf = null; }
    window.removeEventListener('resize', this._onResize);
    if (this.ctx) this.ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  }
}

if (typeof module !== 'undefined' && module.exports) { module.exports = HeroField; }
else { window.HeroField = HeroField; }
```

- [ ] **Step 2: index.html changes**

Replace lines 14-17 (inside `#screen-landing`):

```html
      <h1 class="glow"><span class="boot-word">SUPERPOWER</span><br><span class="boot-word">ARCADE</span></h1>
      <p class="tagline">The Arcade Keeper has opened the vault.<br>Find your superpower.</p>
      <div class="boot-actions">
        <button id="btn-enter" class="btn btn-primary">INSERT COIN ▶</button>
        <button id="btn-quest-code" class="btn btn-ghost">🔑 Got a key from a friend?</button>
      </div>
```

(`#quest-entry` stays where it is, after the new `.boot-actions` div.)

Add script tags in the existing blocks — `js/core/HeroBootTimeline.js` after the `js/core/LostScore.js` line, `js/systems/HeroField.js` after the `js/systems/ParticleSystem.js` line.

- [ ] **Step 3: style.css changes**

Change line 15 `#app { width: min(680px, 94vw); padding: 24px; text-align: center; }` to:

```css
#app { width: min(680px, 94vw); padding: 24px; text-align: center; position: relative; z-index: 11; }
```

(`#particle-canvas` has `z-index: 10` — without this, HeroField paints OVER the text/buttons. `z-index: 11` guarantees content on top. Verified: nothing else in style.css sets a z-index on `#app` descendants.)

Append:

```css
/* ── v3 entrance hero (spec §3a) ── */
@keyframes bootWordIn { from { opacity: 0; transform: translateY(18px); filter: blur(6px); }
                        to   { opacity: 1; transform: none; filter: none; } }
@keyframes bootFadeUp { from { opacity: 0; transform: translateY(10px); }
                        to   { opacity: 1; transform: none; } }
body.boot-playing .boot-word        { opacity: 0; animation: bootWordIn 0.6s ease forwards; }
body.boot-playing .tagline          { opacity: 0; animation: bootFadeUp 0.45s ease forwards; }
body.boot-playing .boot-actions > * { opacity: 0; animation: bootFadeUp 0.35s ease forwards; }
@media (prefers-reduced-motion: reduce) {
  body.boot-playing .boot-word, body.boot-playing .tagline, body.boot-playing .boot-actions > * {
    animation-duration: 0.01s !important; animation-delay: 0s !important;
  }
}
```

(Animations only touch `opacity`/`transform`/`filter` — never `font-family`, so `.font-od` is untouched. Elements are visible by default; the animation classes only apply under `body.boot-playing`, so the resume path — which never adds that class — shows everything instantly.)

- [ ] **Step 4: app.js wiring**

Add near the top of the IIFE (after the `$` helper):

```js
  let heroField = null;

  function enterLandingWithBoot() {
    SPA.showScreen('screen-landing');
    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const T = window.HeroBootTimeline;
    const stages = T.applyReducedMotion(T.HERO_BOOT_STAGES, reduced);
    const targets = [
      ...document.querySelectorAll('#screen-landing .boot-word'),
      document.querySelector('#screen-landing .tagline'),
      ...document.querySelectorAll('#screen-landing .boot-actions > *')
    ];
    targets.forEach((el, i) => {
      const s = stages[i] || stages[stages.length - 1];
      el.style.animationDelay = `${s.delayMs}ms`;
      el.style.animationDuration = `${s.durationMs || 10}ms`;
    });
    document.body.classList.add('boot-playing');
    if (!reduced && window.HeroField) {
      heroField = heroField || new HeroField({ canvas: $('particle-canvas') });
      heroField.start();
    }
  }
```

In the DOMContentLoaded handler: change the `btn-enter` listener to stop the field —

```js
    $('btn-enter').addEventListener('click', () => {
      heroField?.stop();
      document.body.classList.remove('boot-playing');
      SPA.showScreen('screen-energy');
    });
```

— and replace both `SPA.showScreen('screen-landing')` calls (the `else` branch at the end, and inside the `btn-start-fresh` handler) with `enterLandingWithBoot();`.

- [ ] **Step 5: Run tests + manual verify**

`npm test` → all green (network scan passes: HeroField has no fetch/XHR).
Manual (serve + browser): cold load with cleared localStorage → words stagger in, tagline, then buttons; particles drift gently BEHIND text; clicking INSERT COIN at ~100ms works instantly; resume path (save a run, reload) shows screen-resume with NO boot animation; "Start fresh" replays the boot; devtools reduced-motion emulation → everything appears instantly, no particles; after INSERT COIN the RAF loop is gone (Performance panel).

- [ ] **Step 6: Commit**

```bash
git add js/systems/HeroField.js index.html style.css app.js
git commit -m "feat: cinematic entrance hero — staggered boot typography + ambient HeroField on the dead particle canvas"
```

---

### Task 6: SoundEngine — specs + engine with injectable AudioContext

> **✅ DONE 2026-07-17** (commit 3ce33a1): TDD red→green, 4 tests in `tests/sound_engine.test.js`; the stray `osc.connect(g).connect ? …` line was omitted per this task's own correction note.

**Files:**
- Create: `js/systems/SoundEngine.js`
- Test: `tests/sound_engine.test.js` (create)

**Interfaces:**
- Consumes: nothing.
- Produces (for Task 7): `window.SoundEngine` (class, also carries `SoundEngine.SOUND_SPECS` + `SoundEngine.totalDurationMs`). API: `new SoundEngine({ storage, contextFactory, prefersReduced })` — `storage` needs `getItem/setItem` (localStorage-shaped); `contextFactory` () → AudioContext-like (test seam; default real AudioContext). `unlock()` creates the context once (call on first user gesture). `play(moment, { pitchStep = 0 } = {})` — silent no-op when muted or not unlocked. `get muted` / `setMuted(bool)` — persists `'spa_muted'` = `'1'|'0'`. Moments: `'correct' | 'wrong' | 'coin' | 'streak' | 'chamber-complete' | 'vault-open' | 'fork'`.

- [ ] **Step 1: Write the failing tests**

Create `tests/sound_engine.test.js`:

```js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const SoundEngine = require('../js/systems/SoundEngine.js');

function memStorage(seed = {}) {
  const m = new Map(Object.entries(seed));
  return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) };
}

function fakeContext() {
  const created = [];
  return {
    created,
    currentTime: 0,
    destination: {},
    createOscillator() {
      const osc = { frequency: { value: 0 }, type: '', connect() { return this; }, start() {}, stop() {} };
      created.push(osc);
      return osc;
    },
    createGain() {
      return { gain: { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() { return this; } };
    }
  };
}

test('every game moment has a spec and none exceeds the 1.5s ceiling', () => {
  const moments = ['correct', 'wrong', 'coin', 'streak', 'chamber-complete', 'vault-open', 'fork'];
  for (const m of moments) {
    const spec = SoundEngine.SOUND_SPECS[m];
    assert.ok(spec && spec.notes.length >= 1, `missing spec for ${m}`);
    assert.ok(SoundEngine.totalDurationMs(spec) <= 1500, `${m} exceeds 1.5s`);
    for (const n of spec.notes) assert.ok(n.gain <= 0.1, `${m} louder than the 0.1 gain ceiling`);
  }
});

test('play schedules oscillators only when unlocked and unmuted', () => {
  const ctx = fakeContext();
  const e = new SoundEngine({ storage: memStorage(), contextFactory: () => ctx });
  e.play('correct');                       // not unlocked yet
  assert.equal(ctx.created.length, 0);
  e.unlock();
  e.play('correct');
  assert.ok(ctx.created.length >= 1, 'unlocked+unmuted must schedule');
  const before = ctx.created.length;
  e.setMuted(true);
  e.play('coin');
  assert.equal(ctx.created.length, before, 'muted must schedule nothing');
});

test('mute state persists and reduced-motion defaults to muted on first visit only', () => {
  const store = memStorage();
  const e = new SoundEngine({ storage: store, contextFactory: fakeContext, prefersReduced: false });
  e.setMuted(true);
  assert.equal(store.getItem('spa_muted'), '1');
  const e2 = new SoundEngine({ storage: store, contextFactory: fakeContext, prefersReduced: false });
  assert.equal(e2.muted, true, 'stored preference wins');
  const fresh = new SoundEngine({ storage: memStorage(), contextFactory: fakeContext, prefersReduced: true });
  assert.equal(fresh.muted, true, 'reduced-motion first visit defaults muted');
  const fresh2 = new SoundEngine({ storage: memStorage({ spa_muted: '0' }), contextFactory: fakeContext, prefersReduced: true });
  assert.equal(fresh2.muted, false, 'explicit opt-in beats reduced-motion default');
});

test('pitchStep raises frequency by semitones', () => {
  const ctx = fakeContext();
  const e = new SoundEngine({ storage: memStorage(), contextFactory: () => ctx });
  e.unlock();
  e.play('coin');
  const base = ctx.created[0].frequency.value;
  e.play('coin', { pitchStep: 12 });
  const octaveUp = ctx.created[SoundEngine.SOUND_SPECS.coin.notes.length].frequency.value;
  assert.ok(Math.abs(octaveUp - base * 2) < 1, `12 semitones should double freq: ${base} -> ${octaveUp}`);
});
```

- [ ] **Step 2: Run to verify fail** — `node --test tests/sound_engine.test.js` → FAIL (module not found).

- [ ] **Step 3: Implement `js/systems/SoundEngine.js`**

```js
/**
 * SoundEngine — native Web Audio synthesized arcade tones (spec §3b).
 * No Howler, no sample files, no dependencies. Short oscillator+envelope
 * chips only. Off until unlock() (first user gesture) — browser autoplay
 * policy treated as a feature: INSERT COIN is the audio unlock.
 */
const SOUND_SPECS = {
  'correct':          { notes: [{ freq: 660, durMs: 90, delayMs: 0, type: 'square', gain: 0.05 },
                                { freq: 880, durMs: 110, delayMs: 70, type: 'square', gain: 0.05 }] },
  'wrong':            { notes: [{ freq: 160, durMs: 180, delayMs: 0, type: 'sine', gain: 0.06 }] },
  'coin':             { notes: [{ freq: 990, durMs: 80, delayMs: 0, type: 'triangle', gain: 0.05 },
                                { freq: 1320, durMs: 120, delayMs: 60, type: 'triangle', gain: 0.05 }] },
  'streak':           { notes: [660, 830, 990, 1170].map((f, i) => ({ freq: f, durMs: 90, delayMs: i * 70, type: 'square', gain: 0.05 })) },
  'chamber-complete': { notes: [{ freq: 520, durMs: 160, delayMs: 0, type: 'sine', gain: 0.06 },
                                { freq: 780, durMs: 260, delayMs: 150, type: 'sine', gain: 0.06 }] },
  'vault-open':       { notes: [{ freq: 220, durMs: 900, delayMs: 0, type: 'sine', gain: 0.05 },
                                { freq: 330, durMs: 900, delayMs: 200, type: 'sine', gain: 0.04 },
                                { freq: 440, durMs: 700, delayMs: 400, type: 'sine', gain: 0.04 }] },
  'fork':             { notes: [{ freq: 440, durMs: 140, delayMs: 0, type: 'sine', gain: 0.04 }] }
};

const SEMITONE = Math.pow(2, 1 / 12);

class SoundEngine {
  constructor({ storage, contextFactory, prefersReduced = false } = {}) {
    this.storage = storage || window.localStorage;
    this.contextFactory = contextFactory ||
      (() => new (window.AudioContext || window.webkitAudioContext)());
    this.ctx = null;
    const stored = this.storage.getItem('spa_muted');
    this._muted = stored !== null ? stored === '1' : !!prefersReduced;
  }

  get muted() { return this._muted; }

  setMuted(m) {
    this._muted = !!m;
    this.storage.setItem('spa_muted', this._muted ? '1' : '0');
  }

  unlock() {
    if (!this.ctx) { try { this.ctx = this.contextFactory(); } catch { this.ctx = null; } }
  }

  play(moment, { pitchStep = 0 } = {}) {
    if (this._muted || !this.ctx) return;
    const spec = SOUND_SPECS[moment];
    if (!spec) return;
    const t0 = this.ctx.currentTime;
    for (const n of spec.notes) {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = n.type;
      osc.frequency.value = n.freq * Math.pow(SEMITONE, pitchStep);
      const start = t0 + n.delayMs / 1000;
      const end = start + n.durMs / 1000;
      g.gain.setValueAtTime(n.gain, start);
      g.gain.exponentialRampToValueAtTime(0.0001, end);
      osc.connect(g).connect ? osc.connect(g) && g.connect(this.ctx.destination) : null;
      osc.connect(g);
      g.connect(this.ctx.destination);
      osc.start(start);
      osc.stop(end + 0.02);
    }
  }

  static totalDurationMs(spec) {
    return Math.max(...spec.notes.map(n => n.delayMs + n.durMs));
  }
}

SoundEngine.SOUND_SPECS = SOUND_SPECS;

if (typeof module !== 'undefined' && module.exports) { module.exports = SoundEngine; }
else { window.SoundEngine = SoundEngine; }
```

**Correction while implementing:** delete the stray line `osc.connect(g).connect ? ... : null;` from the block above — the two clean lines below it (`osc.connect(g); g.connect(this.ctx.destination);`) are the wiring. (Left here so the implementer doesn't reintroduce it from the snippet.)

- [ ] **Step 4: Run to verify pass** — `node --test tests/sound_engine.test.js` → PASS; `npm test` → no regressions (SoundEngine has no fetch/XHR, scan stays green).

- [ ] **Step 5: Commit**

```bash
git add js/systems/SoundEngine.js tests/sound_engine.test.js
git commit -m "feat: SoundEngine — synthesized Web Audio arcade tones, injectable context, persisted mute"
```

---

### Task 7: Sound wiring — mute button, unlock, game moments

> **✅ DONE 2026-07-17** (commit feca67c). `reward.type === 'gold'` verified against DopamineDJ before wiring. Browser-verified: locked→unlocked AudioContext on INSERT COIN (state "running"), mute toggle + localStorage persistence across reload, live round with zero console errors. Suite baseline: **95** green.

**Files:**
- Modify: `index.html` (HUD mute button + script tag), `style.css` (mute button style), `app.js` (engine instance + play calls), `js/games/vaultDoor.js` (one line)

**Interfaces:**
- Consumes: `SoundEngine` exactly as produced by Task 6.
- Produces: `SPA.sound` (a SoundEngine instance) available to game adapters via `ctx.sound(moment, opts)`.

- [ ] **Step 1: index.html**

Add `<script src="js/systems/SoundEngine.js"></script>` after the HeroField tag. In the HUD (`index.html:35-39`), add a mute button:

```html
      <div class="hud">
        <span id="hud-icon"></span>
        <span id="hud-timer"></span>
        <span id="hud-coins">🪙 0</span>
        <button id="btn-mute" class="hud-mute" title="Sound on/off">🔊</button>
      </div>
```

- [ ] **Step 2: style.css** — append:

```css
.hud-mute { background: none; border: none; cursor: pointer; font-size: 1.1rem; opacity: .6; padding: 2px 6px; }
.hud-mute:hover { opacity: 1; }
```

- [ ] **Step 3: app.js wiring**

In the DOMContentLoaded handler, before the button listeners:

```js
    SPA.sound = new SoundEngine({
      storage: window.localStorage,
      prefersReduced: window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    });
    const muteBtn = $('btn-mute');
    const renderMute = () => { muteBtn.textContent = SPA.sound.muted ? '🔇' : '🔊'; };
    renderMute();
    muteBtn.addEventListener('click', () => { SPA.sound.setMuted(!SPA.sound.muted); renderMute(); });
```

Unlock on every entry gesture (all are real user clicks): inside the `btn-enter` listener, each `.btn-energy` listener, and the `btn-resume` listener, add `SPA.sound.unlock();` as the first line.

Play calls:
- In `ctx.onRound` (app.js:61): after the streak update, add `SPA.sound.play(correct ? 'correct' : 'wrong');`
- In the coin-drop branch (`if (reward.drop)`): add `SPA.sound.play('coin', { pitchStep: Math.min(SPA.state.streak, 12) });` and, when `reward.type === 'gold'`, also `SPA.sound.play('streak');`
- In `finishChamber` (inside the `setTimeout`, before `afterChamber(index)`): `SPA.sound.play('chamber-complete');`
- In `showFork`, first line after `SPA.showScreen('screen-fork')`: `SPA.sound.play('fork');`
- In `runChamber`'s ctx object, add: `sound: (m, o) => SPA.sound?.play(m, o),`

- [ ] **Step 4: vaultDoor.js** — in the success branch (`js/games/vaultDoor.js`, right after `ctx.feedback('VAULT OPENED', 'success');`), add:

```js
          ctx.sound?.('vault-open');
```

- [ ] **Step 5: Run tests + manual verify**

`npm test` → green. Manual: serve, load with sound ON → silence on the landing screen (locked); after INSERT COIN, correct/wrong tones in chamber 1, coin chime pitch rises with streak, fork tone on fork screens, two-note resolve between chambers, swell if you solve the boss. Mute persists across reload. Reduced-motion emulation + cleared storage → starts muted.

- [ ] **Step 6: Commit**

```bash
git add index.html style.css app.js js/games/vaultDoor.js
git commit -m "feat: wire arcade sound — mute HUD toggle, gesture unlock, tones on answers/coins/forks/chambers/boss"
```

---

### Task 8: Chamber interstitials — meta module + skippable card

**Files:**
- Create: `js/core/InterstitialCard.js`
- Modify: `index.html` (screen + script tag), `style.css`, `app.js`
- Test: `tests/interstitial_card.test.js` (create)

**Interfaces:**
- Consumes: `SPA.CHAMBERS` ids (`'pattern-blitz','color-cascade','number-rush','word-vault','scramble','vault-door'`).
- Produces: `window.InterstitialCard` = `{ CHAMBER_META, cardFor(gameId) -> { icon, name }, INTERSTITIAL_MS }`.

- [ ] **Step 1: Write the failing tests**

Create `tests/interstitial_card.test.js`:

```js
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
```

- [ ] **Step 2: Run to verify fail** — `node --test tests/interstitial_card.test.js` → FAIL.

- [ ] **Step 3: Implement `js/core/InterstitialCard.js`**

```js
/**
 * InterstitialCard — chamber-name beat between chambers (spec §3c).
 * Pure data; app.js owns the DOM/timing orchestration.
 */
const CHAMBER_META = {
  'pattern-blitz': { icon: '⚡', name: 'PATTERN BLITZ' },
  'color-cascade': { icon: '🌈', name: 'COLOR CASCADE' },
  'number-rush':   { icon: '🔢', name: 'NUMBER RUSH' },
  'word-vault':    { icon: '📖', name: 'WORD VAULT' },
  'scramble':      { icon: '🎒', name: 'THE SCRAMBLE' },
  'vault-door':    { icon: '🚪', name: 'THE VAULT DOOR' }
};

function cardFor(gameId) {
  return CHAMBER_META[gameId] || { icon: '🕹️', name: String(gameId).toUpperCase() };
}

const INTERSTITIAL_MS = 1000;

const InterstitialCard = { CHAMBER_META, cardFor, INTERSTITIAL_MS };

if (typeof module !== 'undefined' && module.exports) { module.exports = InterstitialCard; }
else { window.InterstitialCard = InterstitialCard; }
```

- [ ] **Step 4: Run to verify pass** — `node --test tests/interstitial_card.test.js` → PASS.

- [ ] **Step 5: index.html** — add screen (after `#screen-energy`, before `#screen-game`):

```html
    <section id="screen-interstitial" class="screen hidden">
      <div class="interstitial-card">
        <div id="interstitial-icon" class="interstitial-icon"></div>
        <h2 id="interstitial-name" class="glow"></h2>
        <p class="small">tap to skip</p>
      </div>
    </section>
```

Add `<script src="js/core/InterstitialCard.js"></script>` after the HeroBootTimeline tag.

- [ ] **Step 6: style.css** — append:

```css
/* ── v3 chamber interstitial (spec §3c) ── */
.interstitial-icon { font-size: 4rem; margin-bottom: 12px; animation: bootFadeUp .3s ease; }
.interstitial-card h2 { animation: bootFadeUp .35s ease; }
@media (prefers-reduced-motion: reduce) {
  .interstitial-icon, .interstitial-card h2 { animation: none; }
}
```

- [ ] **Step 7: app.js orchestration**

Add after `enterLandingWithBoot`:

```js
  function showInterstitial(gameId, onDone) {
    // Deliberate deviation from spec wording "mounts behind the card": chambers
    // start per-round timers on mount, so mounting behind would eat play time.
    // Mounting is synchronous, so dismiss -> playable is still instant.
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return onDone();
    const meta = window.InterstitialCard.cardFor(gameId);
    SPA.showScreen('screen-interstitial');
    $('interstitial-icon').textContent = meta.icon;
    $('interstitial-name').textContent = meta.name;
    let done = false;
    const el = $('screen-interstitial');
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(t);
      el.removeEventListener('click', finish);
      document.removeEventListener('keydown', finish);
      onDone();
    };
    const t = setTimeout(finish, window.InterstitialCard.INTERSTITIAL_MS);
    el.addEventListener('click', finish);
    document.addEventListener('keydown', finish);
  }
```

Route chamber entries through it:
- In `nextForkOrChamber`, change `if (nextIndex < SPA.CHAMBERS.length) return runChamber(nextIndex);` to `if (nextIndex < SPA.CHAMBERS.length) return showInterstitial(SPA.CHAMBERS[nextIndex], () => runChamber(nextIndex));`
- In the `.btn-energy` listeners, change `runChamber(0);` to `showInterstitial(SPA.CHAMBERS[0], () => runChamber(0));`

- [ ] **Step 8: Run tests + manual verify** — `npm test` green. Manual: card appears (~1s) before every chamber including the first and after resume; click and keypress both skip instantly; reduced-motion skips entirely; timers inside chambers don't start until the card is gone.

- [ ] **Step 9: Commit**

```bash
git add js/core/InterstitialCard.js tests/interstitial_card.test.js index.html style.css app.js
git commit -m "feat: skippable chamber interstitial cards — pacing beat between chambers"
```

---

### Task 9: Wallet — unified coin/streak core module

**Files:**
- Create: `js/core/Wallet.js`
- Test: `tests/wallet.test.js` (create)

**Interfaces:**
- Consumes: nothing.
- Produces (for Task 10): `window.Wallet` — `class Wallet { constructor({ coins = 0, streak = 0 } = {}); get coins; get streak; setCoins(n); addCoins(n); spendCoins(n) -> boolean; recordAnswer(correct) -> { streak }; toJSON() -> { coins, streak }; static fromJSON(json) -> Wallet }`. Coins clamp at ≥ 0. `recordAnswer(true)` increments streak; `recordAnswer(false)` resets it to 0.

- [ ] **Step 1: Write the failing tests**

Create `tests/wallet.test.js`:

```js
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
```

- [ ] **Step 2: Run to verify fail** — `node --test tests/wallet.test.js` → FAIL.

- [ ] **Step 3: Implement `js/core/Wallet.js`**

```js
/**
 * Wallet — THE single source of truth for in-run coins + streak (spec §3d).
 * Replaces the fragmented trio: SPA.state.coins / SPA.state.streak /
 * BROskiWallet.balance (that file is a dormant unloaded web3 scaffold).
 * Pure logic; app.js renders it into the HUD.
 */
class Wallet {
  constructor({ coins = 0, streak = 0 } = {}) {
    this._coins = Math.max(0, coins);
    this._streak = Math.max(0, streak);
  }

  get coins() { return this._coins; }
  get streak() { return this._streak; }

  setCoins(n) { this._coins = Math.max(0, n); }
  addCoins(n) { if (n > 0) this._coins += n; }

  spendCoins(n) {
    if (n > 0 && this._coins >= n) { this._coins -= n; return true; }
    return false;
  }

  recordAnswer(correct) {
    this._streak = correct ? this._streak + 1 : 0;
    return { streak: this._streak };
  }

  toJSON() { return { coins: this._coins, streak: this._streak }; }

  static fromJSON(json) { return new Wallet(json || {}); }
}

if (typeof module !== 'undefined' && module.exports) { module.exports = Wallet; }
else { window.Wallet = Wallet; }
```

- [ ] **Step 4: Run to verify pass** — `node --test tests/wallet.test.js` → PASS; `npm test` → no regressions.

- [ ] **Step 5: Commit**

```bash
git add js/core/Wallet.js tests/wallet.test.js
git commit -m "feat: Wallet — unified coin/streak source of truth"
```

---

### Task 10: Wallet wiring + momentum HUD

**Files:**
- Modify: `index.html` (script tag + HUD streak span), `style.css` (streak + pulse), `app.js` (swap coins/streak to Wallet)

**Interfaces:**
- Consumes: `Wallet` exactly as produced by Task 9; existing `persistRun`/resume shape in app.js; `buildRunPayload({ ..., broskiCoins })` (`js/core/runPayload.js`).
- Produces: `SPA.state.wallet` (Wallet instance). Saved-run payload gains `wallet: { coins, streak }` while KEEPING the legacy top-level `coins`/`streak` keys (older saves must still resume).

- [ ] **Step 1: index.html** — add `<script src="js/core/Wallet.js"></script>` after the InterstitialCard tag. In the HUD, add a streak span before the coins:

```html
        <span id="hud-streak" class="hud-streak"></span>
        <span id="hud-coins">🪙 0</span>
```

- [ ] **Step 2: style.css** — append:

```css
/* ── v3 momentum HUD (spec §3d) ── */
.hud-streak { color: var(--neon-orange); font-variant-numeric: tabular-nums; min-width: 3ch; }
@keyframes coinPulse { 0% { transform: scale(1); } 40% { transform: scale(1.25); } 100% { transform: scale(1); } }
#hud-coins.pulse { animation: coinPulse .35s ease; display: inline-block; }
@media (prefers-reduced-motion: reduce) { #hud-coins.pulse { animation: none; } }
```

- [ ] **Step 3: app.js — swap to Wallet**

1. `newRunState()`: replace `coins: 0, streak: 0,` with `wallet: new Wallet(),`.
2. Replace `setCoins` with a wallet renderer:

```js
  function setCoins(n) {
    SPA.state.wallet.setCoins(n);
    renderWallet(true);
  }

  function renderWallet(pulse) {
    const w = SPA.state.wallet;
    $('hud-coins').textContent = `🪙 ${w.coins}`;
    $('hud-streak').textContent = w.streak >= 2 ? `🔥${w.streak}` : '';
    if (pulse) {
      const el = $('hud-coins');
      el.classList.remove('pulse');
      void el.offsetWidth; // restart the animation
      el.classList.add('pulse');
    }
  }
```

3. Every former `SPA.state.coins` read/write goes through the wallet:
   - `runChamber`: `setCoins(SPA.state.coins)` → `renderWallet(false);`
   - `ctx.onRound`: `SPA.state.streak = correct ? SPA.state.streak + 1 : 0;` → `const { streak } = SPA.state.wallet.recordAnswer(correct); renderWallet(false);` and the two later uses of `SPA.state.streak` in this function become `streak` (the DJ call: `SPA.state.dj.processResponse(correct, ms, streak)`; the sound pitch call from Task 7: `pitchStep: Math.min(streak, 12)`).
   - coin drop: `setCoins(SPA.state.coins + reward.amount)` → `SPA.state.wallet.addCoins(reward.amount); renderWallet(true);`
   - `ctx.grantCoins`: `(n) => { SPA.state.wallet.addCoins(n); renderWallet(true); }`
   - `showFork` grants/costs: `if (res.grantsCoins) { SPA.state.wallet.addCoins(res.grantsCoins); renderWallet(true); } if (res.costsCoins) { SPA.state.wallet.spendCoins(res.costsCoins); renderWallet(true); }`
   - `sendRun`: `broskiCoins: SPA.state.coins` → `broskiCoins: SPA.state.wallet.coins`
4. `persistRun`: replace `coins: SPA.state.coins, streak: SPA.state.streak,` with:

```js
      wallet: SPA.state.wallet.toJSON(),
      coins: SPA.state.wallet.coins,   // legacy keys kept so pre-v3 saves and
      streak: SPA.state.wallet.streak, // any external readers stay valid
```

5. Resume handler (`btn-resume`): replace `setCoins(savedRun.coins); SPA.state.streak = savedRun.streak;` with:

```js
        SPA.state.wallet = Wallet.fromJSON(savedRun.wallet || { coins: savedRun.coins, streak: savedRun.streak });
        renderWallet(false);
```

- [ ] **Step 4: Run tests + manual verify**

`npm test` → green (nothing outside app.js referenced `SPA.state.coins` — grep to confirm: `grep -rn "state.coins\|state.streak" js/ app.js` should return only the new wallet-backed lines in app.js).
Manual: full run — coins pulse on every gain, 🔥N appears from streak 2 and resets on a miss, fork coin costs/grants reflect instantly, save mid-run → reload → resume restores exact coins+streak, share lands the right `broski_coins` (check the network request body), and an OLD-format save (edit localStorage `spa_saved_run`, delete the `wallet` key) still resumes correctly.

- [ ] **Step 5: Commit**

```bash
git add index.html style.css app.js
git commit -m "feat: unified Wallet drives the HUD — visible streak momentum, coin pulse, back-compat save/resume"
```

---

### Task 11: Docs, final regression, DoD run

**Files:**
- Modify: `README.md`, `docs/README.md`, `tests/e2e.test.js` (only if any structural gap emerged)

**Interfaces:**
- Consumes: everything.

- [ ] **Step 1: README updates**

- "What is this?" bullet list: no change needed (chambers count already fixed in the docs pass).
- Add a `## v3 — The Polish Pack` section after the v2 section, mirroring its style:

```markdown
## v3 — The Polish Pack

No new chambers — v3 makes the existing six feel premium and repairs four defects:

| Change | What it does |
|---|---|
| **Zero third-party requests** | three.js vendored locally; dead Howler/ethers/supabase-js CDN tags removed — enforced by a regression test |
| **Real OpenDyslexic** | the Word Vault font toggle now loads the actual (self-hosted, OFL) font |
| **Keeper dashboard rebuilt** | the truncated admin/dashboard.js is whole again — login, evidence cards, ND-friendly invite drafting; access is local-only by design |
| **Entrance boot sequence** | staggered wordmark + ambient particle field; INSERT COIN never gated; skipped on resume and under reduced-motion |
| **Sound** | synthesized Web Audio chips (no libraries, no samples) — answers, coins (pitch rises with streak), forks, chamber resolves, boss swell; mute persists; defaults muted for reduced-motion users |
| **Interstitials** | ~1s skippable chamber-name cards between chambers |
| **Unified wallet + momentum** | one coin/streak source of truth; 🔥 streak meter + coin pulse in the HUD; back-compatible with pre-v3 saves |
```

- Tests table: add rows for `tests/hero_boot_timeline.test.js`, `tests/sound_engine.test.js`, `tests/interstitial_card.test.js`, `tests/wallet.test.js`.
- Repo structure: add `fonts/` and `vendor/` lines.

- [ ] **Step 2: docs/README.md** — flip the v3 spec row's status to `Shipped — see plans/2026-07-17-v3-polish-pack.md` and add the plan link to the Plan column.

- [ ] **Step 3: Full regression** — `npm test` → expect ~86+ passing (75 baseline + new suites), 0 failures.

- [ ] **Step 4: Manual DoD run (spec §6)** — on a served build, fresh browser profile:

1. Cold load → boot sequence plays; immediately reload and click INSERT COIN within ~200ms → no breakage.
2. Sound arrives only after that click; mute → reload → still muted.
3. Reduced-motion emulation, cleared storage → instant landing (no stagger/particles), sound defaults muted, interstitials skipped.
4. Full 6-chamber run: interstitial card before each chamber (click skips), tones on answers/coins/forks, 🔥 meter grows and resets, coins pulse.
5. Word Vault → word mode → OpenDyslexic toggle shows real OpenDyslexic glyphs.
6. Boss → solve or abandon → reveal → share → confirm the POST body's `broski_coins` matches the HUD.
7. Quit mid-run, reopen → resume screen (no boot sequence) → wallet state exact.
8. Devtools Network across the whole session: zero third-party requests.
9. `localhost/admin/dashboard.html` → login with real key → runs render, invite drafts, copy works.

- [ ] **Step 5: Commit + push + PR**

```bash
git add README.md docs/README.md
git commit -m "docs: v3 Polish Pack — README section, tests table, docs index status"
git push -u origin feat/v3-polish-pack
gh pr create --title "v3 — The Polish Pack" --body "Four verified repairs + entrance hero + native Web Audio sound + interstitials + unified wallet/momentum HUD. Spec: docs/superpowers/specs/2026-07-17-v3-polish-pack-design.md"
```

---

## Self-Review (completed)

- **Spec coverage:** §2a CDN purge → Task 1 (expanded: spec found 1 dead CDN tag, repo actually has 4 — three.js is a real dependency of the vault boss so it's vendored, not deleted); §2b font → Task 2; §2c Keeper access docs → Task 3 Step 5; §2d dashboard → Task 3 (expanded: file is truncated and crashes on `SPA_CONFIG` — full rebuild, plus the `<li` render bug and dashboard.html's mangled label, both verified); §3a hero → Tasks 4-5; §3b sound → Tasks 6-7 (moment table fully mapped; low-stim default, mute persistence, gesture unlock all in); §3c interstitials → Task 8 (one flagged deviation: card shows before mount, not over it — per-round chamber timers start on mount, so mounting behind would eat play time; dismiss→playable stays instant because mount is synchronous); §3d wallet → Tasks 9-10 (web3 dormant: ethers tag removed T1, BROskiWallet unloaded + notice, local half replaced by js/core/Wallet.js); §5 testing → structural locks in T1/T2/T3, pure-logic suites in T4/T6/T8/T9; §6 DoD → Task 11 Step 4 walks it verbatim.
- **Placeholder scan:** clean — every code step has complete code; the one snippet defect (stray line in SoundEngine `play`) is explicitly flagged with its correction inline.
- **Type consistency:** `HeroBootTimeline.{HERO_BOOT_STAGES, applyReducedMotion}` consistent T4→T5; `SoundEngine` constructor options `{storage, contextFactory, prefersReduced}` and `play(moment, {pitchStep})` consistent T6→T7; `InterstitialCard.{cardFor, INTERSTITIAL_MS}` consistent T8 module→wiring; `Wallet` API (`coins/streak` getters, `setCoins/addCoins/spendCoins/recordAnswer/toJSON/fromJSON`) consistent T9→T10; `ctx.sound` produced in T7 and consumed by vaultDoor.js in the same task.
