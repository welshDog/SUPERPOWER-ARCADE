/**
 * DOM Wrapper for PatternBlitz
 */
(function() {
  if (typeof window.SPA === 'undefined') window.SPA = { games: {} };

  window.SPA.games['pattern-blitz'] = {
    icon: '⚡',
    durationSec: null, // Rounds handle their own time

    mount(el, ctx) {
      el.innerHTML = '';
      
      const logic = new window.PatternBlitz({ 
        tracker: window.SPA.state.tracker,
        dial: window.SPA.state.dial,
        dj: window.SPA.state.dj
      });
      
      const container = document.createElement('div');
      container.className = 'col game-container';
      
      const roundDisplay = document.createElement('h3');
      const sequenceDisplay = document.createElement('div');
      sequenceDisplay.style.fontSize = '3rem';
      sequenceDisplay.style.letterSpacing = '10px';
      sequenceDisplay.style.margin = '20px 0';

      const choicesContainer = document.createElement('div');
      choicesContainer.className = 'grid';
      choicesContainer.style.display = 'grid';
      choicesContainer.style.gridTemplateColumns = '1fr 1fr';
      choicesContainer.style.gap = '10px';

      const timerBar = document.createElement('div');
      timerBar.style.height = '5px';
      timerBar.style.background = '#4ECDC4';
      timerBar.style.width = '100%';
      timerBar.style.transition = 'width linear';

      container.appendChild(roundDisplay);
      container.appendChild(sequenceDisplay);
      container.appendChild(choicesContainer);
      container.appendChild(timerBar);
      el.appendChild(container);

      let timer;

      function renderRound() {
        if (logic.isComplete()) {
          return ctx.complete();
        }
        
        const state = logic.nextRound();
        if (!state) return ctx.complete();
        
        roundDisplay.textContent = `Round ${state.round} / ${state.total}`;
        sequenceDisplay.textContent = state.sequence.join('');
        
        choicesContainer.innerHTML = '';
        state.choices.forEach(choice => {
          const btn = document.createElement('button');
          btn.className = 'btn btn-secondary';
          btn.style.fontSize = '1.5rem';
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
          const res = logic.timeout();
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

      renderRound();
    }
  };
})();
