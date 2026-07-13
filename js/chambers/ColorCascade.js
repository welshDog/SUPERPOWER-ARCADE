/**
 * Chamber 2: Color Cascade
 * Growing colour sequence memory (Simon-style).
 * Signals: memory span, creativity, persistence.
 */
class ColorCascade {
  constructor({ tracker, dial, dj }) {
    this.tracker  = tracker;
    this.dial     = dial;
    this.dj       = dj;
    this.streak   = 0;
    this.round    = 0;
    this.ROUNDS   = 7;
    this.done     = false;
    this.sequence = [];
    this.COLORS   = [
      { id: 'red',    label: '🔴', hex: '#FF4757' },
      { id: 'blue',   label: '🔵', hex: '#4ECDC4' },
      { id: 'yellow', label: '🟡', hex: '#FFD700' },
      { id: 'green',  label: '🟢', hex: '#2ECC71' },
      { id: 'purple', label: '🟣', hex: '#A855F7' },
      { id: 'orange', label: '🟠', hex: '#FF6B35' },
    ];
  }

  nextRound() {
    if (this.round >= this.ROUNDS) { this.done = true; return null; }
    const level = this.dial.getCurrentLevel();
    const pool  = level >= 7 ? this.COLORS : this.COLORS.slice(0, 4 + Math.floor(level / 2));
    this.sequence.push(pool[Math.floor(Math.random() * pool.length)].id);
    this.round++;
    this._startMs = Date.now();
    return {
      round    : this.round,
      total    : this.ROUNDS,
      sequence : [...this.sequence],
      colors   : this.COLORS,
      flashMs  : Math.max(300, 700 - level * 40),
    };
  }

  answer(playerSequence) {
    const timeMs  = Date.now() - this._startMs;
    const correct = playerSequence.join(',') === this.sequence.join(',');
    this.streak   = correct ? this.streak + 1 : 0;
    const rec     = this.dial.recordResponse(correct, timeMs);
    let reward    = null;
    const drop    = this.dj.processResponse(correct, timeMs, this.streak);
    if (drop && drop.shouldDrop) reward = this.dj.triggerDrop(this.streak);
    this.tracker.record('game_response', {
      game: 'color-cascade', correct, timeMs,
      round: this.round, span: this.sequence.length, streak: this.streak,
    });
    if (!correct) {
      this.tracker.record('cascade_miss', {
        game: 'color-cascade', round: this.round, spanAtMiss: this.sequence.length,
      });
      this.sequence = [];
    }
    return { correct, timeMs, reward, dialRec: rec, streak: this.streak };
  }

  isComplete() { return this.done || this.round >= this.ROUNDS; }
  getStreak()  { return this.streak; }
  getMaxSpan() { return this.round; }
}

if (typeof module !== 'undefined' && module.exports) module.exports = { ColorCascade };
else window.ColorCascade = ColorCascade;
