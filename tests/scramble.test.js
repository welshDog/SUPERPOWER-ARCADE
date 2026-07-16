const test = require('node:test');
const assert = require('node:assert');
const { Scramble } = require('../js/chambers/Scramble.js');
const DATA = require('../data/scramble.js');
const SignalTracker = require('../js/core/SignalTracker.js');

test('cue is self-contained: every cued item glyph appears in doorGlyphs on the same screen payload', () => {
  const cued = DATA.items.filter(i => i.cued);
  assert.equal(cued.length, 3);
  for (const item of cued) assert.ok(DATA.doorGlyphs.includes(item.glyph), `cued item ${item.id} glyph missing from door preview`);
});

test('records picks, matches, latency, and changes', () => {
  const t = new SignalTracker({}); t.startRun('med');
  const s = new Scramble({ tracker: t, data: DATA, now: () => 1000 });
  s.begin();
  s._now = () => 5000;
  s.togglePick('prism'); s.togglePick('rope'); s.togglePick('rope'); s.togglePick('coil'); s.togglePick('cell');
  const res = s.confirm();
  assert.deepEqual(res.picks.sort(), ['cell', 'coil', 'prism']);
  assert.equal(res.matches, 3);
  assert.equal(res.latencyMs, 4000);
  assert.equal(res.changes, 1); // rope picked then unpicked
  const ev = t.events.find(e => e.type === 'scramble_result');
  assert.equal(ev.detail.matches, 3);
});

test('timeout auto-confirms whatever is picked (run always continues)', () => {
  const t = new SignalTracker({}); t.startRun('med');
  const s = new Scramble({ tracker: t, data: DATA, now: () => 0 });
  s.begin();
  s.togglePick('skull');
  const res = s.timeout();
  assert.equal(res.timedOut, true);
  assert.equal(res.picks.length, 1);
  assert.ok(t.events.some(e => e.type === 'scramble_result' && e.detail.timedOut));
});

test('cannot pick more than 3 at once', () => {
  const t = new SignalTracker({}); t.startRun('med');
  const s = new Scramble({ tracker: t, data: DATA, now: () => 0 });
  s.begin();
  ['prism', 'coil', 'cell'].forEach(id => s.togglePick(id));
  const r = s.togglePick('rope');
  assert.equal(r.rejected, true);
  assert.equal(s.picks.size, 3);
});
