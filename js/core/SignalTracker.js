/**
 * SignalTracker — the run's local event log.
 * Everything recorded here stays on-device until the player taps share.
 */
class SignalTracker {
  constructor({ storage = null } = {}) {
    this.storage = storage;
    this.meta = {};
    this.events = [];
  }

  startRun(energy) {
    this.meta = { energy, startedAt: new Date().toISOString() };
    this.events = [];
    this._persist();
  }

  record(type, detail = {}) {
    this.events.push({ type, detail, at: Date.now() });
    this._persist();
  }

  count(type) {
    return this.events.filter((e) => e.type === type).length;
  }

  toJSON() {
    return { meta: this.meta, events: this.events };
  }

  _persist() {
    if (this.storage) this.storage.setItem('spa_run', JSON.stringify(this.toJSON()));
  }
}

if (typeof module !== 'undefined' && module.exports) { module.exports = SignalTracker; }
else { window.SignalTracker = SignalTracker; }
