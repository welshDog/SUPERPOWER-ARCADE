/**
 * DOM Wrapper for NumberRush
 */
(function() {
  if (typeof window.SPA === 'undefined') window.SPA = { games: {} };

  window.SPA.games['number-rush'] = {
    icon: '🔢',
    durationSec: null,

    mount(el, ctx) {
      el.innerHTML = '';
      
      const logic = new window.NumberRush({ 
        tracker: window.SPA.state.tracker,
        dial: window.SPA.state.dial,
        dj: window.SPA.state.dj
      });
      
      const container = document.createElement('div');
      container.className = 'col game-container';
      
      const roundDisplay = document.createElement('h3');
      
      const sequenceDisplay = document.createElement('div');
      sequenceDisplay.style.fontSize = '2.5rem';
      sequenceDisplay.style.fontWeight = 'bold';
      sequenceDisplay.style.margin = '20px 0';
      sequenceDisplay.style.letterSpacing = '5px';

      const hintDisplay = document.createElement('p');
      hintDisplay.style.color = '#888';
      hintDisplay.style.fontStyle = 'italic';
      hintDisplay.style.height = '1.5rem'; // Keep space even if empty

      const choicesContainer = document.createElement('div');
      choicesContainer.className = 'grid';
      choicesContainer.style.display = 'grid';
      choicesContainer.style.gridTemplateColumns = '1fr 1fr';
      choicesContainer.style.gap = '15px';
      choicesContainer.style.marginTop = '20px';

      const timerBar = document.createElement('div');
      timerBar.style.height = '5px';
      timerBar.style.background = '#FFD700';
      timerBar.style.width = '100%';
      timerBar.style.transition = 'width linear';
      timerBar.style.marginTop = '20px';

      container.appendChild(roundDisplay);
      container.appendChild(sequenceDisplay);
      container.appendChild(hintDisplay);
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
        sequenceDisplay.textContent = state.sequence.slice(0, 3).join(', ') + ', ?';
        hintDisplay.textContent = state.hint ? `Hint: ${state.hint}` : '';
        
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
        void timerBar.offsetWidth; // Force reflow
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
          ctx.feedback('INCORRECT', 'error');
        }
        renderRound();
      }

      renderRound();
    }
  };
})();
