
/**
 * 🎚️ The Difficulty Dial (Adaptive Scaffolding Agent)
 * 
 * "If an ADHD brain gets bored, it drifts; if it gets overwhelmed, it shuts down."
 * 
 * Responsibilities:
 * 1. Analyze reaction times and error rates in real-time.
 * 2. Detect Boredom (too easy) vs. Frustration (too hard).
 * 3. Adjust game parameters dynamically to maintain Flow State.
 */

class DifficultyDial {
    constructor(config = {}) {
        this.config = {
            windowSize: 5,           // Number of attempts to analyze
            boredomThresholdMs: 500, // Reaction time considered "too fast/easy"
            frustrationThreshold: 2, // Number of errors in window to trigger help
            minDifficulty: 1,
            maxDifficulty: 10,
            ...config
        };

        this.state = {
            currentDifficulty: 1,
            history: [], // Stores { isCorrect, timeMs, timestamp }
            consecutiveCorrect: 0,
            consecutiveErrors: 0,
            lastAdjustmentTime: 0
        };
    }

    /**
     * Resets the agent for a new game session
     * @param {number} startLevel - Initial difficulty level
     */
    reset(startLevel = 1) {
        this.state = {
            currentDifficulty: startLevel,
            history: [],
            consecutiveCorrect: 0,
            consecutiveErrors: 0,
            lastAdjustmentTime: Date.now()
        };
    }

    /**
     * Records a player's response and triggers analysis
     * @param {boolean} isCorrect - Was the answer correct?
     * @param {number} timeMs - Reaction time in milliseconds
     * @returns {Object} - Recommendation { action: 'increase'|'decrease'|'maintain', reason: string }
     */
    recordResponse(isCorrect, timeMs) {
        const entry = { isCorrect, timeMs, timestamp: Date.now() };
        this.state.history.push(entry);
        
        // Maintain window size
        if (this.state.history.length > this.config.windowSize) {
            this.state.history.shift();
        }

        // Update streaks
        if (isCorrect) {
            this.state.consecutiveCorrect++;
            this.state.consecutiveErrors = 0;
        } else {
            this.state.consecutiveErrors++;
            this.state.consecutiveCorrect = 0;
        }

        return this.analyze();
    }

    /**
     * Analyzes the current state to determine if difficulty needs adjustment
     */
    analyze() {
        // 1. Check for Frustration (Immediate drop needed)
        if (this.state.consecutiveErrors >= this.config.frustrationThreshold) {
            return this.adjustDifficulty('decrease', 'Frustration detected: Consecutive errors');
        }

        const recentErrors = this.state.history.filter(h => !h.isCorrect).length;
        if (recentErrors >= 3 && this.state.history.length === this.config.windowSize) {
             return this.adjustDifficulty('decrease', 'High error rate in recent window');
        }

        // 2. Check for Boredom/Mastery (Increase needed)
        // Needs window full, all correct, and fast
        if (this.state.history.length === this.config.windowSize) {
            const allCorrect = this.state.history.every(h => h.isCorrect);
            const avgTime = this.state.history.reduce((sum, h) => sum + h.timeMs, 0) / this.config.windowSize;
            
            if (allCorrect && avgTime < this.config.boredomThresholdMs) {
                return this.adjustDifficulty('increase', `Mastery detected: Avg time ${Math.round(avgTime)}ms`);
            }
        }

        return { action: 'maintain', level: this.state.currentDifficulty };
    }

    /**
     * Internal method to apply changes
     */
    adjustDifficulty(direction, reason) {
        let newLevel = this.state.currentDifficulty;

        if (direction === 'increase') {
            if (newLevel < this.config.maxDifficulty) {
                newLevel++;
                // Reset history after change to allow stabilization
                this.state.history = []; 
                this.state.currentDifficulty = newLevel;
                return { action: 'increase', level: newLevel, reason };
            }
        } else if (direction === 'decrease') {
            if (newLevel > this.config.minDifficulty) {
                newLevel--;
                // Reset history after change
                this.state.history = [];
                this.state.consecutiveErrors = 0; 
                this.state.currentDifficulty = newLevel;
                return { action: 'decrease', level: newLevel, reason };
            }
        }

        return { action: 'maintain', level: this.state.currentDifficulty, reason: 'Limit reached' };
    }

    getCurrentLevel() {
        return this.state.currentDifficulty;
    }
}

// Export for Node.js (CommonJS) and Browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DifficultyDial;
} else {
    window.DifficultyDial = DifficultyDial;
}
