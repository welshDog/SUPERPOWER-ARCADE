const test = require('node:test');
const assert = require('node:assert');
const { WordVault } = require('../js/chambers/WordVault.js');
const BANK = require('../data/wordVault.js');
const SignalTracker = require('../js/core/SignalTracker.js');

const fakeDial = { getCurrentLevel: () => 1, recordResponse: () => ({ action: 'maintain', level: 1 }) };
const fakeDj = { processResponse: () => null };

test('both modes have matched item counts and level ramps', () => {
  assert.equal(BANK.word.length, BANK.symbol.length);
  assert.deepEqual(BANK.word.map(i => i.level), BANK.symbol.map(i => i.level));
  for (const mode of ['word', 'symbol']) for (const item of BANK[mode]) {
    assert.ok(item.choices.includes(item.answer), `${mode} item "${item.prompt}" answer not in choices`);
  }
});

test('records mode choice and per-round responses with mode attached', () => {
  const tracker = new SignalTracker({});
  tracker.startRun('med');
  const wv = new WordVault({ tracker, dial: fakeDial, dj: fakeDj });
  wv.chooseMode('symbol');
  assert.equal(tracker.events.filter(e => e.type === 'verbal_mode_choice').length, 1);
  let round = wv.nextRound();
  assert.ok(round.prompt && round.choices.length === 4);
  wv.answer(round.answerForTest === undefined ? round.choices[0] : round.answerForTest);
  const rec = tracker.events.find(e => e.type === 'game_response' && e.detail.game === 'word-vault');
  assert.equal(rec.detail.mode, 'symbol');
});

test('completes after all 8 rounds and reports accuracy', () => {
  const tracker = new SignalTracker({});
  tracker.startRun('med');
  const wv = new WordVault({ tracker, dial: fakeDial, dj: fakeDj });
  wv.chooseMode('word');
  let round;
  while ((round = wv.nextRound())) wv.answer(BANK.word[wv.round - 1].answer);
  assert.ok(wv.isComplete());
  assert.equal(wv.correctCount, 8);
});
