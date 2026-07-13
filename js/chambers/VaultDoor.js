/**
 * THE VAULT DOOR - Boss Level
 * Zero instructions. Untimed. Pure Mind Vault DNA.
 * Glyph lock puzzle solved through intuition + lateral thinking.
 * Signals: time-to-first-attempt, persistence, creativity, solved vs abandoned.
 */
class VaultDoor {
  constructor({ tracker }) {
    this.tracker   = tracker;
    this.attempts  = 0;
    this.solved    = false;
    this.abandoned = false;
    this._startMs  = null;
    this._firstAttemptMs = null;
    this.GLYPHS    = ['⟁','Ⲭ','ⲟ','⎈','⏣','⟐','⌖','⍾','⎔'];
    this._solution = this._pickSolution();
    this._tried    = new Set();
  }

  _pickSolution() {
    const g = [...this.GLYPHS];
    return [0,1,2,3].map(() => g[Math.floor(Math.random() * g.length)]);
  }

  start() {
    this._startMs = Date.now();
    this.tracker.record('vault_start', { at: this._startMs });
    return {
      glyphs   : this.GLYPHS,
      slots    : 4,
      narrative: 'The door has four marks. Choose wisely.',
    };
  }

  attempt(combo) {
    if (this.solved) return { solved: true, alreadySolved: true };
    const now     = Date.now();
    if (this.attempts === 0) this._firstAttemptMs = now - this._startMs;
    this.attempts++;
    const key     = combo.join('|');
    const correct = combo.join('') === this._solution.join('');
    this._tried.add(key);
    const unusualGlyphs  = ['⍾','⎔','⌖'];
    const triedUnusual   = combo.some(g => unusualGlyphs.includes(g));
    this.tracker.record('vault_attempt', {
      attempt: this.attempts, correct,
      timeFromStart: now - this._startMs,
      triedUnusual, combo: key,
    });
    if (correct) {
      this.solved = true;
      this.tracker.record('vault_solved', {
        totalAttempts  : this.attempts,
        timeMs         : now - this._startMs,
        firstAttemptMs : this._firstAttemptMs,
        triedUnusualPath: [...this._tried].some(t => unusualGlyphs.some(g => t.includes(g))),
      });
    }
    return {
      correct,
      attempts: this.attempts,
      nudge   : !correct && this.attempts >= 5 ? 'The vault remembers every try.' : null,
    };
  }

  abandon() {
    this.abandoned = true;
    this.tracker.record('vault_abandoned', {
      totalAttempts: this.attempts,
      timeMs: Date.now() - this._startMs,
    });
    return { abandoned: true, attempts: this.attempts };
  }

  isSolved()    { return this.solved; }
  isAbandoned() { return this.abandoned; }
  isComplete()  { return this.solved || this.abandoned; }
  _getSolutionForTest() { return [...this._solution]; }
}

if (typeof module !== 'undefined' && module.exports) module.exports = { VaultDoor };
else window.VaultDoor = VaultDoor;
