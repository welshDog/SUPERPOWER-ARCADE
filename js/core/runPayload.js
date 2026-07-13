/** Builds the consented share payload. Only ever called from the share screen. */
function buildRunPayload({ runJson, profile, name, contact, questCode }) {
  const player_name = (name || '').trim();
  const contactClean = (contact || '').trim();
  if (!player_name) throw new Error('name is required to share a run');
  if (!contactClean) throw new Error('contact is required to share a run');
  return {
    player_name,
    contact: contactClean,
    quest_code: (questCode || '').trim() ? questCode.trim().toUpperCase() : null,
    archetype: profile.archetype.id,
    evidence: profile.evidence,
    signals: { meta: runJson.meta, events: runJson.events, scores: profile.scores }
  };
}

if (typeof module !== 'undefined' && module.exports) { module.exports = { buildRunPayload }; }
else { window.buildRunPayload = buildRunPayload; }
