# SUPERPOWER-ARCADE

> An arcade-style neurodivergent strengths-based assessment game with a hidden hiring signal.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/welshDog/SUPERPOWER-ARCADE)

---

## What is this?

SUPERPOWER ARCADE is a browser-based game with three invisible layers:

1. **Fun arcade** — six skill chambers plus a boss door that feel like games
2. **ND strengths profiler** — quietly maps pattern recognition, rhythm, number sense, and persistence to three archetypes
3. **Ethics fork** — players choose whether to share their signal; consent is always explicit

The Keeper (you) sees an evidence-first dashboard. Players never see a diagnosis.

---

## Archetypes

| Archetype | Core strength |
|---|---|
| `hyperfocus_hunter` — ⚡ Hyperfocus Hunter | Speed, momentum, relentless retries |
| `pattern_detective` — 🔍 Pattern Detective | Precision, spotting what everyone else misses |
| `systems_architect` — 🧩 Systems Architect | Sequencing, holding the whole structure in mind |
| `chaos_creator` — 🎨 Chaos Creator | Experimentation, finding the door nobody else saw |
| `wild_card` — 🌀 Wild Card | Balanced across all four — awarded when no single strength dominates |

Archetype ids, names, and blurbs live in `data/profiles.js`; the mapping logic (including the `wild_card` rule: top score < 40 or a lead of < 10 over second place) is in `js/core/profileMapper.js`.

---

## Chambers

| Chamber | File | Signal measured |
|---|---|---|
| PatternBlitz | `js/chambers/PatternBlitz.js` | Pattern recognition speed + accuracy |
| ColorCascade | `js/chambers/ColorCascade.js` | Rhythm, timing, colour-sequence memory |
| NumberRush | `js/chambers/NumberRush.js` | Mental arithmetic fluency |
| Word Vault (v2) | `js/chambers/WordVault.js` | Verbal reasoning; dual-mode choice (Word/Symbol) is itself a signal |
| The Scramble (v2) | `js/chambers/Scramble.js` | Chaos-to-plan under a self-contained visual cue, no external hints |
| VaultDoor (boss) | `js/chambers/VaultDoor.js` | Persistence, combo-lock solving; has an abandon path after 5 attempts |

Each chamber's game logic (`js/chambers/*.js`) is pure and unit-tested; its DOM/canvas mount adapter lives separately in `js/games/*.js` (e.g. `WordVault.js` ↔ `wordVault.js`) so the testable logic never touches the browser.

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

There's no build step and no npm dependencies — `package.json` only defines the test script. Everything runs as-is.

```bash
# 1. Clone
git clone https://github.com/welshDog/SUPERPOWER-ARCADE.git
cd SUPERPOWER-ARCADE

# 2. Point the client at your Supabase project (see Environment Config below)
# edit js/config.js

# 3. Run tests
npm test

# 4. Serve locally
npx serve .
```

---

## Environment Config

This is a static, zero-build site — there's no bundler to inject env vars into browser code, so client config is a plain committed file rather than a `.env`:

**`js/config.js`** (committed — holds only the anon key, which is safe to expose client-side):
```js
window.SPA_CONFIG = {
  SUPABASE_URL: 'https://your-project.supabase.co',
  SUPABASE_ANON_KEY: 'your-anon-key'
};
```

The admin dashboard (`admin/dashboard.js`) is the one place that needs the **service role** key — it's entered by the Keeper at runtime in the dashboard's own UI (a password-style field, `format: SUPABASE_URL::SERVICE_ROLE_KEY`), never committed or hardcoded anywhere. Never put the service role key in `js/config.js` or any other file that ships to the browser by default.

> If you're deploying via Vercel's Supabase integration, it may populate a `.env`/`.env.local` with `NEXT_PUBLIC_SUPABASE_*`/`POSTGRES_*` vars — those aren't read by this app (no build step consumes them) and can be ignored; `js/config.js` is the only thing that matters for the client.

---

## Vercel Deployment

### One-click

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/welshDog/SUPERPOWER-ARCADE)

### Manual

```bash
npm i -g vercel
vercel --prod
```

### Environment variables

None required. This is a static site with no serverless functions — `js/config.js` (committed, holds only the public anon key) is the entire client config, and the admin dashboard's service-role key is entered by hand in its own UI at runtime (never stored in Vercel env vars or any file).

---

## Supabase Setup

1. Create a new Supabase project
2. Point `js/config.js` at it (`SUPABASE_URL` + anon key, from your project's API settings)
3. Apply the schema:

```bash
# Via Supabase CLI, against a linked project
supabase link --project-ref your-project-ref
supabase db query --file supabase/schema.sql --linked

# Or paste supabase/schema.sql into the Supabase SQL editor
```

   > `supabase db push` is for migration files under `supabase/migrations/`, which this repo doesn't use — `db query --file` runs a plain `.sql` file directly. If a table already exists from an earlier version of the schema, `create table if not exists` won't add new columns to it — check `information_schema.columns` against `schema.sql` and add any missing `alter table ... add column if not exists` by hand (see the v2 schema-drift fix above for the pattern).

4. The schema creates:
   - `shared_runs` — stores player run payloads (no PII — email/name are the player's own contact info they explicitly submitted, not tracked identifiers)
   - `quest_codes` — stores valid invite codes (`invitee_name`, `message` shown to the player on redemption)
   - `public.redeem_quest_code(p_code text)` — RPC (`SECURITY DEFINER`), returns `invitee_name`/`message` and increments `used_count`
   - RLS: `shared_runs` allows anon insert only (`insert_only` policy, `with check (true)`); `quest_codes` has no anon policies at all — reachable only through the RPC; `keeper_runs` (a view over `shared_runs`) is `service_role`-only for the dashboard

5. Seed the launch quest code:

```sql
insert into public.quest_codes (code, label, invitee_name, message, active)
values ('BOLT-RISING', 'Launch cohort', 'Evan', 'The Keeper is expecting you.', true)
on conflict (code) do nothing;
```

---

## Admin / Keeper Dashboard

Access — **local only, by design**. Prod `/admin/*` is blocked for *everyone* (including the Keeper) by `vercel.json`'s route rule (`/admin/*` → 404), with no bypass: real auth would need server-side middleware this static architecture doesn't have, and a half-secure workaround (secret query param, obscure path) would be worse than an honest "run it locally." The dashboard is a static page that talks straight to Supabase, so it works identically from your machine:

```bash
npx serve .
# then open http://localhost:3000/admin/dashboard.html
# and paste  SUPABASE_URL::SERVICE_ROLE_KEY  at the login prompt
```

- `admin/dashboard.js` prompts for `SUPABASE_URL::SERVICE_ROLE_KEY` at runtime (never hardcoded, never persisted) to read `keeper_runs`
- Displays evidence-first signals: archetype, chamber scores, ethics choice, all the descriptive (never interpretive) evidence strings from `js/core/profileMapper.js`
- Generates ND-friendly outreach copy per player

---

## Tests

```bash
npm test
```

| File | Coverage |
|---|---|
| `tests/chambers.test.js` | 12 tests across the 4 original chambers |
| `tests/word_vault.test.js` | Word Vault: matched item counts/ramp across modes, mode-choice recording, per-round responses |
| `tests/scramble.test.js` | The Scramble: self-contained cue verification, picks/matches/latency/changes, timeout auto-confirm, 3-pick cap |
| `tests/lost_score.test.js` | Lost Score: best-chamber detection, ±10% honesty band, repair-offer trigger, under-reporting never flagged |
| `tests/run_state_store.test.js` | Save/resume: round-trip, clear, resume-gap timing, `SignalTracker.restore` |
| `tests/e2e.test.js` | Quest gate, PII/consent guard, full run loop, Keeper read, DifficultyDial, v2 flow integration (repair window + resume), chamber script-loading regression, network-isolation privacy regression (no `fetch`/`XMLHttpRequest` outside `js/core/api.js`) |
| `tests/profile_mapper.test.js` | Archetype mapping + evidence notes, including v2 descriptive-evidence strings and a banned-judgment-words guard |
| `tests/agents.test.js` | DifficultyDial, DopamineDJ, ParticleSystem |
| `tests/fork_flow.test.js` | ForkFlow + repair injection |
| `tests/run_payload.test.js` | Payload builder, including `shared_runs` column-parity check against `supabase/schema.sql` |
| `tests/signal_tracker.test.js` | SignalTracker event log |
| `tests/api.test.js` | Supabase REST client (injectable fetch) |

---

## Repo Structure

```
SUPERPOWER-ARCADE/
├── admin/              # Keeper dashboard (dashboard.html + dashboard.js)
├── data/               # Pure data: forks.js, profiles.js, wordVault.js, scramble.js
├── docs/superpowers/
│   ├── specs/          # Design docs (what + why, written before implementation)
│   └── plans/          # Task-by-task TDD implementation plans
├── js/
│   ├── agents/         # DifficultyDial, DopamineDJ — cross-chamber adaptive systems
│   ├── chambers/       # Pure game logic: PatternBlitz, ColorCascade, NumberRush, WordVault,
│   │                   #   Scramble, VaultDoor — no DOM, unit-testable
│   ├── core/           # SignalTracker, ForkFlow, RunStateStore, LostScore, profileMapper,
│   │                   #   runPayload, api.js (the ONLY file allowed to fetch/XHR)
│   ├── games/          # DOM/canvas mount adapters, one per chamber (js/chambers/X.js ↔ js/games/x.js)
│   ├── systems/        # ParticleSystem (confetti/coin-burst FX); BROskiWallet (on-chain
│   │                   #   BROski$ minting scaffold — loaded but not yet wired into any flow)
│   └── config.js       # Committed client config: Supabase URL + anon key (see Environment Config)
├── supabase/
│   └── schema.sql      # Full DB schema + RLS + RPC (apply by hand — see Supabase Setup)
├── tests/              # All test files (node:test, zero dependencies)
├── app.js              # Flow controller — screens, chamber sequencing, save/resume, share
├── index.html          # Shell HTML (all screens + script tags)
├── style.css           # Global styles
└── vercel.json         # Deployment config (SPA routing, security headers, /admin route block)
```

---

## Ethics & Privacy

- Nothing leaves the device unless the player taps "Send my run" on the share screen — "Keep it to myself" submits nothing, ever
- If they do share, `player_name` and `contact` are stored exactly as the player typed them — that's the point (the Keeper needs a way to reach a legendary run) — but it's explicit, one screen, opt-in per run, never silently collected. No IP address or other tracking identifier is captured anywhere
- Archetypes and evidence describe strengths, never diagnoses — evidence strings are descriptive ("reported 12 when the true count was 8"), never interpretive ("dishonest"), enforced by a test that scans for banned judgment words
- The Keeper dashboard is **local-only**: prod `/admin/*` is blocked for everyone at the Vercel edge, and reading anything requires the service-role key pasted at runtime on the Keeper's own machine (see Admin / Keeper Dashboard above)
- No third-party analytics or tracking scripts

---

## License

MIT — see [LICENSE](LICENSE)
