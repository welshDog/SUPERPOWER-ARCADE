const SPA_PROFILES = {
  hyperfocus_hunter: {
    id: 'hyperfocus_hunter', name: 'Hyperfocus Hunter', emoji: '⚡',
    blurb: 'You lock on and GO. Speed, momentum, relentless retries — when something grabs you, you chase it down until it’s done. Teams ship faster with a Hunter on board.'
  },
  pattern_detective: {
    id: 'pattern_detective', name: 'Pattern Detective', emoji: '\u{1F50D}',
    blurb: 'You see the thing nobody else sees. Precision over panic — you take the extra beat and land the right answer. Detectives catch what everyone else ships broken.'
  },
  systems_architect: {
    id: 'systems_architect', name: 'Systems Architect', emoji: '\u{1F9E9}',
    blurb: 'You hold the whole structure in your head. Sequences, order, moving parts — you build the map while others are still staring at the pieces.'
  },
  chaos_creator: {
    id: 'chaos_creator', name: 'Chaos Creator', emoji: '\u{1F3A8}',
    blurb: 'You try the door nobody thought was a door. Wild experiments, fearless resets, unexpected wins — Creators find the path that isn’t on the map.'
  },
  wild_card: {
    id: 'wild_card', name: 'Wild Card', emoji: '\u{1F300}',
    blurb: 'You don’t fit one box — you fit four. Speed when it counts, precision when it matters, invention when it’s needed. The rarest profile in the arcade.'
  }
};

if (typeof module !== 'undefined' && module.exports) { module.exports = SPA_PROFILES; }
else { window.SPA_PROFILES = SPA_PROFILES; }
