/**
 * Word Vault item bank. Two modes, SAME count and level ramp (spec §2a).
 * Symbol mode: reading load ≤ 1 word per element. Neither mode is "easier".
 */
const SPA_WORD_VAULT = {
  word: [
    { level: 1, prompt: 'hot is to cold as fast is to …', choices: ['slow', 'quick', 'warm', 'far'], answer: 'slow' },
    { level: 1, prompt: 'Odd one out:', choices: ['apple', 'banana', 'carrot', 'cherry'], answer: 'carrot' },
    { level: 2, prompt: 'kitten is to cat as puppy is to …', choices: ['dog', 'bone', 'bark', 'paw'], answer: 'dog' },
    { level: 2, prompt: 'Odd one out:', choices: ['whisper', 'shout', 'mutter', 'listen'], answer: 'listen' },
    { level: 3, prompt: 'key is to lock as password is to …', choices: ['account', 'letter', 'secret', 'keyboard'], answer: 'account' },
    { level: 3, prompt: 'Odd one out:', choices: ['glance', 'stare', 'blink', 'gaze'], answer: 'blink' },
    { level: 4, prompt: 'spark is to fire as seed is to …', choices: ['tree', 'soil', 'water', 'leaf'], answer: 'tree' },
    { level: 4, prompt: 'Odd one out:', choices: ['begin', 'commence', 'conclude', 'start'], answer: 'conclude' }
  ],
  symbol: [
    { level: 1, prompt: '🔥 hot → ❄️ …', choices: ['cold', 'wet', 'big', 'far'], answer: 'cold' },
    { level: 1, prompt: 'Odd one out:', choices: ['🍎', '🍌', '🥕', '🍒'], answer: '🥕' },
    { level: 2, prompt: '🐱 cat → 🐕 …', choices: ['dog', 'bone', 'ball', 'paw'], answer: 'dog' },
    { level: 2, prompt: 'Odd one out:', choices: ['🔊', '📢', '🔔', '👂'], answer: '👂' },
    { level: 3, prompt: '🔑 key → 🔒 · 🧠 idea → …', choices: ['💡', '📦', '🔑', '🚪'], answer: '💡' },
    { level: 3, prompt: 'Odd one out:', choices: ['👀', '🔭', '👁️', '😴'], answer: '😴' },
    { level: 4, prompt: '⚡ spark → 🔥 · 🌱 seed → …', choices: ['🌳', '🪨', '💧', '🍂'], answer: '🌳' },
    { level: 4, prompt: 'Odd one out:', choices: ['▶️', '🚀', '🏁', '🟢'], answer: '🏁' }
  ]
};

if (typeof module !== 'undefined' && module.exports) { module.exports = SPA_WORD_VAULT; }
else { window.SPA_WORD_VAULT = SPA_WORD_VAULT; }
