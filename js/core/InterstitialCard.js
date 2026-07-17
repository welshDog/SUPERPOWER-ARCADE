/**
 * InterstitialCard — chamber-name beat between chambers (spec §3c).
 * Pure data; app.js owns the DOM/timing orchestration.
 */
const CHAMBER_META = {
  'pattern-blitz': { icon: '⚡', name: 'PATTERN BLITZ' },
  'color-cascade': { icon: '🌈', name: 'COLOR CASCADE' },
  'number-rush':   { icon: '🔢', name: 'NUMBER RUSH' },
  'word-vault':    { icon: '📖', name: 'WORD VAULT' },
  'scramble':      { icon: '🎒', name: 'THE SCRAMBLE' },
  'vault-door':    { icon: '🚪', name: 'THE VAULT DOOR' }
};

function cardFor(gameId) {
  return CHAMBER_META[gameId] || { icon: '🕹️', name: String(gameId).toUpperCase() };
}

const INTERSTITIAL_MS = 1000;

const InterstitialCard = { CHAMBER_META, cardFor, INTERSTITIAL_MS };

if (typeof module !== 'undefined' && module.exports) { module.exports = InterstitialCard; }
else { window.InterstitialCard = InterstitialCard; }
