/** The Scramble — chaos-to-plan gate logic (spec §2c). Any picks continue the run. */
class Scramble {
  constructor({ tracker, data, now }) {
    this.tracker = tracker;
    this.data = data;
    this._now = now || (() => Date.now());
    this.picks = new Set();
    this.changes = 0;
    this.startMs = null;
    this.firstCommitMs = null;
    this.doneRes = null;
  }

  begin() { this.startMs = this._now(); }

  togglePick(id) {
    if (this.picks.has(id)) { this.picks.delete(id); this.changes++; return { picked: false }; }
    if (this.picks.size >= 3) return { rejected: true };
    this.picks.add(id);
    if (this.firstCommitMs === null) this.firstCommitMs = this._now();
    return { picked: true };
  }

  _result(timedOut) {
    const picks = [...this.picks];
    const cuedSet = this.data.items.filter(i => i.cued).map(i => i.id);
    const matches = picks.filter(p => cuedSet.includes(p)).length;
    const latencyMs = (this.firstCommitMs ?? this._now()) - this.startMs;
    const res = { picks, cuedSet, matches, latencyMs, changes: this.changes, timedOut };
    this.tracker.record('scramble_result', res);
    this.doneRes = res;
    return res;
  }

  confirm() { return this.doneRes || this._result(false); }
  timeout() { return this.doneRes || this._result(true); }
}

if (typeof module !== 'undefined' && module.exports) { module.exports = { Scramble }; }
else { window.Scramble = Scramble; }
