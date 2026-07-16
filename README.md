# SUPERPOWER-ARCADE

> An arcade-style neurodivergent strengths-based assessment game with a hidden hiring signal.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/welshDog/SUPERPOWER-ARCADE)

---

## What is this?

SUPERPOWER ARCADE is a browser-based game with three invisible layers:

1. **Fun arcade** — four skill chambers that feel like games
2. **ND strengths profiler** — quietly maps pattern recognition, rhythm, number sense, and persistence to three archetypes
3. **Ethics fork** — players choose whether to share their signal; consent is always explicit

The Keeper (you) sees an evidence-first dashboard. Players never see a diagnosis.

---

## Archetypes

| Archetype | Core strength |
|---|---|
| `PATTERN_SEEKER` | Visual pattern recognition, sequential logic |
| `VOLT_RANGER` | Numerical fluency, rapid calculation |
| `SYNC_WEAVER` | Rhythm, timing, cross-modal coordination |

---

## Chambers

| Chamber | File | Signal measured |
|---|---|---|
| PatternBlitz | `js/chambers/PatternBlitz.js` | Pattern recognition speed + accuracy |
| ColorCascade | `js/chambers/ColorCascade.js` | Rhythm, timing, colour-sequence memory |
| NumberRush | `js/chambers/NumberRush.js` | Mental arithmetic fluency |
| VaultDoor (boss) | `js/chambers/VaultDoor.js` | Persistence, combo-lock solving |

---

## v2 — The Deep Vault Update

Three new moments deepen the joiner-test signal, plus save-and-resume so a run survives a closed tab:

| Moment | What it does |
|---|---|
| **Word Vault** (dual-mode) | Verbal chamber offering Word or Symbol mode; the mode picked is itself a signal, alongside within-mode accuracy |
| **Lost Score** (ethics test) | After the Word Vault, the player self-reports their score from memory; honest reports (±10%) pass silently, inflated reports trigger a one-time repair offer — never a penalty, never a public callout |
| **The Scramble** | A chaos-to-plan chamber themed as a self-contained cue (no external hints); any picks let the player continue |

**Save-and-resume:** progress is checkpointed to `localStorage` after every chamber, fork, and Lost Score report. Closing the tab and reopening shows a resume screen; continuing restores the DifficultyDial, DopamineDJ wallet/streak state, coin count, and any pending fork (e.g. a queued repair offer) exactly where the run left off, then advances to the next chamber rather than replaying the one already finished.

**Schema drift fix carried in this branch:** `supabase/schema.sql` needs to be re-run against your Supabase project — the RPC the client calls was renamed (`validate_quest_code` → `redeem_quest_code`) and `shared_runs`/`quest_codes` gained columns (`player_name`, `contact`, `invitee_name`, `message`) to match what `js/core/api.js` actually sends. See the schema-drift fix commit for the full column/RPC diff. Existing deployments will see quest-code redemption and share submission fail with a schema-mismatch error until the updated `schema.sql` is applied.

**Privacy promise, unchanged:** sharing is still consent-led — nothing leaves the device until the player taps send on the share screen ("Keep it to myself" sends nothing, ever). `js/core/api.js` remains the *only* file in `js/` or `data/` permitted to call `fetch`/`XMLHttpRequest`; this is enforced by an automated regression test (`tests/e2e.test.js`) that statically scans both trees on every test run.

---

## Quick Start (local)

```bash
# 1. Clone
git clone https://github.com/welshDog/SUPERPOWER-ARCADE.git
cd SUPERPOWER-ARCADE

# 2. Install
npm install

# 3. Set environment variables (see below)
cp .env.example .env.local
# edit .env.local

# 4. Run tests
npm test

# 5. Serve locally
npx serve .
```

---

## Environment Variables

Create a `.env.local` file (never commit this):

```env
# Supabase — public project URL and anon key (safe to expose in browser)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Supabase service role key — NEVER expose this in the browser
# Used ONLY in server-side / admin dashboard routes
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Quest code seed (used during Supabase seeding)
QUEST_CODE_SEED=BOLT-RISING
```

> **Security note:** `SUPABASE_SERVICE_ROLE_KEY` must only exist in your Vercel environment under "Server" scope. It is blocked from browser bundles via `vercel.json` headers and Supabase RLS.

---

## Vercel Deployment

### One-click

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/welshDog/SUPERPOWER-ARCADE)

### Manual

```bash
npm i -g vercel
vercel --prod
```

### Environment variables to set in Vercel dashboard

| Variable | Scope |
|---|---|
| `VITE_SUPABASE_URL` | All |
| `VITE_SUPABASE_ANON_KEY` | All |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server only** (never Preview/Browser) |

---

## Supabase Setup

1. Create a new Supabase project
2. Run the schema:

```bash
# Via Supabase CLI
supabase db push --file supabase/schema.sql

# Or paste supabase/schema.sql into the Supabase SQL editor
```

3. The schema creates:
 - `shared_runs` — stores player run payloads (no PII)
 - `quest_codes` — stores valid invite codes
 - `validate_quest_code(p_code text)` — RPC (SECURITY DEFINER)
 - RLS policies — anon insert only; select requires service_role

4. Seed the initial quest code:

```sql
INSERT INTO quest_codes (code, label, active) VALUES ('BOLT-RISING', 'Launch cohort', true);
```

---

## Admin / Keeper Dashboard

Access: `https://your-deployment.vercel.app/admin/`

- Protected by `vercel.json` — `/admin/*` returns 403 to public traffic (configure IP allowlist or auth at Vercel edge)
- Uses `SUPABASE_SERVICE_ROLE_KEY` to read all shared runs
- Displays evidence-first signals: archetype, chamber scores, ethics choice
- Generates ND-friendly outreach copy per player

---

## Tests

```bash
npm test
```

| File | Coverage |
|---|---|
| `tests/chambers.test.js` | 12 tests across all 4 chambers |
| `tests/e2e.test.js` | quest gate, PII guard, full run loop, Keeper read, DifficultyDial, v2 flow integration (repair window + resume), chamber script-loading regression, network-isolation privacy regression |
| `tests/agents.test.js` | DifficultyDial, DopamineDJ, ParticleSystem |
| `tests/fork_flow.test.js` | ForkFlow + repair injection |
| `tests/profile_mapper.test.js` | Archetype mapping + evidence notes |
| `tests/run_payload.test.js` | Payload builder + Supabase REST |
| `tests/signal_tracker.test.js` | SignalTracker event log |
| `tests/api.test.js` | Supabase REST client (injectable fetch) |

---

## Repo Structure

```
SUPERPOWER-ARCADE/
├── admin/              # Keeper dashboard (HTML + JS)
├── data/               # Forks data, profile seeds
├── docs/               # Specs and design docs
├── js/
│   ├── chambers/       # PatternBlitz, ColorCascade, NumberRush, VaultDoor
│   └── *.js            # Core engine: DifficultyDial, DopamineDJ, ParticleSystem, etc.
├── supabase/
│   └── schema.sql      # Full DB schema + RLS + RPC
├── tests/              # All test files
├── app.js              # App entry point
├── index.html          # Shell HTML
├── style.css           # Global styles
└── vercel.json         # Deployment config (SPA routing, security headers, admin block)
```

---

## Ethics & Privacy

- No PII is ever stored in `shared_runs` — email, name, and IP are stripped before insert
- Players explicitly choose to share their signal via an ethics fork
- Archetypes describe strengths, never diagnoses
- The Keeper dashboard is private by default; access is blocked at the Vercel edge
- No third-party analytics or tracking scripts

---

## License

MIT — see [LICENSE](LICENSE)
