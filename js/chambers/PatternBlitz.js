/**
 * Chamber 1: Pattern Blitz
 * Rapid pattern recognition under time pressure.
 * Signals: speed, accuracy, persistence, retry behaviour.
 */
class PatternBlitz {
  constructor({ tracker, dial, dj }) {
    this.tracker = tracker;
    this.dial    = dial;
    this.dj      = dj;
    this.streak  = 0;
    this.round   = 0;
    this.done    = false;
    this.ROUNDS  = 8;
  }

  _makeSequence(level) {
    const len    = Math.min(3 + Math.floor(level / 2), 8);
    const shapes = ['▲','■','●','◆','★','▼','◀','▶'];
    const seq    = [];
    for (let i = 0; i < len; i++)
      seq.push(shapes[Math.floor(Math.random() * shapes.length)]);
    return seq;
  }

  _makeChoices(correct, level) {
    const choices = [correct.join('')];
    while (choices.length < 4) {
      const fake = this._makeSequence(level).join('');
      if (!choices.includes(fake)) choices.push(fake);
    }
    return choices.sort(() => Math.random() - 0.5);
  }

  nextRound() {
    if (this.round >= this.ROUNDS) { this.done = true; return null; }
    const level   = this.dial.getCurrentLevel();
    const seq     = this._makeSequence(level);
    this.round++;
    this._current = { seq, startMs: Date.now(), level };
    return {
      round    : this.round,
      total    : this.ROUNDS,
      sequence : seq,
      choices  : this._makeChoices(seq, level),
      timeLimit: Math.max(1200, 3000 - (level * 200)),
    };
  }

  answer(chosenStr) {
    if (!this._current) return;
    const timeMs  = Date.now() - this._current.startMs;
    const correct = chosenStr === this._current.seq.join('');
    this.streak   = correct ? this.streak + 1 : 0;
    const rec     = this.dial.recordResponse(correct, timeMs);
    let reward    = null;
    const drop    = this.dj.processResponse(correct, timeMs, this.streak);
    if (drop && drop.shouldDrop) reward = this.dj.triggerDrop(this.streak);
    this.tracker.record('game_response', {
      game: 'pattern-blitz', correct, timeMs,
      round: this.round, level: this._current.level, streak: this.streak,
    });
    if (!correct) this.tracker.record('pattern_miss', { game: 'pattern-blitz', round: this.round });
    return { correct, timeMs, reward, dialRec: rec, streak: this.streak };
  }

  timeout() {
    this.streak = 0;
    this.dial.recordResponse(false, 99999);
    this.tracker.record('pattern_timeout', { game: 'pattern-blitz', round: this.round });
    return { correct: false, timedOut: true, streak: 0 };
  }

  isComplete() { return this.done || this.round >= this.ROUNDS; }
  getStreak()  { return this.streak; }
}

if (typeof module !== 'undefined' && module.exports) module.exports = { PatternBlitz };
else window.PatternBlitz = PatternBlitz;
