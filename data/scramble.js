/**
 * The Scramble — messy inventory + boss-door preview (spec §2c).
 * doorGlyphs are SHOWN on the Scramble screen itself; the cued items carry them.
 * Never depends on earlier-run memory.
 */
const SPA_SCRAMBLE = {
  timeLimitSec: 30,
  doorGlyphs: ['🔺', '🌀', '🔋'],
  items: [
    { id: 'prism',    label: 'Cracked prism',    glyph: '🔺', cued: true },
    { id: 'coil',     label: 'Humming coil',     glyph: '🌀', cued: true },
    { id: 'cell',     label: 'Glowing cell',     glyph: '🔋', cued: true },
    { id: 'rope',     label: 'Frayed rope',      glyph: null, cued: false },
    { id: 'skull',    label: 'Neon skull',       glyph: '💀', cued: false },
    { id: 'boot',     label: 'Heavy boot',       glyph: null, cued: false },
    { id: 'radio',    label: 'Dead radio',       glyph: '📻', cued: false },
    { id: 'mirror',   label: 'Foggy mirror',     glyph: null, cued: false },
    { id: 'battery',  label: 'Leaky battery',    glyph: '🪫', cued: false },
    { id: 'ticket',   label: 'Golden ticket',    glyph: '🎫', cued: false }
  ]
};

if (typeof module !== 'undefined' && module.exports) { module.exports = SPA_SCRAMBLE; }
else { window.SPA_SCRAMBLE = SPA_SCRAMBLE; }
