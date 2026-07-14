/**
 * BROskiWallet — Web3 Local economy state manager.
 * Tracks BROski$ earned during the run and mints on-chain.
 */
class BROskiWallet {
  constructor() {
    this.balance = 0;
    this.signer = null;
    this.address = null;
    // Mock ABI for BROski$ Minting on Base Sepolia
    this.contractAddress = "0x00000000000000000000000000000000BROSKI$";
    this.abi = ["function mint(address to, uint256 amount) public"];
  }

  addCoins(amount) {
    if (amount > 0) this.balance += amount;
  }

  spendCoins(amount) {
    if (amount > 0 && this.balance >= amount) {
      this.balance -= amount;
      return true;
    }
    return false;
  }

  getBalance() { return this.balance; }

  async connect() {
    if (typeof window.ethers === 'undefined') throw new Error("Ethers.js not loaded.");
    if (!window.ethereum) throw new Error("No Web3 wallet found. Install MetaMask!");
    const provider = new window.ethers.BrowserProvider(window.ethereum);
    this.signer = await provider.getSigner();
    this.address = await this.signer.getAddress();
    
    // Switch to Base Sepolia
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x14a34' }], // 84532 in hex
      });
    } catch (e) {
      console.warn("Could not switch to Base Sepolia", e);
    }
    return this.address;
  }

  async mintOnChain() {
    if (!this.signer) throw new Error("Wallet not connected.");
    if (this.balance <= 0) return false;
    try {
      const contract = new window.ethers.Contract(this.contractAddress, this.abi, this.signer);
      console.log(`Minting ${this.balance} BROski$ to ${this.address}...`);
      // Mocking transaction for now:
      // const tx = await contract.mint(this.address, this.balance);
      // await tx.wait();
      return true;
    } catch (e) {
      console.error("Mint failed", e);
      return false;
    }
  }
}

if (typeof module !== 'undefined' && module.exports) { module.exports = BROskiWallet; }
else { window.BROskiWallet = BROskiWallet; }
