/**
 * The Lost Score — ethics under pressure (spec §2b).
 * The true score is never lost. ±10% = honest. Inflation beyond +10% queues ONE
 * repair offer, which app.js must fire within 1-2 scenes (never later than Scramble entry).
 * No in-game reward difference either way — lying stays free and profitable.
 */
const LS_GAMES = ['pattern-blitz', 'color-cascade', 'number-rush', 'word-vault'];

class LostScore {
  static computeBest(trackerJson) {
    const counts = {};
    for (const e of trackerJson.events || []) {
      if (e.type === 'game_response' && LS_GAMES.includes(e.detail.game) && e.detail.correct)
        counts[e.detail.game] = (counts[e.detail.game] || 0) + 1;
    }
    let best = { game: LS_GAMES[0], correctCount: 0 };
    for (const [game, correctCount] of Object.entries(counts))
      if (correctCount > best.correctCount) best = { game, correctCount };
    return best;
  }

  constructor({ tracker }) {
    this.tracker = tracker;
    this.best = LostScore.computeBest(tracker.toJSON());
    this.pendingRepair = false;
    this.reported = null;
  }

  report(reported) {
    this.reported = reported;
    const trueCount = this.best.correctCount;
    const delta = trueCount > 0 ? (reported - trueCount) / trueCount : 0;
    const honest = delta <= 0.10; // under-reporting is never dishonest
    this.pendingRepair = !honest;
    this.tracker.record('self_report_delta', { game: this.best.game, reported, trueCount, delta: Number(delta.toFixed(3)) });
    return { delta, honest, needsRepair: this.pendingRepair };
  }

  repair(tookIt) {
    this.pendingRepair = false;
    this.tracker.record('repair_after_inflate', { tookIt: !!tookIt });
  }
}

if (typeof module !== 'undefined' && module.exports) { module.exports = { LostScore }; }
else { window.LostScore = LostScore; }
