/* SUPERPOWER ARCADE — flow controller. DOM only; all logic lives in js/core/. */
(function () {
  const SPA = (window.SPA = {
    games: window.SPA?.games || {},
    CHAMBERS: ['pattern-blitz', 'color-cascade', 'number-rush', 'word-vault', 'scramble', 'vault-door'],
    state: {}
  });

  const $ = (id) => document.getElementById(id);

  let heroField = null;

  function enterLandingWithBoot() {
    SPA.showScreen('screen-landing');
    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const T = window.HeroBootTimeline;
    const stages = T.applyReducedMotion(T.HERO_BOOT_STAGES, reduced);
    const targets = [
      ...document.querySelectorAll('#screen-landing .boot-word'),
      document.querySelector('#screen-landing .tagline'),
      ...document.querySelectorAll('#screen-landing .boot-actions > *')
    ];
    targets.forEach((el, i) => {
      const s = stages[i] || stages[stages.length - 1];
      el.style.animationDelay = `${s.delayMs}ms`;
      el.style.animationDuration = `${s.durationMs || 10}ms`;
    });
    document.body.classList.add('boot-playing');
    if (!reduced && window.HeroField) {
      heroField = heroField || new HeroField({ canvas: $('particle-canvas') });
      heroField.start();
    }
  }

  function showInterstitial(gameId, onDone) {
    // Deliberate deviation from spec wording "mounts behind the card": chambers
    // start per-round timers on mount, so mounting behind would eat play time.
    // Mounting is synchronous, so dismiss -> playable is still instant.
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return onDone();
    const meta = window.InterstitialCard.cardFor(gameId);
    SPA.showScreen('screen-interstitial');
    $('interstitial-icon').textContent = meta.icon;
    $('interstitial-name').textContent = meta.name;
    let done = false;
    const el = $('screen-interstitial');
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(t);
      el.removeEventListener('click', finish);
      document.removeEventListener('keydown', finish);
      onDone();
    };
    const t = setTimeout(finish, window.InterstitialCard.INTERSTITIAL_MS);
    el.addEventListener('click', finish);
    document.addEventListener('keydown', finish);
  }

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
      store: new RunStateStore({ storage: window.localStorage }),
      lostScore: null,
      resumed: false,
      wallet: new Wallet(),
      chamberIndex: 0,
      quest: JSON.parse(localStorage.getItem('spa_quest') || 'null'),
      profile: null
    };
    SPA.state.dj.initializeSession(0);
  }

  function setCoins(n) {
    SPA.state.wallet.setCoins(n);
    renderWallet(true);
  }

  function renderWallet(pulse) {
    const w = SPA.state.wallet;
    $('hud-coins').textContent = `\uD83E\uDE99 ${w.coins}`;
    $('hud-streak').textContent = w.streak >= 2 ? `\uD83D\uDD25${w.streak}` : '';
    if (pulse) {
      const el = $('hud-coins');
      el.classList.remove('pulse');
      void el.offsetWidth; // restart the animation
      el.classList.add('pulse');
    }
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
    $('game-content').classList.toggle('boss-arena', gameId === 'vault-door');
    $('hud-icon').textContent = game.icon;
    renderWallet(false);
    SPA.state.dial.reset(1);

    const ctx = {
      difficulty: () => SPA.state.dial.getCurrentLevel(),
      onRound(correct, ms) {
        // The chamber logic already logs each answer to the tracker (with
        // timeMs + round/level/streak detail). Logging it again here
        // double-counted every answer — inflating profileMapper retries/volume
        // and LostScore true-counts. The chamber is the single source of truth.
        const { streak } = SPA.state.wallet.recordAnswer(correct);
        renderWallet(false);
        SPA.sound.play(correct ? 'correct' : 'wrong');
        const analysis = SPA.state.dial.recordResponse(correct, ms);
        if (analysis.action !== 'maintain') {
          SPA.state.tracker.record('difficulty_change', { game: gameId, action: analysis.action, level: analysis.level });
          feedback(analysis.action === 'increase' ? '\uD83D\uDE80 Level up!' : '\uD83D\uDEE1\uFE0F Easing off\u2026', analysis.action === 'increase' ? 'success' : 'warning');
        }
        const reward = SPA.state.dj.processResponse(correct, ms, streak);
        if (reward.drop) {
          SPA.state.tracker.record('coin_drop', { amount: reward.amount });
          SPA.state.wallet.addCoins(reward.amount);
          renderWallet(true);
          SPA.sound.play('coin', { pitchStep: Math.min(streak, 12) });
          if (reward.type === 'gold') SPA.sound.play('streak');
          feedback(reward.message, 'success');
          SPA.state.particles?.emit(window.innerWidth / 2, window.innerHeight / 3, 'coins', reward.amount * 3);
        }
      },
      grantCoins: (n) => { SPA.state.wallet.addCoins(n); renderWallet(true); },
      feedback,
      sound: (m, o) => SPA.sound?.play(m, o),
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
    setTimeout(() => { finishing = false; SPA.sound.play('chamber-complete'); afterChamber(index); }, 400);
  }

  function afterChamber(index) {
    SPA.state.forkFlow.queueForChamber(index + 1);
    persistRun(index);
    if (SPA.CHAMBERS[index] === 'word-vault') return showLostScore(index);
    nextForkOrChamber(index);
  }

  function showLostScore(index) {
    SPA.state.lostScore = new LostScore({ tracker: SPA.state.tracker });
    const best = SPA.state.lostScore.best;
    SPA.showScreen('screen-lost-score');
    const gameNames = { 'pattern-blitz': 'Pattern Blitz', 'color-cascade': 'Color Cascade', 'number-rush': 'Number Rush', 'word-vault': 'the Word Vault' };
    $('lost-score-prompt').textContent =
      `The vault just corrupted one record — your best chamber, ${gameNames[best.game]}. How many did you get right in there? (Your word is the record now.)`;
    $('btn-lost-score-send').onclick = () => {
      const reported = parseInt($('lost-score-input').value, 10);
      if (Number.isNaN(reported)) return;
      const res = SPA.state.lostScore.report(reported);
      if (res.needsRepair) queueRepairScene();
      persistRun(index);
      nextForkOrChamber(index);
    };
  }

  function queueRepairScene() {
    // Repair window (spec hard rule): unshift onto the fork queue so it fires at the
    // very next scene transition — always before the Scramble chamber starts.
    SPA.state.forkFlow.queue.unshift({
      id: 'lost-score-repair',
      prompt: 'The Keeper found a dusty backup of that record… want to double-check what you reported?',
      options: [
        { id: 'check', label: '📼 Check the backup', signal: '__repair_yes' },
        { id: 'leave', label: '🚶 Leave it as reported', signal: '__repair_no' }
      ]
    });
  }

  function persistRun(index) {
    SPA.state.store.save({
      chamberIndex: index,
      wallet: SPA.state.wallet.toJSON(),
      coins: SPA.state.wallet.coins,   // legacy keys kept so pre-v3 saves and
      streak: SPA.state.wallet.streak, // any external readers stay valid
      sceneQueue: SPA.state.forkFlow.queue.map((f) => f.id),
      trackerJson: SPA.state.tracker.toJSON(),
      lostScorePending: !!SPA.state.lostScore?.pendingRepair,
      resumed: SPA.state.resumed,
      dialState: SPA.state.dial.state,
      djState: SPA.state.dj.state
    });
  }

  function nextForkOrChamber(index) {
    const fork = SPA.state.forkFlow.next();
    if (fork) return showFork(fork, index);
    const nextIndex = index + 1;
    if (nextIndex < SPA.CHAMBERS.length) return showInterstitial(SPA.CHAMBERS[nextIndex], () => runChamber(nextIndex));
    return reveal();
  }

  // ---- forks ----
  function showFork(fork, chamberIndex) {
    SPA.showScreen('screen-fork');
    SPA.sound.play('fork');
    $('fork-prompt').textContent = fork.prompt;
    const box = $('fork-options');
    box.innerHTML = '';
    fork.options.forEach((opt) => {
      const btn = document.createElement('button');
      btn.className = 'btn btn-secondary';
      btn.textContent = opt.label;
      btn.addEventListener('click', () => {
        const res = SPA.state.forkFlow.choose(fork, opt.id);
        if (res.signal === '__repair_yes' || res.signal === '__repair_no') {
          SPA.state.lostScore.repair(res.signal === '__repair_yes');
          persistRun(chamberIndex);
          return nextForkOrChamber(chamberIndex);
        }
        SPA.state.tracker.record('fork_choice', { forkId: fork.id, optionId: opt.id, signal: res.signal });
        if (res.grantsCoins) { SPA.state.wallet.addCoins(res.grantsCoins); renderWallet(true); }
        if (res.costsCoins) { SPA.state.wallet.spendCoins(res.costsCoins); renderWallet(true); }
        persistRun(chamberIndex);
        nextForkOrChamber(chamberIndex);
      });
      box.appendChild(btn);
    });
  }

  // ---- reveal + share ----
  function reveal() {
    if (SPA.state.resumed) SPA.state.tracker.record('finished_after_resume', {});
    SPA.state.store.clear();
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
      $('share-greeting').textContent = `\uD83D\uDD11 ${q.invitee_name} \u2014 ${q.message}`;
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
        questCode: SPA.state.quest?.code || '',
        broskiCoins: SPA.state.wallet.coins
      });
      btn.disabled = true;
      const res = await window.SPA_API.submitRun(payload, window.SPA_CONFIG);
      if (res.ok) return thanks(true);
      $('share-feedback').textContent = `Transmission failed (${res.status}) \u2014 try again?`;
      btn.disabled = false;
    } catch (e) {
      $('share-feedback').textContent = e.message;
      btn.disabled = false;
    }
  }

  function thanks(sent) {
    SPA.showScreen('screen-thanks');
    $('thanks-title').textContent = sent ? '\uD83D\uDCE1 Run received by the Keeper.' : '\uD83D\uDD79\uFE0F GG.';
    $('thanks-body').textContent = sent
      ? "If your run lights up the board, you'll hear from a real human. Watch your inbox."
      : 'Your run stayed on this device, as promised. Come back any time.';
    localStorage.removeItem('spa_run');
    localStorage.removeItem('spa_saved_run');
  }

  // ---- quest codes ----
  async function tryQuestCode() {
    const code = $('quest-input').value.trim().toUpperCase();
    if (!code) return;
    $('quest-feedback').textContent = 'Checking the vault\u2026';
    const row = await window.SPA_API.redeemQuestCode(code, window.SPA_CONFIG);
    if (row) {
      localStorage.setItem('spa_quest', JSON.stringify({ code, ...row }));
      $('quest-feedback').textContent = `\uD83D\uDD13 Welcome, ${row.invitee_name}. The Keeper is expecting you.`;
    } else {
      $('quest-feedback').textContent = "That key doesn't fit any lock here.";
    }
  }

  // ---- wiring ----
  document.addEventListener('DOMContentLoaded', () => {
    SPA.sound = new SoundEngine({
      storage: window.localStorage,
      prefersReduced: window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    });
    const muteBtn = $('btn-mute');
    const renderMute = () => { muteBtn.textContent = SPA.sound.muted ? '🔇' : '🔊'; };
    renderMute();
    muteBtn.addEventListener('click', () => { SPA.sound.setMuted(!SPA.sound.muted); renderMute(); });

    $('btn-enter').addEventListener('click', () => {
      SPA.sound.unlock();
      heroField?.stop();
      document.body.classList.remove('boot-playing');
      SPA.showScreen('screen-energy');
    });
    $('btn-quest-code').addEventListener('click', () => $('quest-entry').classList.toggle('hidden'));
    $('btn-quest-go').addEventListener('click', tryQuestCode);
    document.querySelectorAll('.btn-energy').forEach((b) =>
      b.addEventListener('click', () => {
        SPA.sound.unlock();
        newRunState();
        SPA.state.tracker.startRun(b.dataset.energy);
        showInterstitial(SPA.CHAMBERS[0], () => runChamber(0));
      })
    );
    $('btn-to-share').addEventListener('click', showShare);
    $('btn-share-send').addEventListener('click', sendRun);
    $('btn-share-skip').addEventListener('click', () => thanks(false));
    $('btn-again').addEventListener('click', () => location.reload());

    const savedRun = new RunStateStore({ storage: window.localStorage }).load();
    if (savedRun) {
      SPA.showScreen('screen-resume');
      $('btn-resume').addEventListener('click', () => {
        SPA.sound.unlock();
        newRunState();
        SPA.state.tracker.restore(savedRun.trackerJson);
        SPA.state.wallet = Wallet.fromJSON(savedRun.wallet || { coins: savedRun.coins, streak: savedRun.streak });
        renderWallet(false);
        if (savedRun.dialState) SPA.state.dial.state = savedRun.dialState;
        if (savedRun.djState) SPA.state.dj.state = savedRun.djState;
        (savedRun.sceneQueue || []).forEach((id) => {
          const fork = window.SPA_FORKS.find((f) => f.id === id);
          if (fork) SPA.state.forkFlow.queue.push(fork);
        });
        if (savedRun.lostScorePending) {
          SPA.state.lostScore = new LostScore({ tracker: SPA.state.tracker });
          SPA.state.lostScore.pendingRepair = true;
          queueRepairScene();
        }
        const { resumeGapMs } = SPA.state.store.markResumed();
        SPA.state.resumed = true;
        SPA.state.tracker.record('run_resumed', { resumeGapMs });
        // The saved chamberIndex is the chamber that had already FINISHED at save
        // time (persistRun is called from afterChamber, post-completion). Re-running
        // it would replay/double-record it. nextForkOrChamber is the same function the
        // normal flow uses after a chamber finishes: it flushes any pending forks
        // (including a re-queued repair scene) first, then advances to the next chamber.
        nextForkOrChamber(savedRun.chamberIndex);
      });
      $('btn-start-fresh').addEventListener('click', () => {
        new RunStateStore({ storage: window.localStorage }).clear();
        enterLandingWithBoot();
      });
    } else {
      enterLandingWithBoot();
    }
  });
})();
