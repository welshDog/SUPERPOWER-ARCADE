# Fix Report — VaultDoor boss screen renders black on the live site

**Date:** 2026-07-17
**Reported by:** Lyndz ("the unlock screen part of the game is not showing up")
**Tested against:** https://superpower-arcade.vercel.app/ (live deployment, current build — serves the vendored three.js)
**Status:** ✅ FIXED in the repo 2026-07-17 (uncommitted at time of writing) — scoped variant applied: `#game-content { position: relative }` globally + `#game-content.boss-arena { height: min(60vh, 480px) }` toggled by `runChamber` for the vault chamber only, + `uiLayer.style.zIndex = '1'` in vaultDoor.js. Locked by the "vault boss arena" structural test in `tests/e2e.test.js` (suite: 88 green). Verified in-browser on the local build: 3D vault renders behind a working UI at the boss, chamber 1 layout unaffected. **Not yet deployed** — live site still shows the bug until the next deploy.

## Symptom

On a WebGL-capable browser, reaching the boss chamber (VaultDoor) shows a **completely black screen** — no HUD, no title, no glyph slots, no UNLOCK button, no 3D vault. The DOM is all there (a screen-reader or DOM-based page summary describes the door emoji, 🪙 58, "The door has four marks. Choose wisely.", four ⟁ marks and UNLOCK perfectly — which is exactly what the page-summary in the bug report saw), but nothing paints.

## Reproduction

1. Load the live site, seed a saved run at `chamberIndex: 4` (Scramble finished) in `localStorage.spa_saved_run`, reload.
2. Click "Continue my run" → lands on VaultDoor.
3. Accessibility snapshot: full UI present. Console: zero errors. Screenshot: **solid black viewport**.
4. Hiding the three.js canvas (`display:none` in devtools) instantly reveals the complete, working UI.

## Root cause — one CSS gap, three consequences

`#game-content` has **no `position` and collapses to height 0** on this screen (every child `vaultDoor.js` mounts — the UI layer and the renderer canvas — is `position: absolute`, so nothing gives the container height). That single gap causes:

1. **Zero-pixel render buffer.** `renderer.setSize(el.clientWidth, el.clientHeight)` runs with `clientHeight = 0` → WebGL buffer **632×0**, camera aspect `632/0 = Infinity`. The 3D vault can never render a single pixel. (Measured live: `canvas.width/height = [632, 0]`.)
2. **Viewport takeover.** The canvas's `position:absolute; width/height:100%` has no positioned ancestor, so it resolves against the viewport → the canvas element stretches over the **entire page** (measured rect `[0, 0, 1280, 529]`) and, painted after the UI layer, composites as opaque black over everything — HUD included.
3. **UI stacked under the canvas.** Even with the container fixed, the canvas is appended **after** `uiLayer` (vaultDoor.js:116 vs :135), so it still paints above the buttons inside the game area; the UI layer needs to be lifted.

Note: this is not a regression from today's CDN-purge work — the vendored `vendor/three.min.js` loads fine (200, `THREE.REVISION === "128"` on live). The bug is layout, has been latent in `vaultDoor.js` + `style.css` since the chamber was built, and simply had no reporter until a run reached the boss on live.

## The fix (proven live, 2 lines of CSS + 1 line of JS)

**style.css** — anchor and size the game area:

```css
#game-content { position: relative; height: min(60vh, 480px); }
```

*(Scoping it to the boss screen only — e.g. a `.boss-active` class toggled in `runChamber` — is the conservative variant if the fixed height bothers the other five chambers; they currently size by content flow. A plain `min-height` instead of `height` is NOT enough for consequence 1: percentage-height children of a min-height box still resolve to 0.)*

**js/games/vaultDoor.js** — lift the UI above the 3D canvas:

```js
uiLayer.style.zIndex = '1';   // alongside the existing uiLayer style lines (~line 25-34)
```

**Live proof:** injecting exactly this CSS + z-index on the deployed site and re-entering the chamber produced buffer `632×318`, canvas confined to the game area, the 3D vault visible (door + glowing green ring, pulsing spotlight) behind a fully rendered UI. Glyph slots cycle (⟁ → Ⲭ) and rotate the matching 3D ring; UNLOCK fires the attempt; zero console errors.

## Suggested regression locks (when the fix is applied)

- Structural test: `style.css` contains a `#game-content` rule with `position: relative` and an explicit height (same static-scan style as `tests/e2e.test.js`).
- Structural test: `vaultDoor.js` sets a `zIndex` on the UI layer before appending the renderer canvas.

## Secondary findings (not blocking, worth a line in the v3 plan)

- **No-WebGL fallback:** if `THREE.WebGLRenderer` construction throws (blocked GPU, very old device), `mount()` dies mid-function *after* the UI is appended — the screen looks fine but slot clicks hit the `rings` TDZ and throw, soft-locking the combo at ⟁⟁⟁⟁. A try/catch around the THREE setup that degrades to UI-only (skip ring animation) would make the boss playable everywhere.
- **favicon.ico 404** on every page load (cosmetic; console noise).
