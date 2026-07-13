
/**
 * ✨ Particle System for "Juicy" Visual Feedback
 * 
 * Uses HTML5 Canvas to render high-performance particle effects
 * without blocking the main thread.
 * 
 * Capabilities:
 * - Coin showers (Jackpots)
 * - Confetti bursts (Level Up)
 * - Sparkles (High Streak)
 */

class ParticleSystem {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.particles = [];
        this.isActive = false;
        this.animationFrame = null;
        this.pixelRatio = window.devicePixelRatio || 1;
        
        // Configuration
        this.config = {
            maxParticles: 500, // Hard limit for performance
            gravity: 0.5,
            drag: 0.98,
            colors: {
                gold: ['#FFD700', '#FFA500', '#FFFF00'],
                silver: ['#C0C0C0', '#E8E8E8', '#A9A9A9'],
                confetti: ['#FF6B35', '#4ECDC4', '#FFD700', '#FF00FF', '#00FFFF']
            }
        };

        this.init();
    }

    init() {
        // Create overlay canvas
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'particle-overlay';
        this.canvas.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 9999;
        `;
        document.body.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');
        
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        this.canvas.width = window.innerWidth * this.pixelRatio;
        this.canvas.height = window.innerHeight * this.pixelRatio;
        this.ctx.scale(this.pixelRatio, this.pixelRatio);
    }

    /**
     * Emits a burst of particles
     * @param {number} x - Origin X (screen coordinates)
     * @param {number} y - Origin Y (screen coordinates)
     * @param {string} type - 'coins', 'confetti', 'sparkles'
     * @param {number} count - Number of particles
     */
    emit(x, y, type = 'confetti', count = 50) {
        if (this.particles.length > this.config.maxParticles) return;

        const colors = this.config.colors[type === 'coins' ? 'gold' : type] || this.config.colors.confetti;

        for (let i = 0; i < count; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 15,
                vy: (Math.random() - 0.5) * 15 - 5, // Upward bias
                size: Math.random() * 8 + 4,
                color: colors[Math.floor(Math.random() * colors.length)],
                life: 1.0,
                decay: 0.01 + Math.random() * 0.02,
                type: type
            });
        }

        if (!this.isActive) {
            this.isActive = true;
            this.animate();
        }
    }

    animate() {
        if (!this.isActive) return;

        this.ctx.clearRect(0, 0, this.canvas.width / this.pixelRatio, this.canvas.height / this.pixelRatio);

        // Update and draw particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];

            // Physics
            p.x += p.vx;
            p.y += p.vy;
            p.vy += this.config.gravity;
            p.vx *= this.config.drag;
            p.life -= p.decay;

            // Render
            this.ctx.globalAlpha = p.life;
            this.ctx.fillStyle = p.color;
            
            if (p.type === 'coins') {
                // Circle for coins
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                this.ctx.fill();
            } else {
                // Square for confetti
                this.ctx.fillRect(p.x, p.y, p.size, p.size);
            }

            // Remove dead particles
            if (p.life <= 0 || p.y > window.innerHeight + 50) {
                this.particles.splice(i, 1);
            }
        }

        if (this.particles.length > 0) {
            this.animationFrame = requestAnimationFrame(() => this.animate());
        } else {
            this.isActive = false;
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }

    /**
     * Trigger a full screen celebration
     */
    celebrate() {
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;
        this.emit(cx, cy, 'confetti', 100);
        setTimeout(() => this.emit(cx - 200, cy - 100, 'confetti', 80), 200);
        setTimeout(() => this.emit(cx + 200, cy - 100, 'confetti', 80), 400);
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ParticleSystem;
} else {
    window.ParticleSystem = ParticleSystem;
}
