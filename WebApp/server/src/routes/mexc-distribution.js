const express = require('express');
const router = express.Router();
const ccxt = require('ccxt');
const multer = require('multer');
const csv = require('csv-parse');
const { authMiddleware } = require('../middleware/auth');

// Configure multer for CSV file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Network configurations for different chains
const NETWORK_CONFIGS = {
  'SOL': {
    network: 'SOL',
    minAmount: 0.01,
    decimals: 9
  },
  'ETH': {
    network: 'ETH',
    minAmount: 0.001,
    decimals: 18
  },
  'BNB': {
    network: 'BSC',
    minAmount: 0.001,
    decimals: 18
  },
  'MATIC': {
    network: 'POLYGON',
    minAmount: 0.1,
    decimals: 18
  },
  'AVAX': {
    network: 'AVAX',
    minAmount: 0.01,
    decimals: 18
  },
  'ARB': {
    network: 'ARBITRUM',
    minAmount: 0.1,
    decimals: 18
  },
  'BASE': {
    network: 'BASE',
    minAmount: 0.001,
    decimals: 18
  }
};

// Helper function to create MEXC exchange instance
function createMexcExchange(apiKey, apiSecret) {
  return new ccxt.mexc({
    apiKey: apiKey,
    secret: apiSecret,
    enableRateLimit: true,
    options: {
      defaultType: 'spot',
      adjustForTimeDifference: true
    }
  });
}

// Helper function to parse CSV content
async function parseCSV(csvContent) {
  return new Promise((resolve, reject) => {
    csv.parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    }, (err, records) => {
      if (err) {
        reject(err);
      } else {
        resolve(records);
      }
    });
  });
}

// Validate API keys and check balance
router.post('/validate', authMiddleware, async (req, res) => {
  try {
    const { apiKey, apiSecret, currency = 'SOL' } = req.body;

    if (!apiKey || !apiSecret) {
      return res.status(400).json({
        success: false,
        error: 'API credentials are required'
      });
    }

    const exchange = createMexcExchange(apiKey, apiSecret);

    try {
      // Test API credentials by fetching balance
      const balance = await exchange.fetchBalance();
      
      // Get available balance for the specified currency
      const currencyBalance = balance[currency] || { free: 0, used: 0, total: 0 };

      // Get withdrawal fees
      let withdrawalFee = 0;
      try {
        const fees = await exchange.fetchDepositWithdrawFees([currency]);
        if (fees && fees[currency]) {
          withdrawalFee = fees[currency].withdraw?.fee || 0;
        }
      } catch (feeError) {
        console.error('Error fetching withdrawal fees:', feeError);
        // Continue without fee information
      }

      res.json({
        success: true,
        data: {
          validated: true,
          balance: {
            free: currencyBalance.free,
            used: currencyBalance.used,
            total: currencyBalance.total
          },
          withdrawalFee: withdrawalFee,
          currency: currency
        }
      });

    } catch (error) {
      console.error('MEXC validation error:', error);
      
      if (error.message.includes('Invalid API-key')) {
        return res.status(401).json({
          success: false,
          error: 'Invalid API credentials'
        });
      }

      throw error;
    }

  } catch (error) {
    console.error('Validation error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to validate API credentials'
    });
  }
});

// Execute withdrawals (single or batch)
router.post('/withdraw', authMiddleware, upload.single('csv'), async (req, res) => {
  try {
    const { 
      apiKey, 
      apiSecret, 
      currency = 'SOL',
      network,
      addresses, // For single withdrawal: [{address: string, amount: number}]
      testMode = false
    } = req.body;

    if (!apiKey || !apiSecret) {
      return res.status(400).json({
        success: false,
        error: 'API credentials are required'
      });
    }

    // Determine network configuration
    const networkConfig = NETWORK_CONFIGS[currency];
    const withdrawNetwork = network || networkConfig?.network || currency;

    // Parse withdrawal data
    let withdrawalData = [];
    
    if (req.file) {
      // CSV file upload
      const csvContent = req.file.buffer.toString();
      const records = await parseCSV(csvContent);
      
      withdrawalData = records.map(record => ({
        address: record.address || record.Address || record.wallet || record.Wallet,
        amount: parseFloat(record.amount || record.Amount || record.value || record.Value)
      })).filter(item => item.address && !isNaN(item.amount) && item.amount > 0);
      
    } else if (addresses) {
      // Direct addresses array
      withdrawalData = Array.isArray(addresses) ? addresses : [addresses];
    } else {
      return res.status(400).json({
        success: false,
        error: 'No withdrawal data provided'
      });
    }

    if (withdrawalData.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid withdrawal data found'
      });
    }

    // Validate amounts
    const minAmount = networkConfig?.minAmount || 0.001;
    const invalidAmounts = withdrawalData.filter(item => item.amount < minAmount);
    if (invalidAmounts.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Some amounts are below minimum (${minAmount} ${currency})`,
        invalidAddresses: invalidAmounts.map(item => item.address)
      });
    }

    // Initialize exchange
    const exchange = createMexcExchange(apiKey, apiSecret);

    // Check total balance
    const balance = await exchange.fetchBalance();
    const availableBalance = balance[currency]?.free || 0;
    const totalRequired = withdrawalData.reduce((sum, item) => sum + item.amount, 0);

    if (totalRequired > availableBalance) {
      return res.status(400).json({
        success: false,
        error: `Insufficient balance. Required: ${totalRequired} ${currency}, Available: ${availableBalance} ${currency}`
      });
    }

    // Execute withdrawals
    const results = [];
    const errors = [];

    for (let i = 0; i < withdrawalData.length; i++) {
      const { address, amount } = withdrawalData[i];

      try {
        if (testMode) {
          // Test mode - simulate withdrawal
          results.push({
            address,
            amount,
            status: 'simulated',
            txId: `TEST_${Date.now()}_${i}`,
            timestamp: new Date().toISOString()
          });
        } else {
          // Execute actual withdrawal
          const withdrawal = await exchange.withdraw(
            currency,
            amount,
            address,
            undefined, // tag (not needed for most networks)
            {
              network: withdrawNetwork
            }
          );

          results.push({
            address,
            amount,
            status: 'success',
            txId: withdrawal.id || withdrawal.txid,
            timestamp: new Date().toISOString(),
            fee: withdrawal.fee
          });
        }

        // Rate limiting delay
        if (i < withdrawalData.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay between withdrawals
        }

      } catch (error) {
        console.error(`Withdrawal error for ${address}:`, error);
        errors.push({
          address,
          amount,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }

      // Send progress update for batch operations
      if (withdrawalData.length > 1 && i % 5 === 0) {
        // Note: In a real implementation, you might want to use WebSockets or SSE for progress updates
        console.log(`Progress: ${i + 1}/${withdrawalData.length} withdrawals processed`);
      }
    }

    // Final balance check
    let finalBalance = null;
    try {
      const balanceAfter = await exchange.fetchBalance();
      finalBalance = balanceAfter[currency]?.free || 0;
    } catch (error) {
      console.error('Error fetching final balance:', error);
    }

    res.json({
      success: true,
      data: {
        totalProcessed: withdrawalData.length,
        successful: results.length,
        failed: errors.length,
        results,
        errors,
        summary: {
          totalAmount: totalRequired,
          currency,
          network: withdrawNetwork,
          initialBalance: availableBalance,
          finalBalance,
          testMode
        }
      }
    });

  } catch (error) {
    console.error('Withdrawal error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process withdrawals'
    });
  }
});

// Get supported networks for a currency
router.get('/networks/:currency', authMiddleware, async (req, res) => {
  try {
    const { currency } = req.params;
    const { apiKey, apiSecret } = req.query;

    if (!apiKey || !apiSecret) {
      // Return default network info without API credentials
      const networkConfig = NETWORK_CONFIGS[currency.toUpperCase()];
      if (networkConfig) {
        return res.json({
          success: true,
          data: {
            currency: currency.toUpperCase(),
            defaultNetwork: networkConfig.network,
            minAmount: networkConfig.minAmount
          }
        });
      } else {
        return res.status(404).json({
          success: false,
          error: 'Currency not supported'
        });
      }
    }

    // If API credentials provided, fetch actual network info from exchange
    const exchange = createMexcExchange(apiKey, apiSecret);
    
    try {
      const currencies = await exchange.fetchCurrencies();
      const currencyInfo = currencies[currency.toUpperCase()];
      
      if (!currencyInfo) {
        return res.status(404).json({
          success: false,
          error: 'Currency not found'
        });
      }

      const networks = currencyInfo.networks || {};
      const supportedNetworks = Object.entries(networks)
        .filter(([_, network]) => network.withdraw)
        .map(([networkId, network]) => ({
          id: networkId,
          name: network.name || networkId,
          fee: network.fee,
          minAmount: network.limits?.withdraw?.min
        }));

      res.json({
        success: true,
        data: {
          currency: currency.toUpperCase(),
          networks: supportedNetworks
        }
      });

    } catch (error) {
      console.error('Error fetching network info:', error);
      throw error;
    }

  } catch (error) {
    console.error('Networks error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch network information'
    });
  }
});

// Get withdrawal history
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const { apiKey, apiSecret, currency, limit = 50 } = req.query;

    if (!apiKey || !apiSecret) {
      return res.status(400).json({
        success: false,
        error: 'API credentials are required'
      });
    }

    const exchange = createMexcExchange(apiKey, apiSecret);

    const withdrawals = await exchange.fetchWithdrawals(
      currency ? currency.toUpperCase() : undefined,
      undefined,
      parseInt(limit)
    );

    res.json({
      success: true,
      data: {
        withdrawals: withdrawals.map(w => ({
          id: w.id,
          txid: w.txid,
          currency: w.currency,
          amount: w.amount,
          fee: w.fee,
          address: w.address,
          network: w.network,
          status: w.status,
          timestamp: w.timestamp,
          datetime: w.datetime
        })),
        count: withdrawals.length
      }
    });

  } catch (error) {
    console.error('History error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch withdrawal history'
    });
  }
});

module.exports = router;