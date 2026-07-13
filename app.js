/* SUPERPOWER ARCADE — flow controller. DOM only; all logic lives in js/core/. */
(function () {
  const SPA = (window.SPA = {
    games: window.SPA?.games || {},
    CHAMBERS: ['pattern-blitz', 'color-cascade', 'number-rush', 'vault-door'],
    state: {}
  });

  const $ = (id) => document.getElementById(id);

  SPA.showScreen = function (id) {
    document.querySelectorAll('.screen').forEach((s) => s.classList.add('hidden'));
    $(id).classList.remove('hidden');
  };

  function newRunState() {
    SPA.state = {
      tracker: new SignalTracker({ storage: window.localStorage }),
      forkFlow: new ForkFlow(window.SPA_FORKS),
      dial: new DifficultyDial({ windowSize: 5, boredomThresholdMs: 600, frustrationThreshold: 3 }),
      dj: new DopamineDJ({ baseDropChance: 0.15, streakMultiplier: 0.05 }),
      particles: typeof ParticleSystem !== 'undefined' ? new ParticleSystem() : null,
      coins: 0,
      streak: 0,
      chamberIndex: 0,
      quest: JSON.parse(localStorage.getItem('spa_quest') || 'null'),
      profile: null
    };
    SPA.state.dj.initializeSession(0);
  }

  function setCoins(n) {
    SPA.state.coins = Math.max(0, n);
    $('hud-coins').textContent = `🪙 ${SPA.state.coins}`;
  }

  function feedback(msg, kind) {
    const el = $('game-feedback');
    el.textContent = msg;
    el.className = `feedback ${kind || ''}`;
    setTimeout(() => { if (el.textContent === msg) el.textContent = ''; }, 1200);
  }

  // ---- chamber runner ----
  let chamberTimer = null;

  function runChamber(index) {
    const gameId = SPA.CHAMBERS[index];
    const game = SPA.games[gameId];
    if (!game) { console.error(`game ${gameId} not registered`); return afterChamber(index); }
    SPA.showScreen('screen-game');
    $('hud-icon').textContent = game.icon;
    setCoins(SPA.state.coins);
    SPA.state.dial.reset(1);

    const ctx = {
      difficulty: () => SPA.state.dial.getCurrentLevel(),
      onRound(correct, ms) {
        SPA.state.tracker.record('game_response', { game: gameId, correct, ms });
        SPA.state.streak = correct ? SPA.state.streak + 1 : 0;
        const analysis = SPA.state.dial.recordResponse(correct, ms);
        if (analysis.action !== 'maintain') {
          SPA.state.tracker.record('difficulty_change', { game: gameId, action: analysis.action, level: analysis.level });
          feedback(analysis.action === 'increase' ? '🚀 Level up!' : '🛡️ Easing off…', analysis.action === 'increase' ? 'success' : 'warning');
        }
        const reward = SPA.state.dj.processResponse(correct, ms, SPA.state.streak);
        if (reward.drop) {
          SPA.state.tracker.record('coin_drop', { amount: reward.amount });
          setCoins(SPA.state.coins + reward.amount);
          feedback(reward.message, 'success');
          SPA.state.particles?.emit(window.innerWidth / 2, window.innerHeight / 3, 'coins', reward.amount * 3);
        }
      },
      grantCoins: (n) => setCoins(SPA.state.coins + n),
      feedback,
      trackerRecord: (type, detail) => SPA.state.tracker.record(type, detail),
      complete: () => finishChamber(index)
    };

    game.mount($('game-content'), ctx);

    if (game.durationSec) {
      let left = game.durationSec;
      $('hud-timer').textContent = fmt(left);
      chamberTimer = setInterval(() => {
        left--;
        $('hud-timer').textContent = fmt(left);
        if (left <= 0) finishChamber(index);
      }, 1000);
    } else {
      $('hud-timer').textContent = ''; // boss: untimed, zero pressure text
    }
  }

  function fmt(s) { return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }

  let finishing = false;
  function finishChamber(index) {
    if (finishing) return;
    finishing = true;
    clearInterval(chamberTimer);
    chamberTimer = null;
    setTimeout(() => { finishing = false; afterChamber(index); }, 400);
  }

  function afterChamber(index) {
    SPA.state.forkFlow.queueForChamber(index + 1);
    nextForkOrChamber(index);
  }

  function nextForkOrChamber(index) {
    const fork = SPA.state.forkFlow.next();
    if (fork) return showFork(fork, index);
    const nextIndex = index + 1;
    if (nextIndex < SPA.CHAMBERS.length) return runChamber(nextIndex);
    return reveal();
  }

  // ---- forks ----
  function showFork(fork, chamberIndex) {
    SPA.showScreen('screen-fork');
    $('fork-prompt').textContent = fork.prompt;
    const box = $('fork-options');
    box.innerHTML = '';
    fork.options.forEach((opt) => {
      const btn = document.createElement('button');
      btn.className = 'btn btn-secondary';
      btn.textContent = opt.label;
      btn.addEventListener('click', () => {
        const res = SPA.state.forkFlow.choose(fork, opt.id);
        SPA.state.tracker.record('fork_choice', { forkId: fork.id, optionId: opt.id, signal: res.signal });
        if (res.grantsCoins) setCoins(SPA.state.coins + res.grantsCoins);
        if (res.costsCoins) setCoins(SPA.state.coins - res.costsCoins);
        nextForkOrChamber(chamberIndex);
      });
      box.appendChild(btn);
    });
  }

  // ---- reveal + share ----
  function reveal() {
    const profile = window.mapProfile(SPA.state.tracker.toJSON());
    SPA.state.profile = profile;
    SPA.showScreen('screen-reveal');
    $('reveal-emoji').textContent = profile.archetype.emoji;
    $('reveal-name').textContent = `Your Superpower: ${profile.archetype.name}`;
    $('reveal-blurb').textContent = profile.archetype.blurb;
    SPA.state.particles?.celebrate?.();
  }

  function showShare() {
    SPA.showScreen('screen-share');
    const q = SPA.state.quest;
    if (q) {
      $('share-greeting').textContent = `🔑 ${q.invitee_name} — ${q.message}`;
      $('share-name').value = q.invitee_name;
    }
  }

  async function sendRun() {
    const btn = $('btn-share-send');
    try {
      const payload = window.buildRunPayload({
        runJson: SPA.state.tracker.toJSON(),
        profile: SPA.state.profile,
        name: $('share-name').value,
        contact: $('share-contact').value,
        questCode: SPA.state.quest?.code || ''
      });
      btn.disabled = true;
      const res = await window.SPA_API.submitRun(payload, window.SPA_CONFIG);
      if (res.ok) return thanks(true);
      $('share-feedback').textContent = `Transmission failed (${res.status}) — try again?`;
      btn.disabled = false;
    } catch (e) {
      $('share-feedback').textContent = e.message;
      btn.disabled = false;
    }
  }

  function thanks(sent) {
    SPA.showScreen('screen-thanks');
    $('thanks-title').textContent = sent ? '📡 Run received by the Keeper.' : '🕹️ GG.';
    $('thanks-body').textContent = sent
      ? "If your run lights up the board, you'll hear from a real human. Watch your inbox."
      : 'Your run stayed on this device, as promised. Come back any time.'
    localStorage.removeItem('spa_run')
  }

  // ---- quest codes ----
  async function tryQuestCode() {
    const code = $('quest-input').value.trim().toUpperCase();
    if (!code) return;
    $('quest-feedback').textContent = 'Checking the vault…';
    const row = await window.SPA_API.redeemQuestCode(code, window.SPA_CONFIG);
    if (row) {
      localStorage.setItem('spa_quest', JSON.stringify({ code, ...row }));
      $('quest-feedback').textContent = `🔓 Welcome, ${row.invitee_name}. The Keeper is expecting you.`;
    } else {
      $('quest-feedback').textContent = 'That key doesn fit any lock here.';
    }
  }

  // ---- wiring ----
  document.addEventListener('DOMContentLoaded', () => {
    $('btn-enter').addEventListener('click', () => SPA.showScreen('screen-energy'));
    $('btn-quest-code').addEventListener('click', () => $('quest-entry').classList.toggle('hidden'));
    $('btn-quest-go').addEventListener('click', tryQuestCode);
    document.querySelectorAll('.btn-energy').forEach((b) =>
      b.addEventListener('click', () => {
        newRunState();
        SPA.state.tracker.startRun(b.dataset.energy);
        runChamber(0);
      })
    );
    $('btn-to-share').addEventListener('click', showShare);
    $('btn-share-send').addEventListener('click', sendRun);
    $('btn-share-skip').addEventListener('click', () => thanks(false));
    $('btn-again').addEventListener('click', () => location.reload());
    SPA.showScreen('screen-landing');
  });
})();
