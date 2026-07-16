/**
 * The Word Vault — dual-mode verbal reasoning chamber (spec §2a).
 * Mode is the player's choice; recorded as verbal_mode_choice; compared within mode only.
 */
function getBank() {
  return (typeof module !== 'undefined' && module.exports)
    ? require('../../data/wordVault.js')
    : window.SPA_WORD_VAULT;
}

class WordVault {
  constructor({ tracker, dial, dj }) {
    this.tracker = tracker;
    this.dial = dial;
    this.dj = dj;
    this.mode = null;
    this.round = 0;
    this.correctCount = 0;
    this.done = false;
  }

  chooseMode(mode) {
    this.mode = mode === 'symbol' ? 'symbol' : 'word';
    this.items = getBank()[this.mode];
    this.ROUNDS = this.items.length;
    this.tracker.record('verbal_mode_choice', { mode: this.mode });
  }

  nextRound() {
    if (!this.mode || this.round >= this.ROUNDS) { this.done = true; return null; }
    const item = this.items[this.round];
    this.round++;
    this._current = { item, startMs: Date.now() };
    return { round: this.round, total: this.ROUNDS, prompt: item.prompt, choices: [...item.choices], timeLimit: 12000 };
  }

  answer(chosen) {
    if (!this._current) return;
    const timeMs = Date.now() - this._current.startMs;
    const correct = chosen === this._current.item.answer;
    if (correct) this.correctCount++;
    this.dial.recordResponse(correct, timeMs);
    this.tracker.record('game_response', {
      game: 'word-vault', mode: this.mode, correct, timeMs,
      round: this.round, level: this._current.item.level
    });
    return { correct, timeMs };
  }

  timeout() {
    this.dial.recordResponse(false, 99999);
    this.tracker.record('game_response', { game: 'word-vault', mode: this.mode, correct: false, timeMs: 12000, round: this.round, level: this._current?.item.level || 1, timedOut: true });
    return { correct: false, timedOut: true };
  }

  isComplete() { return this.done || (this.mode && this.round >= this.ROUNDS); }
}

if (typeof module !== 'undefined' && module.exports) { module.exports = { WordVault }; }
else { window.WordVault = WordVault; }
