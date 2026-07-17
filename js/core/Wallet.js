/**
 * Wallet — THE single source of truth for in-run coins + streak (spec §3d).
 * Replaces the fragmented trio: SPA.state.coins / SPA.state.streak /
 * BROskiWallet.balance (that file is a dormant unloaded web3 scaffold).
 * Pure logic; app.js renders it into the HUD.
 */
class Wallet {
  constructor({ coins = 0, streak = 0 } = {}) {
    this._coins = Math.max(0, coins);
    this._streak = Math.max(0, streak);
  }

  get coins() { return this._coins; }
  get streak() { return this._streak; }

  setCoins(n) { this._coins = Math.max(0, n); }
  addCoins(n) { if (n > 0) this._coins += n; }

  spendCoins(n) {
    if (n > 0 && this._coins >= n) { this._coins -= n; return true; }
    return false;
  }

  recordAnswer(correct) {
    this._streak = correct ? this._streak + 1 : 0;
    return { streak: this._streak };
  }

  toJSON() { return { coins: this._coins, streak: this._streak }; }

  static fromJSON(json) { return new Wallet(json || {}); }
}

if (typeof module !== 'undefined' && module.exports) { module.exports = Wallet; }
else { window.Wallet = Wallet; }
