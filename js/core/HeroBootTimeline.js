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
