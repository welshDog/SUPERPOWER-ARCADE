# SUPERPOWER ARCADE — v3 Design Spec ("The Polish Pack")

**Date:** 2026-07-17
**Status:** Approved by Lyndz (brainstorm session) — not yet planned/built
**Repo:** https://github.com/welshDog/SUPERPOWER-ARCADE
**Builds on:** `2026-07-16-deep-vault-v2-design.md` (v2, "The Deep Vault Update") — all v1/v2 hard rules carry forward unchanged.

## 1. Purpose & roadmap fit

v3 is deliberately **not a content expansion**. The six existing chambers are the product; v3 makes them feel richer, louder, and more trustworthy by (a) repairing four verified defects that quietly undermine the experience, and (b) wiring up the polish layers the arcade has been missing: sound, an entrance moment, scene transitions, and a coherent reward HUD.

**Roadmap renumbering** (supersedes the v2 spec's §1 table): the stage-2 challenge system previously pencilled as "v3" moves to **v4**, and the stage-3 trial tracker moves to **v5**. Rationale: more chambers are worth less than making the current six feel premium — sound, pacing, feedback, and progression clarity compound every future stage; another chamber doesn't.

| Version | What | Status |
|---|---|---|
| v1 | The Evan Run — 4 chambers + boss | Shipped 2026-07-13 |
| v2 | The Deep Vault — Word Vault, Lost Score, Scramble, save/resume | Shipped 2026-07-16 |
| **v3** | **The Polish Pack — this spec** | Approved |
| v4 | Stage-2 challenge system (real-world task invites) | Future spec |
| v5 | Stage-3 trial tracker | Future spec |

**Carried-forward HARD RULES (v1 §3/§6/§8, v2 §1):** consent-led share only · no diagnosis mapping · positive-only reveals · same tests for every player · descriptive-never-interpretive evidence · dashboard private to Lyndz · no composite trust score · nothing outside `js/core/api.js` touches the network (enforced by test).

**Architectural constraints, unchanged:** vanilla JS, **zero npm dependencies**, no build step, `node --test`, static Vercel deploy. v3 must not add any dependency — including CDN script tags (see §2a: it removes one).

## 2. Part one — Repairs (verified defects, fix before any polish ships)

All four were verified against the live repo/deployment on 2026-07-17.

### 2a. Remove the dead Howler CDN script

`index.html:95` loads Howler 2.2.4 from cdnjs. **Zero code anywhere uses it** — the game is completely silent. It's a wasted third-party request on every page load, a render-delay risk, and a quiet contradiction of the README's "no third-party scripts" privacy stance.

**Fix:** delete the script tag. Sound arrives in §3b via the native Web Audio API — Howler does not come back.

### 2b. Make the OpenDyslexic toggle real

`style.css:77`'s `.font-od` rule names `'OpenDyslexic'`, but **no `@font-face` ever loads the font** — toggling it currently gives players Comic Sans MS (the first fallback). The button in the Word Vault does something, but not what it says. For a game whose whole point includes dyslexia-fair testing, a fake accessibility control is a trust wound.

**Fix:** self-host the OpenDyslexic woff2 files (OFL-licensed) under a new `fonts/` directory and add the `@font-face` rules with `font-display: swap`. Self-hosting keeps the zero-third-party-request promise (no Google-Fonts-style CDN). Verify the toggle visibly changes glyph shapes, not just letter-spacing.

### 2c. Unblock the Keeper: document local-only admin access

Live check: `https://superpower-arcade.vercel.app/admin/` returns **404 for everyone, including the Keeper** — the `vercel.json` route rule has no bypass, so the production dashboard is unreachable, full stop.

**Fix (decision made):** keep prod `/admin/*` blocked, and make local-only access the documented, supported path — `npx serve .` → `localhost:.../admin/dashboard.html`, which works because the dashboard is a static page that talks straight to Supabase with the runtime-entered service key. Real auth would need server-side middleware this architecture doesn't have; a half-secure workaround (secret query param, obscure path) would be worse than an honest "run it locally." Update README's Admin section accordingly.

### 2d. Repair dashboard.js's broken module structure

`admin/dashboard.js:8` reads `const Dashboard = () => {}` followed by orphaned top-level `let` declarations — a half-finished refactor that happens to parse (the arrow function is empty and everything after leaks global). It works by accident and will shatter the moment anything redeclares those globals.

**Fix:** restore a proper IIFE/closure around the whole file (matching `app.js`'s `(function () { ... })()` pattern), delete the stray `Dashboard` remnant, and verify login + run rendering still work against real data locally.

## 3. Part two — Polish (in ship order)

### 3a. Cinematic entrance hero

Fully specced already — **`2026-07-16-cinematic-entrance-hero-idea.md` is incorporated here by reference** and upgraded from "idea, not scheduled" to in-scope for v3. Summary of what it commits to: load-triggered boot sequence (wordmark stagger → tagline → buttons → ambient particle field on the currently-dead `#particle-canvas`), `HeroField` + `HeroBootTimeline` modules, `#app` z-index fix, INSERT COIN clickable from t=0, full `prefers-reduced-motion` support, no replay on the resume path.

### 3b. Sound design — native Web Audio, synthesized

The arcade gets a voice, with zero dependencies: a new `js/systems/SoundEngine.js` using the **Web Audio API directly** — short synthesized tones (oscillator + gain envelope), not sample files. Retro chip-style blips fit the aesthetic better than recorded samples, weigh nothing, and need no asset pipeline.

**Sound moments (initial set):**
| Moment | Sound character |
|---|---|
| Correct answer | short rising blip |
| Wrong answer / timeout | soft low thud — never harsh or punishing |
| Coin drop | bright chime, pitch stepping up with streak |
| Streak milestone / DJ drop | quick ascending arpeggio |
| Chamber complete | two-note resolve |
| Boss vault opens | longer swell |
| Fork appears | subtle attention tone |

**Hard rules for sound:**
- **Off by default until first interaction** (browser autoplay policy forces this anyway — treat it as a feature: the INSERT COIN click is the audio unlock).
- **Mute toggle** visible in the HUD, state persisted in `localStorage`, respected everywhere.
- **Low-stim respect:** if `prefers-reduced-motion: reduce` is set, default the sound to muted on first visit (player can still opt in) — motion sensitivity and audio sensitivity travel together often enough that the safe default is quiet.
- Volume ceiling low; no sound longer than ~1.5s; never layer more than two simultaneous tones.
- `SoundEngine` is a `js/systems/` module with the dual-export pattern; its tone-scheduling logic (which moments map to which tone specs) should be pure data testable under `node --test`, with only the AudioContext calls untestable.

### 3c. Chamber interstitial transitions

Currently `SPA.showScreen()` is an instant class swap softened only by a 0.4s CSS fade. v3 adds a **brief interstitial beat** between chambers: chamber name + icon card (~0.8–1.2s, e.g. "🌈 COLOR CASCADE"), giving pacing punctuation and a natural home for the chamber-complete sound.

- Pure CSS animation triggered by a small orchestration helper; no timing library.
- **Skippable:** any click/keypress dismisses it instantly.
- `prefers-reduced-motion` collapses it to a near-instant static card or skips it entirely.
- Must not delay chamber logic setup — the next chamber mounts behind the card so dismissal is instant.

### 3d. Unified wallet + momentum HUD

Coin/streak state is currently fragmented: `SPA.state.coins` + `setCoins()` in app.js, streak inside DopamineDJ, and `js/systems/BROskiWallet.js` — a loaded-but-never-wired web3 scaffold that duplicates a balance concept nothing uses.

**Fix + feature:**
- Make **one local source of truth** for coins/streak (a small `Wallet` core module — either repurpose BROskiWallet's local half or replace it), which app.js, DopamineDJ, the share payload (`broski_coins`), and save/resume all read from. No more parallel balances.
- **Momentum made visible:** the HUD gains a streak/momentum indicator (e.g. a small flame/bar that grows with streak and resets on miss) so the DopamineDJ system the player already triggers becomes something they can *see*. Coin count animates on change (brief pulse) instead of silently re-rendering.
- **HARD RULE: the web3/on-chain minting half of BROskiWallet stays dormant in v3.** No ethers.js, no CDN, no mainnet/testnet calls from the game (consistent with the standing "mainnet never without explicit sign-off" rule and v2's "BROski$ hookup: not in v2"). If the local-wallet refactor keeps the file, the chain methods must be clearly marked unwired; if it replaces the file, the scaffold moves to a branch or doc note, not silently deleted.
- Save/resume must round-trip the unified wallet state (extends the existing `RunStateStore` payload).

## 4. Not in v3

New chambers or game moments · stage-2 challenge system (v4) · stage-3 trial tracker (v5) · web3/on-chain BROski$ activation · real admin auth infrastructure · sample-based audio or any audio asset files · Howler or any other library, CDN or npm · public-launch marketing polish.

## 5. Testing

Extend the existing suites (75 currently green; all must stay green):

- **Repairs:** structural test that `index.html` contains no external `<script src="http...">` tags at all (locks 2a in forever); test that `style.css` has an `@font-face` for every family named in `.font-od` (locks 2b); `node --check admin/dashboard.js` plus a structural test that it's wrapped in a closure (locks 2d).
- **Sound:** `SoundEngine`'s moment→tone-spec mapping is pure data — test shape, that every game moment in the table has a spec, duration ceiling ≤1.5s, and that the muted flag suppresses scheduling. AudioContext calls stay untested (browser-only, same policy as DOM adapters).
- **Entrance hero:** `HeroBootTimeline` tests per the incorporated idea doc (stage ordering, reduced-motion collapse).
- **Wallet:** unified wallet round-trips through save/resume; share payload reads coins from the single source; streak reset/growth logic.
- **Transitions:** interstitial helper's stage data is pure and testable; skip path always lands in the same state as natural completion.
- **Privacy regression:** the sacred check — no `fetch`/`XMLHttpRequest` outside `js/core/api.js` — must still pass over every new file, and a full run with no share tap still leaves zero rows.

## 6. Definition of done (v3)

A tester on a fresh browser: sees the boot sequence (and doesn't on resume; and doesn't with reduced-motion set), clicks INSERT COIN immediately mid-animation with no breakage, hears sound arrive only after that click, mutes and un-mutes persistently, watches the momentum meter grow and reset across a full six-chamber run with interstitial cards between chambers (skippable by click), toggles OpenDyslexic in the Word Vault and sees actual OpenDyslexic glyphs, finishes and shares — the dashboard (opened locally per the documented Keeper path, on a structurally repaired dashboard.js) shows the run with the correct coin total. `index.html` serves zero third-party requests. All tests green.
