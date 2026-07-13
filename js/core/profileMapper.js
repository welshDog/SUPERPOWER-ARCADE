/**
 * profileMapper — turns a run's event log into a strength archetype + evidence notes.
 * Strength patterns only. Never diagnostic. Reveal is positive for every profile.
 */
const SPA_PROFILES = (typeof module !== 'undefined' && module.exports)
  ? require('../../data/profiles')
  : window.SPA_PROFILES;

function stats(events) {
  const responses = events.filter((e) => e.type === 'game_response');
  const correct = responses.filter((e) => e.detail.correct);
  const times = correct.map((e) => e.detail.ms).filter((ms) => ms > 0);
  const avgMs = times.length ? times.reduce((a, b) => a + b, 0) / times.length : 0;
  const accuracy = responses.length ? correct.length / responses.length : 0;
  let retries = 0; // an answer that follows a miss in the same game = kept going
  for (let i = 1; i < responses.length; i++) {
    if (!responses[i - 1].detail.correct && responses[i].detail.game === responses[i - 1].detail.game) retries++;
  }
  const perGame = {};
  for (const r of responses) {
    const g = (perGame[r.detail.game] ||= { total: 0, correct: 0 });
    g.total++;
    if (r.detail.correct) g.correct++;
  }
  const bossMoves = events.filter((e) => e.type === 'boss_move').length;
  const bossResets = events.filter((e) => e.type === 'boss_reset').length;
  const bossSolved = events.some((e) => e.type === 'boss_solved');
  return { responses, avgMs, accuracy, retries, perGame, bossMoves, bossResets, bossSolved };
}

function gameAccuracy(perGame, game) {
  const g = perGame[game];
  return g && g.total >= 5 ? g.correct / g.total : 0;
}

function computeScores(s) {
  const scores = { hyperfocus: 0, pattern: 0, systems: 0, chaos: 0 };
  // Hyperfocus Hunter: speed + volume + retries
  if (s.avgMs > 0 && s.avgMs < 900) scores.hyperfocus += 40;
  if (s.responses.length >= 12) scores.hyperfocus += 20;
  scores.hyperfocus += Math.min(30, s.retries * 10);
  // Pattern Detective: careful + accurate, esp. pattern-blitz
  if (s.accuracy >= 0.9 && s.avgMs >= 1500) scores.pattern += 40;
  scores.pattern += Math.round(gameAccuracy(s.perGame, 'pattern-blitz') * 40);
  // Systems Architect: sequence memory + efficient boss solve
  scores.systems += Math.round(gameAccuracy(s.perGame, 'color-cascade') * 40);
  if (s.bossSolved && s.bossMoves > 0 && s.bossMoves <= 12 && s.bossResets === 0) scores.systems += 40;
  // Chaos Creator: exploration volume + fearless resets
  if (s.bossMoves >= 25) scores.chaos += 40;
  scores.chaos += Math.min(30, s.bossResets * 15);
  if (s.bossSolved && s.bossMoves >= 25) scores.chaos += 15;
  return scores;
}

const FORK_EVIDENCE = {
  promise_made: 'Made the promise to come back for Pip',
  promise_avoided: 'Didn’t commit to the promise up front',
  promise_kept: 'Went back for Pip instead of taking the golden door',
  promise_broken: 'Took the golden door instead of going back for Pip',
  honest: 'Reported the coin glitch instead of milking it',
  self_gain: 'Pocketed the glitch coins at first',
  repaired: 'Took the second chance and returned the coins',
  kept_gain: 'Kept the glitch coins at the second chance',
  generous: 'Shared coins with the runner whose attempt collapsed',
  self_keep: 'Kept the coin stack when the other runner lost theirs'
};

function buildEvidence(events, s) {
  const notes = [];
  for (const e of events) {
    if (e.type === 'fork_choice' && FORK_EVIDENCE[e.detail.signal]) notes.push(FORK_EVIDENCE[e.detail.signal]);
  }
  if (s.retries > 0) notes.push(`Kept going after a miss ${s.retries}× — no rage quits`);
  if (s.bossSolved) notes.push(`Cracked the boss vault in ${s.bossMoves} moves (${s.bossResets} resets)`);
  else if (s.bossMoves > 0) notes.push(`Worked the boss vault for ${s.bossMoves} moves without giving up`);
  if (s.accuracy > 0) notes.push(`Overall accuracy ${Math.round(s.accuracy * 100)}%, avg response ${Math.round(s.avgMs)}ms`);
  return notes;
}

function mapProfile(runJson) {
  const events = runJson.events || [];
  const s = stats(events);
  const scores = computeScores(s);
  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const [topKey, topScore] = ranked[0];
  const secondScore = ranked[1][1];
  const ids = { hyperfocus: 'hyperfocus_hunter', pattern: 'pattern_detective', systems: 'systems_architect', chaos: 'chaos_creator' };
  // Wild Card when nothing dominates: weak top score or a near-tie
  const archetypeId = (topScore < 40 || topScore - secondScore < 10) ? 'wild_card' : ids[topKey];
  return { archetype: SPA_PROFILES[archetypeId], scores, evidence: buildEvidence(events, s) };
}

if (typeof module !== 'undefined' && module.exports) { module.exports = { mapProfile }; }
else { window.mapProfile = mapProfile; }
