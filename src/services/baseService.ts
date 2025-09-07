import { ethers } from 'ethers';
import { NETWORK_CONFIG, STORE_WALLET_ADDRESS } from '../config/networks';

/**
 * Base Network Service for payment verification and blockchain interactions
 */
export class BaseService {
  private provider: ethers.JsonRpcProvider;
  private usdcContract: ethers.Contract;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(NETWORK_CONFIG.BASE.rpcUrl);

    // USDC ABI for transfer events
    const usdcAbi = [
      "event Transfer(address indexed from, address indexed to, uint256 value)",
      "function decimals() view returns (uint8)"
    ];

    this.usdcContract = new ethers.Contract(
      NETWORK_CONFIG.BASE.usdcAddress,
      usdcAbi,
      this.provider
    );
  }

  /**
   * Verify USDC payment transaction
   */
  async verifyUsdcPayment(
    transactionHash: string,
    expectedAmountUsd: string,
    recipientAddress: string
  ): Promise<{ 
    success: boolean; 
    amount: string; 
    from: string;
    transactionDetails: any 
  }> {
    try {
      // Get transaction receipt
      const receipt = await this.provider.getTransactionReceipt(transactionHash);

      if (!receipt) {
        throw new Error('Transaction not found');
      }

      if (receipt.status !== 1) {
        throw new Error('Transaction failed');
      }

      // Look for USDC transfer event
      const transferEvents = receipt.logs
        .filter(log => log.address.toLowerCase() === NETWORK_CONFIG.BASE.usdcAddress.toLowerCase())
        .map(log => {
          try {
            return this.usdcContract.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .filter(event => event !== null && event.name === 'Transfer');

      if (transferEvents.length === 0) {
        throw new Error('No USDC transfer found in transaction');
      }

      // Find transfer to our store wallet
      const relevantEvent = transferEvents.find(event => 
        (event?.args?.to).toLowerCase() === recipientAddress.toLowerCase()
      );

      if (!relevantEvent) {
        throw new Error('USDC transfer not directed to store wallet');
      }

      // Get USDC decimals (typically 6)
      const decimals = await this.usdcContract.decimals();

      // Convert amount from smallest unit to USD
      const amountUsd = ethers.formatUnits(relevantEvent.args.value, decimals);

      // Verify amount meets expectation
      if (parseFloat(amountUsd) < parseFloat(expectedAmountUsd)) {
        throw new Error(`Insufficient payment: expected ${expectedAmountUsd}, got ${amountUsd}`);
      }

      return {
        success: true,
        amount: amountUsd,
        from: relevantEvent.args.from,
        transactionDetails: {
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed.toString(),
          gasPrice: receipt.gasPrice?.toString()
        }
      };

    } catch (error) {
      console.error('USDC payment verification failed:', error);
      throw new Error(`Payment verification failed: ${error.message}`);
    }
  }

  /**
   * Verify ETH payment transaction
   */
  async verifyEthPayment(
    transactionHash: string,
    expectedAmountEth: string,
    recipientAddress: string
  ): Promise<{ 
    success: boolean; 
    amount: string; 
    from: string;
    transactionDetails: any 
  }> {
    try {
      // Get transaction details
      const transaction = await this.provider.getTransaction(transactionHash);

      if (!transaction) {
        throw new Error('Transaction not found');
      }

      // Get transaction receipt
      const receipt = await this.provider.getTransactionReceipt(transactionHash);

      if (!receipt) {
        throw new Error('Transaction receipt not found');
      }

      if (receipt.status !== 1) {
        throw new Error('Transaction failed');
      }

      // Verify recipient address
      if (transaction.to?.toLowerCase() !== recipientAddress.toLowerCase()) {
        throw new Error('Transaction not directed to store wallet');
      }

      // Convert wei to ETH
      const amountEth = ethers.formatEther(transaction.value);

      // Verify amount meets expectation
      if (parseFloat(amountEth) < parseFloat(expectedAmountEth)) {
        throw new Error(`Insufficient payment: expected ${expectedAmountEth}, got ${amountEth}`);
      }

      return {
        success: true,
        amount: amountEth,
        from: transaction.from,
        transactionDetails: {
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed.toString(),
          gasPrice: receipt.gasPrice?.toString()
        }
      };

    } catch (error) {
      console.error('ETH payment verification failed:', error);
      throw new Error(`Payment verification failed: ${error.message}`);
    }
  }

  /**
   * Get current block number
   */
  async getCurrentBlock(): Promise<number> {
    return await this.provider.getBlockNumber();
  }

  /**
   * Get wallet balance (for debugging)
   */
  async getWalletBalance(address: string): Promise<{ eth: string; usdc: string }> {
    try {
      const ethBalance = await this.provider.getBalance(address);
      const ethFormatted = ethers.formatEther(ethBalance);

      const usdcDecimals = await this.usdcContract.decimals();
      const usdcBalance = await this.usdcContract.balanceOf(address);
      const usdcFormatted = ethers.formatUnits(usdcBalance, usdcDecimals);

      return {
        eth: ethFormatted,
        usdc: usdcFormatted
      };
    } catch (error) {
      console.error('Failed to get wallet balance:', error);
      return { eth: '0', usdc: '0' };
    }
  }

  /**
   * Validate wallet address format
   */
  static isValidAddress(address: string): boolean {
    try {
      return ethers.isAddress(address);
    } catch {
      return false;
    }
  }
}