# SUPERPOWER ARCADE — v1 Design Spec ("The Evan Run")

**Date:** 2026-07-13
**Status:** Approved by Lyndz (brainstorm session)
**Repo:** https://github.com/welshDog/SUPERPOWER-ARCADE

## 1. Purpose

A fun browser arcade that quietly reveals players' neurodivergent strengths so Lyndz can find good, trusting, intelligent mates to work with — and give Evan a real shot at a job.

**The game is Round 1 (the filter). Lyndz interviewing people his way is Round 2 (the decision).** The game never hires or rejects anyone — it surfaces people and gives Lyndz real talking points for a relaxed, ND-friendly chat.

## 2. Source material (the merge)

| Source | What we take |
|---|---|
| `-ULTIMATE-ADHD-BRAIN-ARCADE-` | The **engine**: vanilla JS mini-games (Pattern Blitz, Color Cascade, Number Rush), DifficultyDial agent (frustration/boredom/flow detection), DopamineDJ agent (momentum/streaks), ParticleSystem, arcade styling. |
| `-MIND-VAULT-ULTIMATE-GAME` | The **soul only**: chapter/chamber structure, zero-text "figure it out yourself" ethos. No code, no 3D in v1. |

## 3. Privacy & stealth model (core decision)

- **During play: full stealth.** No sign-up. No data leaves the device. All scoring runs locally (localStorage). Nobody masks, because nothing is collected.
- **At the reveal: consented share.** One tap — "Send your run to the Arcade Keeper — top players get invited to something real" — sends profile + name + contact to the private dashboard. **No tap = the data dies on the device.**
- **Quest codes** for invited people (Evan first): personalize the reveal greeting and pre-arm the share screen.
- Full covert uploading was explicitly considered and **ruled out** (UK GDPR + trust with future teammates).

## 4. Player journey

1. **Landing** — neon arcade look: "The Arcade Keeper has opened the vault. Find your superpower." Link: "Got a key from a friend?" → quest code entry.
2. **Energy check-in** (Low/Med/High) — flavour to the player, first signal to us.
3. **Three Chambers** — each = one mini-game + one story fork on exit:
   - Pattern Blitz → pattern-spotting signal
   - Color Cascade → working-memory signal
   - Number Rush → speed-vs-accuracy trade-off signal
   - **Forks** (text-light, both paths continue, neither visually "correct"):
     - Free a trapped NPC (costs time) vs grab the bonus chest — *care*
     - Coin-printing glitch: report it vs milk it — *honesty*
     - A stranger's run failed: share coins vs keep — *generosity*
4. **Boss Chamber** — one mini-game remixed with **zero instructions**, multiple valid ways through; exploration/retry behaviour is the boss fight.
5. **Reveal** — "Your Superpower is: X" + warm strengths write-up. Positive-only; everyone gets a real superpower.
6. **Share tap** — consented send to dashboard. Quest-code players see a personal greeting + pre-armed share.

## 5. Trust mechanics

- **Kept-promise:** an early NPC asks the player to promise to return and free them; later a reward path conflicts with the promise. Follow-through = the "trusting mate" signal.
- **Second-chance fork:** after any shadow choice, one low-key chance to make it right (return the glitch coins). Self-correction is a stronger signal than a one-shot choice.
- **Round-2 handoff:** dashboard "Invite to crew" leads to a relaxed chat with questions shared in advance; the run gives openers ("You reported the glitch — tell me about that").

## 6. Hidden signal engine (all local until share)

- Reuse **DifficultyDial** (persistence/self-regulation) and **DopamineDJ** (streaks, recovery-after-failure).
- New **`SignalTracker`** module: `retry_after_fail`, `fork_choice`, `speed_vs_accuracy_ratio`, `exploration_moves`, `time_in_flow`, `promise_kept` → localStorage.
- New **profile mapper**: signals → 5 archetypes: ⚡ Hyperfocus Hunter, 🔍 Pattern Detective, 🎨 Chaos Creator, 🧩 Systems Architect, 🌀 Wild Card.
- **HARD RULE:** archetypes carry NO diagnosis mapping anywhere (not player-facing, not dashboard). Strength patterns, not clinical labels.
- **Path alignment:** fork choices stored as raw facts ("freed NPC, reported glitch, kept promise") — Lyndz judges character, not an algorithm.

## 7. Architecture

- **Frontend:** vanilla JS, static site. Port from arcade repo: `app.js` (relevant flow), `agents/DifficultyDial.js`, `agents/DopamineDJ.js`, `systems/ParticleSystem.js`, `style.css` (base). New modules: `SignalTracker`, fork/story screens, reveal, share, quest-code entry. Data-driven: `data/forks.json`, `data/challenges.json`, `data/profiles.json`.
- **Backend:** Supabase only (no Python in v1):
  - `shared_runs` — insert-only for anon game clients via RLS
  - `quest_codes` — code, invitee name, personal message; validated via RPC (no public table read)
- **Dashboard:** private `admin/` page, Supabase auth (Lyndz = only user): runs list → archetype, signal breakdown, fork facts, quest code, contact, mailto "Invite to crew".
- **Deploy:** Vercel static. Seed Evan's quest code on day one.

## 8. Guardrails

Same forks for every player (fair comparison) · positive-only reveals · no diagnosis language · delete-on-request · dashboard private to Lyndz · don't publish what's measured (anti-gaming).

## 9. Not in v1

3D vault worlds · build-a-project boss level · public-launch polish · BROski$ hookup · Python backend.

## 10. Definition of done (v1)

A tester with quest code `EVAN-…` plays landing → 3 chambers → boss → reveal → taps share; Lyndz opens the admin page and sees the full profile with fork facts and contact; a no-tap run leaves **zero** rows in Supabase.
