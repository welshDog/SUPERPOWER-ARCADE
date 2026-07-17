/**
 * Chamber 3: Number Rush
 * Number pattern completion under time pressure.
 * Signals: focus, logical reasoning, resilience under stress.
 */
class NumberRush {
  constructor({ tracker, dial, dj }) {
    this.tracker = tracker;
    this.dial    = dial;
    this.dj      = dj;
    this.streak  = 0;
    this.round   = 0;
    this.ROUNDS  = 8;
    this.done    = false;
  }

  _makePuzzle(level) {
    const types = ['arithmetic', 'skip', 'fibonacci', 'multiply'];
    const type  = level <= 3
      ? types[Math.floor(Math.random() * 2)]
      : types[Math.floor(Math.random() * types.length)];
    let seq, answer, hint;
    if (type === 'arithmetic') {
      const start = Math.floor(Math.random() * 10) + 1;
      const step  = Math.floor(Math.random() * 4) + 1 + Math.floor(level / 2);
      seq = [start, start+step, start+step*2, start+step*3];
      answer = start + step * 4;
      hint = '+' + step + ' each time';
    } else if (type === 'skip') {
      // Skip-counting: multiples of a base (2,4,6,8 … / 3,6,9,12 …). A clean
      // constant-difference rule — the previous formula built 3,6,12,18 which
      // is neither arithmetic nor geometric, i.e. unsolvable.
      const base = Math.floor(Math.random() * 4) + 2 + Math.floor(level / 3);
      seq = [base, base * 2, base * 3, base * 4];
      answer = base * 5;
      hint = 'counting by ' + base;
    } else if (type === 'fibonacci') {
      const a = Math.floor(Math.random() * 5) + 1;
      const b = Math.floor(Math.random() * 5) + 2;
      seq = [a, b, a+b, a+b+b];
      answer = seq[2] + seq[3];
      hint = 'add previous two';
    } else {
      const base = Math.floor(Math.random() * 4) + 2;
      seq = [base, base*base, base*base*base, base*base*base*base];
      answer = seq[3] * base;
      hint = 'powers pattern';
    }
    const choices = [answer];
    while (choices.length < 4) {
      const fake = answer + (Math.floor(Math.random() * 10) - 5);
      if (fake > 0 && !choices.includes(fake)) choices.push(fake);
    }
    return { seq, answer, hint, type, choices: choices.sort(() => Math.random() - 0.5) };
  }

  nextRound() {
    if (this.round >= this.ROUNDS) { this.done = true; return null; }
    const level   = this.dial.getCurrentLevel();
    const puzzle  = this._makePuzzle(level);
    this.round++;
    this._current = { puzzle, startMs: Date.now(), level };
    return {
      round    : this.round,
      total    : this.ROUNDS,
      sequence : puzzle.seq,
      choices  : puzzle.choices,
      timeLimit: Math.max(5000, 12000 - level * 800),
      hint     : level <= 4 ? puzzle.hint : null,
    };
  }

  answer(chosen) {
    if (!this._current) return;
    const timeMs  = Date.now() - this._current.startMs;
    const correct = chosen === this._current.puzzle.answer;
    this.streak   = correct ? this.streak + 1 : 0;
    const rec     = this.dial.recordResponse(correct, timeMs);
    let reward    = null;
    const drop    = this.dj.processResponse(correct, timeMs, this.streak);
    if (drop && drop.shouldDrop) reward = this.dj.triggerDrop(this.streak);
    this.tracker.record('game_response', {
      game: 'number-rush', correct, timeMs,
      round: this.round, level: this._current.level,
      puzzleType: this._current.puzzle.type, streak: this.streak,
    });
    if (!correct) this.tracker.record('number_miss', {
      game: 'number-rush', round: this.round, puzzleType: this._current.puzzle.type,
    });
    return { correct, timeMs, reward, dialRec: rec, streak: this.streak };
  }

  timeout() {
    this.streak = 0;
    this.dial.recordResponse(false, 99999);
    this.tracker.record('number_timeout', { game: 'number-rush', round: this.round });
    return { correct: false, timedOut: true, streak: 0 };
  }

  isComplete() { return this.done || this.round >= this.ROUNDS; }
  getStreak()  { return this.streak; }
}

if (typeof module !== 'undefined' && module.exports) module.exports = { NumberRush };
else window.NumberRush = NumberRush;
