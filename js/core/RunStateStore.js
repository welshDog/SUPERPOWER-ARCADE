/**
 * RunStateStore — client-side persisted run state (save-and-resume).
 * Storage key: spa_saved_run. Everything stays on-device (spec §3).
 */
class RunStateStore {
  constructor({ storage, key = 'spa_saved_run' } = {}) {
    this.storage = storage;
    this.key = key;
  }

  save(state) {
    const record = { ...state, savedAt: state.savedAt || Date.now() };
    this.storage.setItem(this.key, JSON.stringify(record));
    return record;
  }

  load() {
    const raw = this.storage.getItem(this.key);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  }

  clear() { this.storage.removeItem(this.key); }

  markResumed(nowMs = Date.now()) {
    const saved = this.load();
    if (!saved) return { resumeGapMs: 0 };
    const resumeGapMs = Math.max(0, nowMs - saved.savedAt);
    saved.savedAt = nowMs;
    this.storage.setItem(this.key, JSON.stringify(saved));
    return { resumeGapMs };
  }
}

if (typeof module !== 'undefined' && module.exports) { module.exports = RunStateStore; }
else { window.RunStateStore = RunStateStore; }
