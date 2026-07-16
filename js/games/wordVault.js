/**
 * DOM Wrapper for WordVault
 * Mode-pick screen (Word / Symbol — equal buttons, neither labelled easier) then 8 rounds.
 */
(function() {
  if (typeof window.SPA === 'undefined') window.SPA = { games: {} };

  window.SPA.games['word-vault'] = {
    icon: '📖',
    durationSec: null, // Rounds handle their own time

    mount(el, ctx) {
      el.innerHTML = '';

      const logic = new window.WordVault({
        tracker: window.SPA.state.tracker,
        dial: window.SPA.state.dial,
        dj: window.SPA.state.dj
      });

      const container = document.createElement('div');
      container.className = 'col game-container';
      el.appendChild(container);

      let timer;

      function renderModePick() {
        container.innerHTML = '';

        const heading = document.createElement('h3');
        heading.textContent = 'Choose your vault';
        container.appendChild(heading);

        const modeGrid = document.createElement('div');
        modeGrid.className = 'grid';
        modeGrid.style.display = 'grid';
        modeGrid.style.gridTemplateColumns = '1fr 1fr';
        modeGrid.style.gap = '10px';

        const wordBtn = document.createElement('button');
        wordBtn.className = 'btn btn-primary';
        wordBtn.style.fontSize = '1.2rem';
        wordBtn.style.padding = '20px';
        wordBtn.textContent = '📖 Word Vault';
        wordBtn.onclick = () => chooseMode('word');

        const symbolBtn = document.createElement('button');
        symbolBtn.className = 'btn btn-primary';
        symbolBtn.style.fontSize = '1.2rem';
        symbolBtn.style.padding = '20px';
        symbolBtn.textContent = '🔷 Symbol Vault';
        symbolBtn.onclick = () => chooseMode('symbol');

        modeGrid.appendChild(wordBtn);
        modeGrid.appendChild(symbolBtn);
        container.appendChild(modeGrid);
      }

      function chooseMode(mode) {
        logic.chooseMode(mode);
        renderRoundScreen();
        renderRound();
      }

      // Round-screen elements (built once mode is chosen; reused across rounds)
      let roundDisplay, odToggleBtn, promptDisplay, choicesContainer, timerBar;

      function renderRoundScreen() {
        container.innerHTML = '';

        const header = document.createElement('div');
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.alignItems = 'center';

        roundDisplay = document.createElement('h3');
        header.appendChild(roundDisplay);

        if (logic.mode === 'word') {
          odToggleBtn = document.createElement('button');
          odToggleBtn.className = 'btn btn-ghost';
          odToggleBtn.style.fontSize = '.9rem';
          odToggleBtn.textContent = 'Aa OpenDyslexic';
          odToggleBtn.onclick = () => document.body.classList.toggle('font-od');
          header.appendChild(odToggleBtn);
        }

        container.appendChild(header);

        promptDisplay = document.createElement('div');
        promptDisplay.style.fontSize = '1.4rem';
        promptDisplay.style.margin = '20px 0';
        container.appendChild(promptDisplay);

        choicesContainer = document.createElement('div');
        choicesContainer.className = 'grid';
        choicesContainer.style.display = 'grid';
        choicesContainer.style.gridTemplateColumns = '1fr 1fr';
        choicesContainer.style.gap = '10px';
        container.appendChild(choicesContainer);

        timerBar = document.createElement('div');
        timerBar.style.height = '5px';
        timerBar.style.background = '#4ECDC4';
        timerBar.style.width = '100%';
        timerBar.style.transition = 'width linear';
        container.appendChild(timerBar);
      }

      function renderRound() {
        if (logic.isComplete()) {
          document.body.classList.remove('font-od');
          return ctx.complete();
        }

        const state = logic.nextRound();
        if (!state) {
          document.body.classList.remove('font-od');
          return ctx.complete();
        }

        roundDisplay.textContent = `Round ${state.round} / ${state.total}`;
        promptDisplay.textContent = state.prompt;

        choicesContainer.innerHTML = '';
        state.choices.forEach(choice => {
          const btn = document.createElement('button');
          btn.className = 'btn btn-secondary';
          btn.style.fontSize = '1.3rem';
          btn.textContent = choice;
          btn.onclick = () => handleAnswer(choice);
          choicesContainer.appendChild(btn);
        });

        // Timer bar animation
        timerBar.style.transition = 'none';
        timerBar.style.width = '100%';
        // Force reflow
        void timerBar.offsetWidth;
        timerBar.style.transition = `width ${state.timeLimit}ms linear`;
        timerBar.style.width = '0%';

        timer = setTimeout(() => {
          logic.timeout();
          ctx.feedback('TIMEOUT!', 'warning');
          renderRound();
        }, state.timeLimit);
      }

      function handleAnswer(choice) {
        clearTimeout(timer);
        const res = logic.answer(choice);
        ctx.onRound(res.correct, res.timeMs);
        if (!res.correct) {
          ctx.feedback('MISS', 'warning');
        }
        renderRound();
      }

      renderModePick();
    }
  };
})();
