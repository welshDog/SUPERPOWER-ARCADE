
/**
 * 🪙 The Dopamine DJ (Reward Agent)
 * 
 * "ADHD brains crave a variable reward schedule to stay engaged."
 * 
 * Responsibilities:
 * 1. Monitor Momentum (Streak & Speed).
 * 2. Manage the BROski$ Coin Economy.
 * 3. Trigger Variable Reward Drops (Coins, Visuals).
 */

class DopamineDJ {
    constructor(config = {}) {
        this.config = {
            baseDropChance: 0.15,    // 15% base chance per correct answer
            streakMultiplier: 0.05,  // +5% chance per streak count
            maxDropChance: 0.80,     // Cap at 80%
            coinValues: [1, 5, 10],  // Standard, Silver, Gold drops
            momentumWindow: 3,       // Number of fast answers to trigger "Momentum"
            ...config
        };

        this.state = {
            wallet: 0,
            sessionCoins: 0,
            momentum: 0, // 0-100
            history: [],
            lastDropTime: 0
        };
    }

    /**
     * Resets session-specific tracking (but keeps wallet!)
     * @param {number} currentWallet - Existing balance
     */
    initializeSession(currentWallet = 0) {
        this.state.wallet = currentWallet;
        this.state.sessionCoins = 0;
        this.state.momentum = 0;
        this.state.history = [];
    }

    /**
     * Processes a player response to determine rewards
     * @param {boolean} isCorrect 
     * @param {number} timeMs 
     * @param {number} currentStreak 
     * @returns {Object} { drop: boolean, amount: number, message: string, effect: string }
     */
    processResponse(isCorrect, timeMs, currentStreak) {
        if (!isCorrect) {
            this.state.momentum = Math.max(0, this.state.momentum - 20);
            return { drop: false };
        }

        // 1. Calculate Momentum
        // Fast answer (<800ms) builds momentum
        if (timeMs < 800) {
            this.state.momentum = Math.min(100, this.state.momentum + 15);
        } else {
            this.state.momentum = Math.max(0, this.state.momentum - 5);
        }

        // 2. Calculate Drop Chance
        // Variable Ratio Schedule: Base + (Streak * Multiplier) + (Momentum Bonus)
        let dropChance = this.config.baseDropChance + 
                        (currentStreak * this.config.streakMultiplier) +
                        (this.state.momentum / 200); // Up to +50% from max momentum

        dropChance = Math.min(this.config.maxDropChance, dropChance);

        // 3. Roll the Dice
        const roll = Math.random();
        
        if (roll < dropChance) {
            return this.triggerDrop(currentStreak);
        }

        return { drop: false };
    }

    /**
     * Generates the reward payload
     */
    triggerDrop(streak) {
        let amount = 1;
        let type = 'standard';
        let message = '🪙 +1 Coin';
        let effect = 'coin-pop';

        // Critical Hit (High Streak or Lucky Roll)
        const critRoll = Math.random();
        
        if (streak >= 10 || critRoll > 0.95) {
            amount = 10;
            type = 'gold';
            message = '💰 JACKPOT! +10 Coins';
            effect = 'coin-shower';
        } else if (streak >= 5 || critRoll > 0.80) {
            amount = 5;
            type = 'silver';
            message = '🪙 Big Drop! +5 Coins';
            effect = 'coin-burst';
        }

        this.state.wallet += amount;
        this.state.sessionCoins += amount;
        this.state.lastDropTime = Date.now();

        return {
            drop: true,
            amount: amount,
            type: type,
            message: message,
            effect: effect,
            totalWallet: this.state.wallet
        };
    }

    getWalletBalance() {
        return this.state.wallet;
    }

    getSessionEarnings() {
        return this.state.sessionCoins;
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DopamineDJ;
} else {
    window.DopamineDJ = DopamineDJ;
}
