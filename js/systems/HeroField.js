/**
 * HeroField — ambient drifting particle layer for the entrance hero (spec §3a).
 * Claims the #particle-canvas element (previously dead markup). Deliberately
 * separate from ParticleSystem: that engine is burst physics (spawn→arc→die);
 * this is a persistent, slow, low-density field. start()/stop() lifecycle only.
 */
class HeroField {
  constructor({ canvas, particleCount = 40 } = {}) {
    this.canvas = canvas;
    this.ctx = canvas ? canvas.getContext('2d') : null;
    this.particleCount = particleCount;
    this.particles = [];
    this.raf = null;
    this.pixelRatio = window.devicePixelRatio || 1;
    this._onResize = () => this._resize();
  }

  _resize() {
    this.canvas.width = window.innerWidth * this.pixelRatio;
    this.canvas.height = window.innerHeight * this.pixelRatio;
    this.ctx.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
  }

  _spawn() {
    const COLORS = ['#4ECDC4', '#FFD700', '#FF6B9D'];
    this.particles = Array.from({ length: this.particleCount }, () => {
      const depth = 0.4 + Math.random() * 0.6; // 3 visual layers via continuous depth
      return {
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vy: -(0.1 + depth * 0.25),            // deeper = slightly faster drift up
        size: 1 + depth * 2.2,
        alpha: 0.08 + depth * 0.22,
        color: COLORS[Math.floor(Math.random() * COLORS.length)]
      };
    });
  }

  start() {
    if (!this.ctx || this.raf) return;
    this._resize();
    window.addEventListener('resize', this._onResize);
    this._spawn();
    const step = () => {
      this.ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      for (const p of this.particles) {
        p.y += p.vy;
        if (p.y < -5) { p.y = window.innerHeight + 5; p.x = Math.random() * window.innerWidth; }
        this.ctx.globalAlpha = p.alpha;
        this.ctx.fillStyle = p.color;
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        this.ctx.fill();
      }
      this.ctx.globalAlpha = 1;
      this.raf = requestAnimationFrame(step);
    };
    this.raf = requestAnimationFrame(step);
  }

  stop() {
    if (this.raf) { cancelAnimationFrame(this.raf); this.raf = null; }
    window.removeEventListener('resize', this._onResize);
    if (this.ctx) this.ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  }
}

if (typeof module !== 'undefined' && module.exports) { module.exports = HeroField; }
else { window.HeroField = HeroField; }
