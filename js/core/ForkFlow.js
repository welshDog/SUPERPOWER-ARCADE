/** ForkFlow — sequences character forks, injecting repair (second-chance) forks. */
class ForkFlow {
  constructor(forks) {
    this.forks = forks;
    this.queue = [];
  }

  queueForChamber(n) {
    this.queue.push(...this.forks.filter((f) => f.chamberAfter === n));
  }

  next() {
    return this.queue.shift() || null;
  }

  choose(fork, optionId) {
    const option = fork.options.find((o) => o.id === optionId);
    if (!option) throw new Error(`Unknown option ${optionId} for fork ${fork.id}`);
    if (option.repair) this.queue.unshift(option.repair);
    return {
      option,
      signal: option.signal,
      grantsCoins: option.grantsCoins || 0,
      costsCoins: option.costsCoins || 0
    };
  }
}

if (typeof module !== 'undefined' && module.exports) { module.exports = ForkFlow; }
else { window.ForkFlow = ForkFlow; }
