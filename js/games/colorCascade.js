/**
 * DOM Wrapper for ColorCascade
 */
(function() {
  if (typeof window.SPA === 'undefined') window.SPA = { games: {} };

  window.SPA.games['color-cascade'] = {
    icon: '🌈',
    durationSec: null, // Rounds handle time

    mount(el, ctx) {
      el.innerHTML = '';
      
      const logic = new window.ColorCascade({ 
        tracker: window.SPA.state.tracker,
        dial: window.SPA.state.dial,
        dj: window.SPA.state.dj
      });
      
      const container = document.createElement('div');
      container.className = 'col game-container';
      
      const roundDisplay = document.createElement('h3');
      
      const grid = document.createElement('div');
      grid.style.display = 'grid';
      grid.style.gridTemplateColumns = 'repeat(3, 1fr)';
      grid.style.gap = '15px';
      grid.style.marginTop = '20px';

      container.appendChild(roundDisplay);
      container.appendChild(grid);
      el.appendChild(container);

      let playerSequence = [];
      let currentSequence = [];
      let inputEnabled = false;

      function renderRound() {
        if (logic.isComplete()) {
          return ctx.complete();
        }
        
        const state = logic.nextRound();
        if (!state) return ctx.complete();
        
        roundDisplay.textContent = `Span ${state.sequence.length} (Round ${state.round} / ${state.total})`;
        currentSequence = state.sequence;
        playerSequence = [];
        inputEnabled = false;

        // Build grid
        grid.innerHTML = '';
        const buttons = {};
        state.colors.forEach(c => {
          const btn = document.createElement('button');
          btn.className = 'btn btn-secondary';
          btn.style.width = '80px';
          btn.style.height = '80px';
          btn.style.fontSize = '2rem';
          btn.style.backgroundColor = '#333';
          btn.style.transition = 'background-color 0.1s';
          btn.textContent = c.label;
          btn.onclick = () => handleInput(c);
          grid.appendChild(btn);
          buttons[c.id] = { btn, color: c.hex };
        });

        // Flash sequence
        let step = 0;
        function flashNext() {
          if (step >= state.sequence.length) {
            inputEnabled = true;
            return;
          }
          const cId = state.sequence[step];
          const b = buttons[cId];
          b.btn.style.backgroundColor = b.color;
          
          setTimeout(() => {
            b.btn.style.backgroundColor = '#333';
            step++;
            setTimeout(flashNext, state.flashMs / 2);
          }, state.flashMs);
        }

        setTimeout(flashNext, 500);
      }

      function handleInput(c) {
        if (!inputEnabled) return;
        playerSequence.push(c.id);
        
        // Flash on click
        const btns = Array.from(grid.children);
        const idx = logic.COLORS.findIndex(color => color.id === c.id);
        if (btns[idx]) {
          btns[idx].style.backgroundColor = c.hex;
          setTimeout(() => btns[idx].style.backgroundColor = '#333', 150);
        }

        // Check if finished
        if (playerSequence.length === currentSequence.length) {
          inputEnabled = false;
          setTimeout(() => {
            const res = logic.answer(playerSequence);
            ctx.onRound(res.correct, res.timeMs);
            if (!res.correct) {
              ctx.feedback('PATTERN BROKEN', 'warning');
            } else {
              ctx.feedback('MATCH', 'success');
            }
            setTimeout(renderRound, 500);
          }, 300);
        }
      }

      renderRound();
    }
  };
})();
