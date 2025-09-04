const { ethers } = require('ethers');
const winston = require('winston');

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'evm-transfers.log' })
  ]
});

// ERC20 ABI for token transfers
const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function decimals() view returns (uint8)'
];

class EVMTransferService {
  constructor() {
    // RPC endpoints for different chains
    this.rpcEndpoints = {
      ethereum: process.env.ETHEREUM_RPC_ENDPOINT || 'https://eth-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_KEY',
      bsc: process.env.BSC_RPC_ENDPOINT || 'https://bsc-dataseed1.binance.org',
      base: process.env.BASE_RPC_ENDPOINT || 'https://mainnet.base.org'
    };
    
    // Chain IDs
    this.chainIds = {
      ethereum: 1,
      bsc: 56,
      base: 8453
    };
    
    // Native token decimals
    this.nativeDecimals = 18;
    
    // Minimum balance to keep for gas (in ETH/BNB)
    this.minBalanceForGas = {
      ethereum: 0.01,  // 0.01 ETH
      bsc: 0.005,      // 0.005 BNB
      base: 0.001      // 0.001 ETH
    };
  }

  /**
   * Get provider for specific chain
   */
  getProvider(chain) {
    const rpcUrl = this.rpcEndpoints[chain];
    if (!rpcUrl) {
      throw new Error(`Unsupported chain: ${chain}`);
    }
    return new ethers.providers.JsonRpcProvider(rpcUrl);
  }

  /**
   * Get wallet from private key
   */
  getWallet(privateKey, chain) {
    const provider = this.getProvider(chain);
    
    // Ensure private key has 0x prefix
    if (!privateKey.startsWith('0x')) {
      privateKey = '0x' + privateKey;
    }
    
    return new ethers.Wallet(privateKey, provider);
  }

  /**
   * Get native balance for an address
   */
  async getBalance(address, chain) {
    try {
      const provider = this.getProvider(chain);
      const balance = await provider.getBalance(address);
      return balance;
    } catch (error) {
      logger.error(`Error getting balance for ${address} on ${chain}:`, error);
      return ethers.BigNumber.from(0);
    }
  }

  /**
   * Get token balance for an address
   */
  async getTokenBalance(address, tokenAddress, chain) {
    try {
      const provider = this.getProvider(chain);
      const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
      const balance = await tokenContract.balanceOf(address);
      return balance;
    } catch (error) {
      logger.error(`Error getting token balance:`, error);
      return ethers.BigNumber.from(0);
    }
  }

  /**
   * Get token decimals
   */
  async getTokenDecimals(tokenAddress, chain) {
    try {
      const provider = this.getProvider(chain);
      const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
      const decimals = await tokenContract.decimals();
      return decimals;
    } catch (error) {
      logger.error(`Error getting token decimals:`, error);
      return 18; // Default to 18 decimals
    }
  }

  /**
   * Estimate gas for transfer
   */
  async estimateGas(from, to, amount, chain, tokenAddress = null) {
    try {
      const provider = this.getProvider(chain);
      
      if (!tokenAddress) {
        // Native token transfer
        const gasLimit = await provider.estimateGas({
          from,
          to,
          value: amount
        });
        return gasLimit;
      } else {
        // Token transfer
        const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
        const gasLimit = await tokenContract.estimateGas.transfer(to, amount, { from });
        return gasLimit;
      }
    } catch (error) {
      logger.error('Error estimating gas:', error);
      // Return default gas limits
      return tokenAddress ? ethers.BigNumber.from(100000) : ethers.BigNumber.from(21000);
    }
  }

  /**
   * Transfer native token (ETH/BNB)
   */
  async transferNative(senderPrivateKey, recipientAddress, amount, chain) {
    try {
      const wallet = this.getWallet(senderPrivateKey, chain);
      const senderAddress = wallet.address;
      
      // Get current balance
      const balance = await this.getBalance(senderAddress, chain);
      const amountWei = ethers.utils.parseEther(amount.toString());
      
      // Calculate minimum balance needed
      const minBalanceWei = ethers.utils.parseEther(this.minBalanceForGas[chain].toString());
      
      // Check if we have enough balance
      if (balance.lt(amountWei.add(minBalanceWei))) {
        throw new Error(`Insufficient balance. Have: ${ethers.utils.formatEther(balance)} ${this.getNativeToken(chain)}, Need: ${ethers.utils.formatEther(amountWei.add(minBalanceWei))} ${this.getNativeToken(chain)}`);
      }

      // Estimate gas
      const gasLimit = await this.estimateGas(senderAddress, recipientAddress, amountWei, chain);
      const gasPrice = await wallet.provider.getGasPrice();
      
      // Create transaction
      const tx = {
        to: recipientAddress,
        value: amountWei,
        gasLimit: gasLimit.mul(110).div(100), // Add 10% buffer
        gasPrice: gasPrice
      };

      // Send transaction
      logger.info(`Sending ${amount} ${this.getNativeToken(chain)} from ${senderAddress} to ${recipientAddress} on ${chain}`);
      const txResponse = await wallet.sendTransaction(tx);
      
      // Wait for confirmation
      const receipt = await txResponse.wait();
      
      logger.info(`Transfer successful: ${receipt.transactionHash}`);
      return {
        success: true,
        signature: receipt.transactionHash,
        amount,
        from: senderAddress,
        to: recipientAddress,
        gasUsed: receipt.gasUsed.toString(),
        effectiveGasPrice: receipt.effectiveGasPrice?.toString()
      };

    } catch (error) {
      logger.error('Error transferring native token:', error);
      return {
        success: false,
        error: error.message,
        from: senderPrivateKey.substring(0, 10) + '...',
        to: recipientAddress
      };
    }
  }

  /**
   * Transfer ERC20 token
   */
  async transferToken(senderPrivateKey, recipientAddress, amount, tokenAddress, chain) {
    try {
      const wallet = this.getWallet(senderPrivateKey, chain);
      const senderAddress = wallet.address;
      
      // Get token contract
      const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, wallet);
      
      // Get token decimals
      const decimals = await this.getTokenDecimals(tokenAddress, chain);
      const amountWithDecimals = ethers.utils.parseUnits(amount.toString(), decimals);
      
      // Check token balance
      const tokenBalance = await this.getTokenBalance(senderAddress, tokenAddress, chain);
      if (tokenBalance.lt(amountWithDecimals)) {
        throw new Error(`Insufficient token balance. Have: ${ethers.utils.formatUnits(tokenBalance, decimals)}, Need: ${amount}`);
      }
      
      // Check native balance for gas
      const nativeBalance = await this.getBalance(senderAddress, chain);
      const minBalanceWei = ethers.utils.parseEther(this.minBalanceForGas[chain].toString());
      if (nativeBalance.lt(minBalanceWei)) {
        throw new Error(`Insufficient ${this.getNativeToken(chain)} for gas. Have: ${ethers.utils.formatEther(nativeBalance)}, Need: ${this.minBalanceForGas[chain]}`);
      }

      // Estimate gas
      const gasLimit = await this.estimateGas(senderAddress, recipientAddress, amountWithDecimals, chain, tokenAddress);
      const gasPrice = await wallet.provider.getGasPrice();

      // Send token transfer
      logger.info(`Sending ${amount} tokens from ${senderAddress} to ${recipientAddress} on ${chain}`);
      const tx = await tokenContract.transfer(recipientAddress, amountWithDecimals, {
        gasLimit: gasLimit.mul(110).div(100), // Add 10% buffer
        gasPrice: gasPrice
      });
      
      // Wait for confirmation
      const receipt = await tx.wait();
      
      logger.info(`Token transfer successful: ${receipt.transactionHash}`);
      return {
        success: true,
        signature: receipt.transactionHash,
        amount,
        token: tokenAddress,
        from: senderAddress,
        to: recipientAddress,
        gasUsed: receipt.gasUsed.toString(),
        effectiveGasPrice: receipt.effectiveGasPrice?.toString()
      };

    } catch (error) {
      logger.error('Error transferring token:', error);
      return {
        success: false,
        error: error.message,
        from: senderPrivateKey.substring(0, 10) + '...',
        to: recipientAddress
      };
    }
  }

  /**
   * Process many-to-many transfers
   */
  async processManyToMany(transfers, chain, tokenAddress = null) {
    const results = [];
    let successCount = 0;
    let failureCount = 0;

    for (const transfer of transfers) {
      try {
        let result;
        
        if (!tokenAddress) {
          // Native token transfer
          result = await this.transferNative(
            transfer.senderPrivateKey,
            transfer.recipientAddress,
            transfer.amount,
            chain
          );
        } else {
          // ERC20 token transfer
          result = await this.transferToken(
            transfer.senderPrivateKey,
            transfer.recipientAddress,
            transfer.amount,
            tokenAddress,
            chain
          );
        }

        results.push({
          ...result,
          id: transfer.id
        });

        if (result.success) {
          successCount++;
        } else {
          failureCount++;
        }

        // Add small delay between transfers to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        logger.error('Error processing transfer:', error);
        results.push({
          id: transfer.id,
          success: false,
          error: error.message,
          amount: transfer.amount,
          recipient: transfer.recipientAddress
        });
        failureCount++;
      }
    }

    return {
      results,
      successCount,
      failureCount,
      total: transfers.length
    };
  }

  /**
   * Get native token symbol for chain
   */
  getNativeToken(chain) {
    const tokens = {
      ethereum: 'ETH',
      bsc: 'BNB',
      base: 'ETH'
    };
    return tokens[chain] || 'ETH';
  }

  /**
   * Validate address
   */
  isValidAddress(address) {
    try {
      ethers.utils.getAddress(address);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate private key
   */
  isValidPrivateKey(privateKey) {
    try {
      // Remove 0x prefix if present
      const cleanKey = privateKey.replace(/^0x/i, '');
      
      // Check if it's 64 hex characters
      if (!/^[0-9a-fA-F]{64}$/.test(cleanKey)) {
        return false;
      }
      
      // Try to create a wallet
      new ethers.Wallet('0x' + cleanKey);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get address from private key
   */
  getAddressFromPrivateKey(privateKey) {
    try {
      if (!privateKey.startsWith('0x')) {
        privateKey = '0x' + privateKey;
      }
      const wallet = new ethers.Wallet(privateKey);
      return wallet.address;
    } catch {
      return null;
    }
  }
}

module.exports = new EVMTransferService();