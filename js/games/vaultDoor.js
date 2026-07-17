/**
 * 3D Vault Door - Boss Chamber Wrapper
 * Uses Vanilla Three.js to render a 3D environment for the VaultDoor logic.
 */
(function() {
  if (typeof window.SPA === 'undefined') window.SPA = { games: {} };

  window.SPA.games['vault-door'] = {
    icon: '🚪',
    durationSec: null, // Untimed

    mount(el, ctx) {
      el.innerHTML = '';
      
      // Initialize Logic
      // Assuming VaultDoor logic is loaded globally
      const logic = new window.VaultDoor({ 
        tracker: { record: (t, d) => ctx.trackerRecord(t, d) } 
      });
      const gameState = logic.start();
      let currentCombo = [gameState.glyphs[0], gameState.glyphs[0], gameState.glyphs[0], gameState.glyphs[0]];

      // Animation state the UI handlers below close over — initialized BEFORE
      // those handlers are created, so a failed 3D setup (no WebGL) can't leave
      // them referencing TDZ bindings and soft-lock the combo.
      let rings = [];
      let isOpening = false;
      let cameraShake = 0;

      // UI Overlay for interaction
      const uiLayer = document.createElement('div');
      uiLayer.style.position = 'absolute';
      uiLayer.style.top = '0';
      uiLayer.style.left = '0';
      uiLayer.style.width = '100%';
      uiLayer.style.height = '100%';
      uiLayer.style.display = 'flex';
      uiLayer.style.flexDirection = 'column';
      uiLayer.style.justifyContent = 'center';
      uiLayer.style.alignItems = 'center';
      uiLayer.style.pointerEvents = 'none'; // Let clicks pass to 3D if needed, but we will use DOM buttons for glyphs for simplicity
      uiLayer.style.zIndex = '1'; // above the renderer canvas, which is appended later
      
      const title = document.createElement('h2');
      title.textContent = gameState.narrative;
      title.style.color = '#fff';
      title.style.textShadow = '0 0 10px #0f0';
      uiLayer.appendChild(title);

      const slotsContainer = document.createElement('div');
      slotsContainer.style.display = 'flex';
      slotsContainer.style.gap = '20px';
      slotsContainer.style.pointerEvents = 'auto';
      slotsContainer.style.marginTop = '100px'; // push down to see the 3D vault

      const slotBtns = [];
      for (let i = 0; i < gameState.slots; i++) {
        const btn = document.createElement('button');
        btn.className = 'btn btn-secondary';
        btn.style.fontSize = '2rem';
        btn.style.minWidth = '60px';
        btn.textContent = currentCombo[i];
        btn.onclick = () => {
          let idx = gameState.glyphs.indexOf(currentCombo[i]);
          idx = (idx + 1) % gameState.glyphs.length;
          currentCombo[i] = gameState.glyphs[idx];
          btn.textContent = currentCombo[i];
          // Set target rotation for smooth easing
          if (rings[i]) {
             rings[i].userData.targetRotationX += Math.PI / 4;
          }
        };
        slotsContainer.appendChild(btn);
        slotBtns.push(btn);
      }
      uiLayer.appendChild(slotsContainer);

      const submitBtn = document.createElement('button');
      submitBtn.className = 'btn btn-primary';
      submitBtn.style.marginTop = '30px';
      submitBtn.style.pointerEvents = 'auto';
      submitBtn.textContent = 'UNLOCK';
      submitBtn.onclick = () => {
        const res = logic.attempt(currentCombo);
        if (res.correct) {
          ctx.feedback('VAULT OPENED', 'success');
          ctx.sound?.('vault-open');
          // Grant BROski$
          ctx.grantCoins(500); // 500 BROski$ for beating the boss

          // Animate vault door opening
          isOpening = true;
          setTimeout(() => {
            ctx.complete();
          }, 3500);
        } else {
          ctx.feedback(res.nudge || 'ACCESS DENIED', 'warning');
          // Smooth camera shake setup
          cameraShake = 1.0;
          // Same threshold the nudge text uses (attempts >= 5) so the
          // "leave it for now" option appears exactly when the vault
          // starts nudging the player.
          if (res.nudge) {
            abandonBtn.style.display = 'inline-block';
          }
        }
      };
      uiLayer.appendChild(submitBtn);

      // Abandon path — hidden until the player has made a genuine run at
      // it (mirrors VaultDoor.attempt()'s nudge threshold). Neutral tone:
      // stepping back from an unwinnable-feeling puzzle isn't a failure.
      const abandonBtn = document.createElement('button');
      abandonBtn.className = 'btn btn-secondary';
      abandonBtn.style.marginTop = '15px';
      abandonBtn.style.pointerEvents = 'auto';
      abandonBtn.style.display = 'none';
      abandonBtn.textContent = 'Leave it for now';
      abandonBtn.onclick = () => {
        logic.abandon();
        ctx.complete();
      };
      uiLayer.appendChild(abandonBtn);

      el.appendChild(uiLayer);

      // --- THREE.JS SETUP ---
      // Wrapped so devices without WebGL still get a fully playable DOM chamber:
      // no 3D backdrop, but slots, UNLOCK, abandon, and completion all work.
      try {
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x050505);
      scene.fog = new THREE.Fog(0x050505, 10, 50);

      const camera = new THREE.PerspectiveCamera(75, el.clientWidth / el.clientHeight, 0.1, 1000);
      camera.position.z = 10;

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(el.clientWidth, el.clientHeight);
      // Ensure canvas fits inside the game-content area
      renderer.domElement.style.position = 'absolute';
      renderer.domElement.style.top = '0';
      renderer.domElement.style.left = '0';
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      renderer.domElement.style.pointerEvents = 'none';
      el.appendChild(renderer.domElement);

      // Lighting
      const ambient = new THREE.AmbientLight(0x111111);
      scene.add(ambient);
      const spotLight = new THREE.SpotLight(0x00ff66, 5);
      spotLight.position.set(0, 10, 15);
      spotLight.angle = Math.PI / 3;
      spotLight.penumbra = 0.5;
      scene.add(spotLight);
      
      const pointLight = new THREE.PointLight(0xffffff, 2, 20);
      pointLight.position.set(0, -5, 5);
      scene.add(pointLight);

      // Vault Door (Large Cylinder)
      const doorGeo = new THREE.CylinderGeometry(5, 5, 1, 64);
      const doorMat = new THREE.MeshStandardMaterial({ 
        color: 0x111111, 
        metalness: 0.9,
        roughness: 0.2
      });
      const door = new THREE.Mesh(doorGeo, doorMat);
      door.rotation.x = Math.PI / 2;
      scene.add(door);

      // Rings (to represent slots) — array itself is hoisted above the UI handlers
      for (let i = 0; i < 4; i++) {
        const ringGeo = new THREE.TorusGeometry(1 + i * 0.8, 0.15, 32, 100);
        const ringMat = new THREE.MeshStandardMaterial({ 
          color: 0x00ffaa,
          metalness: 0.8,
          roughness: 0.1,
          emissive: 0x003311,
          emissiveIntensity: 0.5
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.userData = { targetRotationX: 0, currentRotationX: 0 };
        door.add(ring);
        rings.push(ring);
      }

      let frameId;
      const baseCameraPos = new THREE.Vector3(0, 0, 10);

      function animate() {
        frameId = requestAnimationFrame(animate);
        
        // Ring easing
        rings.forEach((ring, i) => {
          ring.userData.currentRotationX += (ring.userData.targetRotationX - ring.userData.currentRotationX) * 0.1;
          ring.rotation.x = ring.userData.currentRotationX;
          // Subtly rotate opposite directions
          ring.rotation.z += (i % 2 === 0 ? 0.005 : -0.005) * (isOpening ? 5 : 1);
        });

        // Camera Shake
        if (cameraShake > 0.01) {
          camera.position.x = baseCameraPos.x + (Math.random() - 0.5) * cameraShake;
          camera.position.y = baseCameraPos.y + (Math.random() - 0.5) * cameraShake;
          cameraShake *= 0.9;
        } else {
          camera.position.copy(baseCameraPos);
        }

        // Idle / Open animation
        if (!isOpening) {
          door.rotation.z += 0.001;
          spotLight.intensity = 5 + Math.sin(Date.now() * 0.002) * 1; // Pulsing light
        } else {
          // Open animation: rotate door backwards, emit bright light
          door.rotation.y -= 0.03;
          door.position.z -= 0.08;
          spotLight.color.setHex(0xffffff);
          spotLight.intensity += 0.5;
          ambient.intensity += 0.05;
        }

        renderer.render(scene, camera);
      }
      animate();

      // Handle Resize
      const resizeObserver = new ResizeObserver(() => {
        if (!el.clientWidth || !el.clientHeight) return;
        camera.aspect = el.clientWidth / el.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(el.clientWidth, el.clientHeight);
      });
      resizeObserver.observe(el);

      // Cleanup on unmount (if we had an unmount hook, but finishChamber clears the DOM anyway)
      // The DOM clearing in app.js will remove the canvas.
      } catch (err) {
        // No WebGL (blocked GPU, ancient device): skip the 3D backdrop entirely.
        // rings stays empty, so the slot handlers' `if (rings[i])` guards no-op.
        console.warn('VaultDoor: 3D backdrop disabled —', err && err.message ? err.message : err);
      }
    }
  };
})();
