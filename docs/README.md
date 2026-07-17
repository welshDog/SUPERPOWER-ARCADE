# docs/

Design history for SUPERPOWER-ARCADE, in the order things actually got decided and built. For how to run/deploy/test the app as it exists today, see the [top-level README](../README.md) — this folder is the "why," not the "how."

## Layout

- **`superpowers/specs/`** — design docs: what a feature is and why it's shaped that way, written *before* implementation. Read these to understand intent and constraints (e.g. why Lost Score uses a ±10% band, why The Scramble's cue has to be self-contained).
- **`superpowers/plans/`** — task-by-task TDD implementation plans generated from a spec. Read these to see how a spec became actual commits, in what order, with what tests.

A spec doesn't always get a matching plan (an idea can be written up for later without being scheduled yet), but every plan traces back to a spec.

## Current documents

| Date | Spec | Plan | Status |
|---|---|---|---|
| 2026-07-13 | [`superpower-arcade-design.md`](superpowers/specs/2026-07-13-superpower-arcade-design.md) | [`superpower-arcade-v1.md`](superpowers/plans/2026-07-13-superpower-arcade-v1.md) | Shipped — v1 (4 original chambers + boss) |
| 2026-07-16 | [`deep-vault-v2-design.md`](superpowers/specs/2026-07-16-deep-vault-v2-design.md) | [`deep-vault-v2.md`](superpowers/plans/2026-07-16-deep-vault-v2.md) | Shipped — v2 (Word Vault, Lost Score, The Scramble, save/resume) |
| 2026-07-16 | [`cinematic-entrance-hero-idea.md`](superpowers/specs/2026-07-16-cinematic-entrance-hero-idea.md) | — | Folded into v3 (below) by reference |
| 2026-07-17 | [`v3-polish-pack-design.md`](superpowers/specs/2026-07-17-v3-polish-pack-design.md) | [`v3-polish-pack.md`](superpowers/plans/2026-07-17-v3-polish-pack.md) | Shipped — v3 (4 repairs + entrance hero + native-audio sound + interstitials + unified wallet/momentum HUD) |

## Conventions

- Filename: `YYYY-MM-DD-short-slug.md`, dated when the doc was written (not when the feature shipped).
- A spec that's still just an idea should say so plainly near the top ("Status: idea/reference only, not built") so nobody mistakes it for a live design.
- Don't rewrite a spec/plan after the fact to match what was actually built if it drifted during implementation — that history is useful. If drift matters going forward, note it in the top-level README instead (see the "Schema drift fix" paragraph in the v2 section there for an example).
