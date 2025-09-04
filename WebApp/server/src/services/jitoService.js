const axios = require('axios');
const { VersionedTransaction } = require('@solana/web3.js');
const bs58 = require('bs58');

class JitoService {
  constructor() {
    // Jito Block Engine endpoints
    this.endpoints = {
      mainnet: {
        bundleApi: 'https://mainnet.block-engine.jito.wtf/api/v1',
        rpc: 'https://mainnet.block-engine.jito.wtf/rpc'
      },
      devnet: {
        bundleApi: 'https://devnet.block-engine.jito.wtf/api/v1',
        rpc: 'https://devnet.block-engine.jito.wtf/rpc'
      }
    };
    
    // Jito tip accounts
    this.tipAccounts = [
      'Cw8CFyM9FkoMi7K7Crf6HNQqf4uEMzpKw6QNghXLvLkY',
      'DttWaMuVvTiduZRnguLF7jNxTgiMBZ1hyAumKUiL2KRL',
      '96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5',
      '3AVi9Tg9Uo68tJfuvoKvqKNWKkC5wPdSSdeBnizKZ6jT',
      'HFqU5x63VTqvQss8hp11i4wVV8bD44PvwucfZ2bU7gRe',
      'ADaUMid9yfUytqMBgopwjb2DTLSokTSzL1zt6iGPaS49',
      'ADuUkR4vqLUMWXxW9gh6D6L8pMSawimctcNZ5pGwDcEt',
      'DfXygSm4jCyNCybVYYK6DwvWqjKee8pbDmJGcLWNDXjh',
    ];
    
    this.network = 'mainnet';
  }

  // Get a random tip account
  getRandomTipAccount() {
    return this.tipAccounts[Math.floor(Math.random() * this.tipAccounts.length)];
  }

  // Send bundle to Jito
  async sendBundle(transactions, signerKeypair, commitment = 'confirmed') {
    try {
      const endpoint = this.endpoints[this.network].bundleApi;
      
      // Serialize all transactions
      const serializedTransactions = transactions.map(tx => {
        if (tx instanceof VersionedTransaction) {
          return bs58.encode(tx.serialize());
        }
        throw new Error('Only VersionedTransaction is supported');
      });

      // Create bundle request
      const bundleRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'sendBundle',
        params: [serializedTransactions]
      };

      // Send bundle
      const response = await axios.post(`${endpoint}/bundles`, bundleRequest, {
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.data.error) {
        throw new Error(`Jito error: ${response.data.error.message}`);
      }

      const bundleId = response.data.result;
      console.log(`Bundle submitted with ID: ${bundleId}`);

      // Poll for bundle status
      const status = await this.getBundleStatus(bundleId);
      
      return {
        bundleId,
        status,
        success: true
      };
    } catch (error) {
      console.error('Error sending bundle to Jito:', error);
      throw error;
    }
  }

  // Get bundle status
  async getBundleStatus(bundleId, maxRetries = 30, delayMs = 2000) {
    const endpoint = this.endpoints[this.network].bundleApi;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        const statusRequest = {
          jsonrpc: '2.0',
          id: 1,
          method: 'getBundleStatuses',
          params: [[bundleId]]
        };

        const response = await axios.post(`${endpoint}/bundles`, statusRequest, {
          headers: {
            'Content-Type': 'application/json',
          }
        });

        if (response.data.result && response.data.result.length > 0) {
          const status = response.data.result[0];
          
          // Check if bundle is finalized
          if (status.status === 'finalized' || status.status === 'failed') {
            return status;
          }
        }

        // Wait before next attempt
        await new Promise(resolve => setTimeout(resolve, delayMs));
      } catch (error) {
        console.error(`Error checking bundle status (attempt ${i + 1}):`, error.message);
      }
    }

    throw new Error('Bundle status check timed out');
  }

  // Get tip accounts info
  async getTipAccounts() {
    try {
      const endpoint = this.endpoints[this.network].bundleApi;
      
      const request = {
        jsonrpc: '2.0',
        id: 1,
        method: 'getTipAccounts',
        params: []
      };

      const response = await axios.post(`${endpoint}/bundles`, request, {
        headers: {
          'Content-Type': 'application/json',
        }
      });

      return response.data.result || this.tipAccounts;
    } catch (error) {
      console.error('Error getting tip accounts:', error);
      return this.tipAccounts;
    }
  }

  // Simulate bundle
  async simulateBundle(transactions) {
    try {
      const endpoint = this.endpoints[this.network].bundleApi;
      
      // Serialize all transactions
      const serializedTransactions = transactions.map(tx => {
        if (tx instanceof VersionedTransaction) {
          return bs58.encode(tx.serialize());
        }
        throw new Error('Only VersionedTransaction is supported');
      });

      const simulateRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'simulateBundle',
        params: [serializedTransactions]
      };

      const response = await axios.post(`${endpoint}/bundles`, simulateRequest, {
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.data.error) {
        throw new Error(`Simulation error: ${response.data.error.message}`);
      }

      return response.data.result;
    } catch (error) {
      console.error('Error simulating bundle:', error);
      throw error;
    }
  }

  // Set network
  setNetwork(network) {
    if (!this.endpoints[network]) {
      throw new Error(`Invalid network: ${network}`);
    }
    this.network = network;
  }

  // Build bundle with optimal ordering
  buildOptimalBundle(transactions) {
    // Sort transactions by priority fee (if applicable)
    // Place token creation first, then buys
    const sorted = [...transactions].sort((a, b) => {
      // Implementation depends on transaction type detection
      return 0;
    });

    return sorted;
  }

  // Calculate optimal tip based on network conditions
  async calculateOptimalTip(priority = 'medium') {
    const baseTips = {
      low: 0.0001,
      medium: 0.001,
      high: 0.005,
      urgent: 0.01
    };

    // In production, could fetch network congestion data
    // to adjust tip dynamically
    return baseTips[priority] || baseTips.medium;
  }
}

module.exports = new JitoService();