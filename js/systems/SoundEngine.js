/**
 * SoundEngine — native Web Audio synthesized arcade tones (spec §3b).
 * No Howler, no sample files, no dependencies. Short oscillator+envelope
 * chips only. Off until unlock() (first user gesture) — browser autoplay
 * policy treated as a feature: INSERT COIN is the audio unlock.
 */
const SOUND_SPECS = {
  'correct':          { notes: [{ freq: 660, durMs: 90, delayMs: 0, type: 'square', gain: 0.05 },
                                { freq: 880, durMs: 110, delayMs: 70, type: 'square', gain: 0.05 }] },
  'wrong':            { notes: [{ freq: 160, durMs: 180, delayMs: 0, type: 'sine', gain: 0.06 }] },
  'coin':             { notes: [{ freq: 990, durMs: 80, delayMs: 0, type: 'triangle', gain: 0.05 },
                                { freq: 1320, durMs: 120, delayMs: 60, type: 'triangle', gain: 0.05 }] },
  'streak':           { notes: [660, 830, 990, 1170].map((f, i) => ({ freq: f, durMs: 90, delayMs: i * 70, type: 'square', gain: 0.05 })) },
  'chamber-complete': { notes: [{ freq: 520, durMs: 160, delayMs: 0, type: 'sine', gain: 0.06 },
                                { freq: 780, durMs: 260, delayMs: 150, type: 'sine', gain: 0.06 }] },
  'vault-open':       { notes: [{ freq: 220, durMs: 900, delayMs: 0, type: 'sine', gain: 0.05 },
                                { freq: 330, durMs: 900, delayMs: 200, type: 'sine', gain: 0.04 },
                                { freq: 440, durMs: 700, delayMs: 400, type: 'sine', gain: 0.04 }] },
  'fork':             { notes: [{ freq: 440, durMs: 140, delayMs: 0, type: 'sine', gain: 0.04 }] }
};

const SEMITONE = Math.pow(2, 1 / 12);

class SoundEngine {
  constructor({ storage, contextFactory, prefersReduced = false } = {}) {
    this.storage = storage || window.localStorage;
    this.contextFactory = contextFactory ||
      (() => new (window.AudioContext || window.webkitAudioContext)());
    this.ctx = null;
    const stored = this.storage.getItem('spa_muted');
    this._muted = stored !== null ? stored === '1' : !!prefersReduced;
  }

  get muted() { return this._muted; }

  setMuted(m) {
    this._muted = !!m;
    this.storage.setItem('spa_muted', this._muted ? '1' : '0');
  }

  unlock() {
    if (!this.ctx) { try { this.ctx = this.contextFactory(); } catch { this.ctx = null; } }
  }

  play(moment, { pitchStep = 0 } = {}) {
    if (this._muted || !this.ctx) return;
    const spec = SOUND_SPECS[moment];
    if (!spec) return;
    const t0 = this.ctx.currentTime;
    for (const n of spec.notes) {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = n.type;
      osc.frequency.value = n.freq * Math.pow(SEMITONE, pitchStep);
      const start = t0 + n.delayMs / 1000;
      const end = start + n.durMs / 1000;
      g.gain.setValueAtTime(n.gain, start);
      g.gain.exponentialRampToValueAtTime(0.0001, end);
      osc.connect(g);
      g.connect(this.ctx.destination);
      osc.start(start);
      osc.stop(end + 0.02);
    }
  }

  static totalDurationMs(spec) {
    return Math.max(...spec.notes.map(n => n.delayMs + n.durMs));
  }
}

SoundEngine.SOUND_SPECS = SOUND_SPECS;

if (typeof module !== 'undefined' && module.exports) { module.exports = SoundEngine; }
else { window.SoundEngine = SoundEngine; }
