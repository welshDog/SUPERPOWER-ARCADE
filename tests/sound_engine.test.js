const { test } = require('node:test');
const assert = require('node:assert/strict');
const SoundEngine = require('../js/systems/SoundEngine.js');

function memStorage(seed = {}) {
  const m = new Map(Object.entries(seed));
  return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) };
}

function fakeContext() {
  const created = [];
  return {
    created,
    currentTime: 0,
    destination: {},
    createOscillator() {
      const osc = { frequency: { value: 0 }, type: '', connect() { return this; }, start() {}, stop() {} };
      created.push(osc);
      return osc;
    },
    createGain() {
      return { gain: { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() { return this; } };
    }
  };
}

test('every game moment has a spec and none exceeds the 1.5s ceiling', () => {
  const moments = ['correct', 'wrong', 'coin', 'streak', 'chamber-complete', 'vault-open', 'fork'];
  for (const m of moments) {
    const spec = SoundEngine.SOUND_SPECS[m];
    assert.ok(spec && spec.notes.length >= 1, `missing spec for ${m}`);
    assert.ok(SoundEngine.totalDurationMs(spec) <= 1500, `${m} exceeds 1.5s`);
    for (const n of spec.notes) assert.ok(n.gain <= 0.1, `${m} louder than the 0.1 gain ceiling`);
  }
});

test('play schedules oscillators only when unlocked and unmuted', () => {
  const ctx = fakeContext();
  const e = new SoundEngine({ storage: memStorage(), contextFactory: () => ctx });
  e.play('correct');                       // not unlocked yet
  assert.equal(ctx.created.length, 0);
  e.unlock();
  e.play('correct');
  assert.ok(ctx.created.length >= 1, 'unlocked+unmuted must schedule');
  const before = ctx.created.length;
  e.setMuted(true);
  e.play('coin');
  assert.equal(ctx.created.length, before, 'muted must schedule nothing');
});

test('mute state persists and reduced-motion defaults to muted on first visit only', () => {
  const store = memStorage();
  const e = new SoundEngine({ storage: store, contextFactory: fakeContext, prefersReduced: false });
  e.setMuted(true);
  assert.equal(store.getItem('spa_muted'), '1');
  const e2 = new SoundEngine({ storage: store, contextFactory: fakeContext, prefersReduced: false });
  assert.equal(e2.muted, true, 'stored preference wins');
  const fresh = new SoundEngine({ storage: memStorage(), contextFactory: fakeContext, prefersReduced: true });
  assert.equal(fresh.muted, true, 'reduced-motion first visit defaults muted');
  const fresh2 = new SoundEngine({ storage: memStorage({ spa_muted: '0' }), contextFactory: fakeContext, prefersReduced: true });
  assert.equal(fresh2.muted, false, 'explicit opt-in beats reduced-motion default');
});

test('pitchStep raises frequency by semitones', () => {
  const ctx = fakeContext();
  const e = new SoundEngine({ storage: memStorage(), contextFactory: () => ctx });
  e.unlock();
  e.play('coin');
  const base = ctx.created[0].frequency.value;
  e.play('coin', { pitchStep: 12 });
  const octaveUp = ctx.created[SoundEngine.SOUND_SPECS.coin.notes.length].frequency.value;
  assert.ok(Math.abs(octaveUp - base * 2) < 1, `12 semitones should double freq: ${base} -> ${octaveUp}`);
});
