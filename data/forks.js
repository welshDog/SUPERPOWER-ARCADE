/**
 * Character forks. Text-light, both paths always continue the game,
 * neither option is visually marked "correct".
 * signal vocabulary (consumed by profileMapper):
 *   promise_made / promise_avoided / promise_kept / promise_broken
 *   honest / self_gain / repaired / kept_gain
 *   generous / self_keep
 */
const SPA_FORKS = [
  {
    id: 'pip-promise',
    chamberAfter: 1,
    prompt: `Behind a locked gate, a little spark called Pip is stuck. The gate won't open yet. Pip: "Promise you'll come back for me?"`,
    options: [
      { id: 'promise', label: '\u{1F91D} I promise', signal: 'promise_made' },
      { id: 'shrug', label: `\u{1F937} Maybe… let's see`, signal: 'promise_avoided' }
    ]
  },
  {
    id: 'glitch',
    chamberAfter: 2,
    prompt: 'A vending machine glitches and starts printing free coins. Nobody saw it. The ⚠ report panel blinks beside it.',
    options: [
      { id: 'report', label: '⚠ Report the glitch', signal: 'honest' },
      {
        id: 'milk', label: '\u{1FA99} Pocket the coins', signal: 'self_gain', grantsCoins: 25,
        repair: {
          id: 'glitch-repair',
          prompt: 'Nobody noticed. But the return slot is right there, still open…',
          options: [
            { id: 'return', label: '↩️ Return the coins', signal: 'repaired', costsCoins: 25 },
            { id: 'keep', label: '\u{1F6B6} Keep walking', signal: 'kept_gain' }
          ]
        }
      }
    ]
  },
  {
    id: 'stranger',
    chamberAfter: 3,
    prompt: `Another runner's attempt just collapsed — they lost everything at the last chamber. They're sitting by the door.`,
    options: [
      { id: 'share', label: '\u{1FA99} Share 10 of your coins', signal: 'generous', costsCoins: 10 },
      { id: 'keep', label: '\u{1F4B0} Keep your stack', signal: 'self_keep' }
    ]
  },
  {
    id: 'pip-payoff',
    chamberAfter: 3,
    prompt: `Two doors ahead. A golden bonus door, glowing with coins. And the rusty gate back to Pip — it's unlocked now.`,
    options: [
      { id: 'pip', label: '\u{1F511} Go back for Pip', signal: 'promise_kept' },
      { id: 'gold', label: '✨ Take the golden door', signal: 'promise_broken' }
    ]
  }
];

if (typeof module !== 'undefined' && module.exports) { module.exports = SPA_FORKS; }
else { window.SPA_FORKS = SPA_FORKS; }
