# Cinematic Entrance Hero — idea doc (not yet built)

## Context

This started as a casual brainstorm riffing on Slider Revolution's WordPress hero templates (motion typography, particle waves, parallax). Slider Revolution itself isn't usable here — it's a WordPress+jQuery plugin, and SUPERPOWER-ARCADE is a deliberately vanilla-JS, zero-dependency, no-build-step static site (a hard constraint carried over from the Deep Vault v2 plan, partly because of a RAM ceiling on the dev machine). The idea: turn the current static landing screen into a short "boot sequence" — motion typography, ambient particles — that plays once when the arcade loads, before the player hits INSERT COIN. Nothing about the actual game chambers would change; this is landing-screen-only.

**Status: idea/reference only, not built.** Captured here so the design isn't lost, to pick up whenever it's prioritized.

Decided during the brainstorm:
- **Trigger style:** a load-triggered, time-staged animation sequence (not real scroll-driven parallax — the app has zero scroll infrastructure today, and introducing one would be a much bigger, separate change).
- **Timing approach:** a small testable timing module (`HeroBootTimeline.js`) rather than hardcoded CSS delays, if/when this gets built.

## Design

**Trigger:** plays once on a genuinely fresh arrival at `screen-landing` — i.e. from `app.js`'s `DOMContentLoaded` handler's `else` branch (no saved run found), **and** from the "Start fresh" button's `SPA.showScreen('screen-landing')` call (`app.js:311`) after a resume is discarded. Both call sites should route through one small helper (e.g. `enterLandingWithBoot()`) so the sequence is consistent and isn't duplicated. It must **not** replay on the `screen-resume` path.

**Stages** (~1.6–1.8s total, tune by feel):
1. **Wordmark stagger** (0–700ms): split the `<h1>` into two `<span class="boot-word">` targets (`SUPERPOWER` / `ARCADE`, keep the `<br>`) — each fades/rises/un-blurs in ~150–200ms apart (`opacity 0→1`, `translateY 18px→0`, `filter: blur(6px)→0`).
2. **Tagline** (~700–950ms): shorter fade/slide, same direction, less distance.
3. **Actions** (~950–1300ms): INSERT COIN + "Got a key" buttons, wrapped in a new `.boot-actions` container, scale/fade in staggered ~80–100ms apart.
4. **Ambient hold** (1300ms+): sequence visually settles; a low-density ambient particle field keeps drifting behind the text until the player clicks INSERT COIN, at which point it stops.

**Non-negotiable:** `#btn-enter` is clickable from t=0 — its fade-in is cosmetic only, never a gate. No overlay intercepts early clicks.

**Reduced motion:** wrap new keyframes in `@media (prefers-reduced-motion: reduce)` that collapses all stagger delays/durations to ~0 and skips starting the ambient RAF loop (static/no particles instead).

**Particle layer — new sibling module, not a `ParticleSystem` extension.** `ParticleSystem.js` (`js/systems/ParticleSystem.js`) is burst physics (`life=1.0`, decay, gravity, self-terminating RAF loop when the particle array empties) built for coin-drop/`celebrate()` moments — there's no persistent/looping/ambient concept in it, and bolting one on means overriding most of its physics per-call (forking it in place, not reusing it), risking the two production moments that already use it (coin bursts, reveal `celebrate()`). Instead: a new `HeroField` class would claim the **existing dead `#particle-canvas` element** (already `position:fixed; inset:0; pointer-events:none;` in `index.html`/`style.css` — currently unused by anything), with its own `start()`/`stop()` lifecycle, no `emit`-style burst API, 2–3 depth layers reusing the existing palette hex values (`--neon-cyan`/`--neon-gold`/`--neon-pink`), capped low (~30–50 particles) for the RAM-constrained dev machine.

**Required CSS fix (small, not scope creep):** `#particle-canvas` currently has `z-index: 10` while `#app` has no explicit position/z-index (auto) — meaning the moment `HeroField` draws, particles would paint *above* the wordmark/buttons, not behind them. Would need `#app { position: relative; z-index: 1; }` so text/buttons are always on top regardless of particle density. Confirmed via grep at design time: nothing else in `style.css` sets a z-index on `#app` descendants, so this would be a no-op everywhere except fixing the intended stacking.

## Files (if built)

**New:**
- `js/systems/HeroField.js` — ambient canvas particle layer. Claims `#particle-canvas` by id (contrast with `ParticleSystem.init()`, which creates its own canvas). `start()`, `stop()`. Dual export (`module.exports` / `window.HeroField`) for convention consistency, though it's not meaningfully unit-testable (canvas/RAF).
- `js/core/HeroBootTimeline.js` — pure data + logic: ordered stage table (`{ name, delayMs, durationMs }`) for wordmark/tagline/actions, plus `applyReducedMotion(stages, prefersReduced)` returning a collapsed copy. Dual export like `js/agents/DifficultyDial.js`. This is the one piece worth `node:test` coverage.
- `tests/hero_boot_timeline.test.js` — node:test coverage for `HeroBootTimeline`: stage ordering/shape, reduced-motion collapse. CommonJS `require()` style matching `tests/signal_tracker.test.js`.

**Modified:**
- `index.html` — wrap `<h1>` text in two `<span class="boot-word">`; wrap the two landing buttons in `<div class="boot-actions">`; add `<script>` tags for the two new files (before `app.js`). `#particle-canvas` itself untouched.
- `style.css` — add `#app { position: relative; z-index: 1; }`; new keyframes `bootWordIn`/`bootFadeUp`/`bootActionIn` (opacity/transform/filter only — never touch `font-family`, so `.font-od` stays intact); `@media (prefers-reduced-motion: reduce)` block collapsing all three.
- `app.js` — add `enterLandingWithBoot()` helper wrapping `SPA.showScreen('screen-landing')` + `HeroField` start + reading `HeroBootTimeline` stages (checking `matchMedia('(prefers-reduced-motion: reduce)')`) to set stagger delays; call it from both the `DOMContentLoaded` else-branch and the "Start fresh" button handler (`app.js:309-312`). In the `btn-enter` click handler, call `heroField.stop()` right after `SPA.showScreen('screen-energy')`.

## Constraints to respect (if built)

- No new npm dependencies, no build step (matches existing `node --test`, zero-dep setup).
- Existing tests must keep passing — confirmed via grep at design time that no test references `screen-landing`, `btn-enter`, `<h1>`, `.glow`, or `#particle-canvas`, so the markup/CSS restructuring wouldn't touch any existing assertion.
- The network-isolation regression test (`tests/e2e.test.js`, scans all `.js` under `js/`/`data/` except `api.js` for `fetch(`/`XMLHttpRequest`) must stay green — neither new file has any reason to touch the network.
- Commit prefixes: `feat:`/`fix:`/`test:`/`docs:`/`chore:` only.

## Verification (if built — no automated DOM test possible without a DOM shim)

Serve statically (e.g. `npx serve .`) and check in a real browser:
1. **Cold load** (clear `localStorage`, reload): wordmark staggers in word-by-word, tagline follows, buttons follow last, total settle under ~2s.
2. **Immediate-click test:** reload, click INSERT COIN within ~200ms — instant transition to energy screen, no console errors, no stuck-mid-animation artifact.
3. **Ambient particles legible:** text and both buttons stay fully readable; particles sit visibly behind them (the `#app` z-index fix).
4. **Resume path unaffected:** save a run, reload — `screen-resume` shows immediately, no boot sequence.
5. **Start-fresh path:** from `screen-resume`, click "Start fresh" — boot sequence plays (same as cold load).
6. **Reduced motion:** Chrome devtools Rendering tab → emulate `prefers-reduced-motion: reduce`, reload — everything appears instantly, no stagger, particles static/absent.
7. **Gameplay unaffected:** play a full run through to reveal; confirm `#particle-canvas` doesn't visually clash with `ParticleSystem`'s separate `#particle-overlay` canvas at any point, and that `heroField.stop()` actually fired (no orphaned RAF loop) once past the landing screen.
8. **Accessibility:** later in a run, toggle Word Vault's OpenDyslexic option — confirm `.font-od` still applies (new rules never touch `font-family`).

Then `npm test` should show all existing cases plus the new `hero_boot_timeline.test.js` cases, all green.
