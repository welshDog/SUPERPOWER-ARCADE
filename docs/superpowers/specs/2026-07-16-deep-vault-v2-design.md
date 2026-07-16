# SUPERPOWER ARCADE — v2 Design Spec ("The Deep Vault Update")

**Date:** 2026-07-16
**Status:** Approved by Lyndz (brainstorm session)
**Repo:** https://github.com/welshDog/SUPERPOWER-ARCADE
**Builds on:** `2026-07-13-superpower-arcade-design.md` (v1, "The Evan Run") — all v1 hard rules carry forward unchanged.

## 1. Purpose & roadmap fit

v2 deepens the arcade as **stage 1 of a 3-stage joiner filter** for finding mates and Hyperfocus collaborators:

| Stage | What | Status |
|---|---|---|
| 1. Fast screen | This game — logic + character signals through play | v1 built; v2 = this spec |
| 2. Real-world task | Practical 30–90 min challenge, invited from the dashboard | **v3 — future spec, not here** |
| 3. Trial period | Reliability-over-time tracking in the admin dashboard | **v4 — future spec, not here** |

The game remains Round 1 (the filter). Lyndz interviewing people his way remains Round 2 (the decision). The game never hires or rejects anyone.

**Carried-forward HARD RULES (v1 §3, §6, §8):** consent-led share only — no data leaves the device without the share tap · archetypes carry NO diagnosis mapping anywhere · positive-only reveals · same tests for every player (adaptive difficulty may offer hints, never different tests) · not a diagnostic tool, no clinical claims · delete-on-request · dashboard private to Lyndz · don't publish what's measured.

## 2. Three new game moments

### 2a. The Word Vault — verbal reasoning chamber (dual-mode)

- At chamber entry the player picks a mode. **Both modes test the same relational reasoning with matched difficulty curves; players are only ever compared within their chosen mode.**
  - **Word mode:** classic verbal items — analogies ("hot is to cold as fast is to ?") and odd-one-out word sets. OpenDyslexic font toggle available in this mode.
  - **Symbol mode:** picture-pair analogies and odd-one-out using icon+single-word pairs (🔥 hot → ❄️ ?). Reading load ≤ 1 word per element. Designed so dyslexic players face no reading penalty.
- The mode choice itself is recorded (`verbal_mode_choice`) — comfort with self-knowledge is a signal, never a penalty. Neither mode is presented as easier or "for" anyone.
- Item count and pacing follow the existing chamber rhythm (rounds via the shared chamber `ctx` contract).

### 2b. The Lost Score — ethics under pressure

- Triggered once per run, immediately after the player's **best-scoring** chamber: the game "glitches" and claims the score was lost, then asks the player to re-enter what they scored.
- The true score is retained locally the whole time. Nothing is actually lost.
- **Signals:** `self_report_delta` (reported − true). Reports within ±10% of the true score count as honest (good-faith memory error). Inflation beyond +10% → later in the run, one low-key repair chance in v1's established style: the Keeper "finds a backup" and offers to double-check the report → `repair_after_inflate` (took it / didn't).
- Consistent with v1 §5: nobody is judged on one bad choice; the repair moment is the better character test. Both facts land in the dashboard as raw behaviour; no in-game punishment or reward difference either way (lying must stay *free and profitable* in-game or the test measures nothing).

### 2c. The Scramble — chaos-to-plan gate

- Placed immediately before the Boss Chamber: a deliberately messy inventory screen (~9–12 items, visual clutter), 30-second timer, instruction-light prompt: pick 3 to take into the boss.
- There **is** a discoverable logic connecting 3 items to the boss chamber (subtle visual/thematic cues seeded earlier in the run) — but any 3 picks let the run continue; the boss plays out slightly differently, never unwinnably.
- **Signals:** `scramble_picks` (which items, vs. the cued set), `scramble_latency` (time to first commit), dither pattern (picks changed before confirm).

## 3. Run structure — one ~15 min run, save-and-resume

Landing → energy check-in → 3 v1 chambers (with existing forks) → **Word Vault** → **Lost Score** (fires after best chamber, so its slot floats) → **The Scramble** → Boss Chamber → Reveal → Share tap.

- **Save-and-resume:** full run state (chamber progress, signals, fork history) persists in localStorage. Leaving mid-run loses nothing; returning resumes exactly where they left off.
- **Resume as signal, not failure:** `resume_gap` records time away when a run is resumed ("came back after 26h and finished" = follow-through evidence). Abandoned runs that never resume simply die on the device like any unshared run — zero rows, zero judgment.

## 4. Signals, archetypes, dashboard

- **`SignalTracker` additions:** `verbal_mode_choice`, `verbal_accuracy`, `self_report_delta`, `repair_after_inflate`, `scramble_picks`, `scramble_latency`, `resume_gap`.
- **Archetypes:** the same 5 (⚡ Hyperfocus Hunter, 🔍 Pattern Detective, 🎨 Chaos Creator, 🧩 Systems Architect, 🌀 Wild Card). New signals enrich the mapper's inputs and reveal blurbs; no new archetypes, no renames.
- **Dashboard (evidence-first, unchanged philosophy):** new raw-fact rows per run — e.g. "reported lost score honestly", "inflated by 40%, then corrected when offered the backup", "symbol mode, 8/10", "Scramble: cued 3-of-3 in 12s", "resumed after a day and finished". Facts first, archetype below. Lyndz judges character; no algorithmic verdicts, no composite "trust score".
- **`shared_runs` schema:** extended with the new signal fields (additive columns only; v1 rows remain valid).

## 5. Not in v2

Feedback/critique test (considered, skipped by Lyndz's call) · stage-2 challenge system (v3) · stage-3 trial tracker (v4) · 3D vault worlds · BROski$ hookup · public-launch polish · Python backend.

## 6. Testing

Extend the existing suites (`tests/chambers.test.js`, `tests/e2e.test.js`):
- Word Vault: both modes complete a round loop; mode choice + accuracy recorded; matched item counts.
- Lost Score: true score retained; delta computed correctly for honest/inflated reports; repair offer fires only after out-of-band inflation; `repair_after_inflate` recorded both ways.
- Scramble: timer expiry auto-continues; picks + latency recorded; boss reachable with any pick set.
- Save-and-resume: mid-run state survives reload; `resume_gap` recorded on resume; a resumed run completes normally.
- Privacy regression: the sacred check — a full v2 run with **no share tap leaves zero rows in Supabase** — must still pass.

## 7. Definition of done (v2)

A tester plays the full v2 run (both verbal modes across two test runs), triggers the Lost Score honestly in one run and inflates + repairs in another, hits the Scramble, quits mid-run and resumes next session, finishes, taps share; the dashboard shows all new evidence rows with the archetype below; a no-tap run leaves zero rows; all tests green.
