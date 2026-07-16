/**
 * DOM Wrapper for The Scramble
 * Messy inventory + boss-door glyph preview. The cue (3 glyphs) is rendered
 * on this screen — never dependent on memory from earlier in the run.
 */
(function() {
  if (typeof window.SPA === 'undefined') window.SPA = { games: {} };

  window.SPA.games['scramble'] = {
    icon: '🎒',
    durationSec: null, // Renders its own 30s countdown

    mount(el, ctx) {
      el.innerHTML = '';

      const DATA = window.SPA_SCRAMBLE;
      const logic = new window.Scramble({
        tracker: window.SPA.state.tracker,
        data: DATA
      });

      const container = document.createElement('div');
      container.className = 'col game-container';

      // --- Door-glyph preview strip (the cue) ---
      const doorPreview = document.createElement('div');
      doorPreview.className = 'scramble-door-preview';
      doorPreview.style.display = 'flex';
      doorPreview.style.justifyContent = 'center';
      doorPreview.style.gap = '20px';
      doorPreview.style.margin = '10px 0 20px';
      doorPreview.style.fontSize = '3rem';
      DATA.doorGlyphs.forEach(g => {
        const slot = document.createElement('span');
        slot.textContent = g;
        slot.style.padding = '10px 16px';
        slot.style.border = '2px solid #4ECDC4';
        slot.style.borderRadius = '8px';
        doorPreview.appendChild(slot);
      });

      const heading = document.createElement('h3');
      heading.textContent = 'Grab the 3 items that match the door';

      const countdown = document.createElement('div');
      countdown.style.fontSize = '1.1rem';
      countdown.style.margin = '4px 0 12px';

      // --- Shuffled item grid (clutter) ---
      const grid = document.createElement('div');
      grid.className = 'grid scramble-grid';
      grid.style.display = 'grid';
      grid.style.gridTemplateColumns = 'repeat(3, 1fr)';
      grid.style.gap = '8px';
      grid.style.margin = '10px 0';

      const confirmBtn = document.createElement('button');
      confirmBtn.className = 'btn btn-primary';
      confirmBtn.textContent = 'CONFIRM PICKS';
      confirmBtn.disabled = true;
      confirmBtn.style.marginTop = '16px';

      container.appendChild(doorPreview);
      container.appendChild(heading);
      container.appendChild(countdown);
      container.appendChild(grid);
      container.appendChild(confirmBtn);
      el.appendChild(container);

      // Shuffle DISPLAY ORDER ONLY — logic always keyed by item id.
      const shuffled = [...DATA.items].sort(() => Math.random() - 0.5);
      const btnById = {};

      shuffled.forEach(item => {
        const btn = document.createElement('button');
        btn.className = 'btn btn-secondary scramble-item';
        btn.style.fontSize = '1rem';
        btn.style.padding = '14px 8px';
        btn.textContent = item.glyph ? `${item.glyph} ${item.label}` : item.label;
        btn.onclick = () => handleToggle(item.id, btn);
        grid.appendChild(btn);
        btnById[item.id] = btn;
      });

      function handleToggle(id, btn) {
        const res = logic.togglePick(id);
        if (res.rejected) {
          ctx.feedback('Only 3 allowed', 'warning');
          return;
        }
        btn.classList.toggle('picked', res.picked);
        confirmBtn.disabled = logic.picks.size !== 3;
      }

      confirmBtn.onclick = () => {
        if (logic.picks.size !== 3) return;
        clearInterval(intervalId);
        logic.confirm();
        ctx.complete();
      };

      // --- Own 30s countdown ---
      let left = DATA.timeLimitSec;
      countdown.textContent = `${left}s`;
      logic.begin();
      const intervalId = setInterval(() => {
        left--;
        countdown.textContent = `${left}s`;
        if (left <= 0) {
          clearInterval(intervalId);
          logic.timeout();
          ctx.complete();
        }
      }, 1000);
    }
  };
})();
