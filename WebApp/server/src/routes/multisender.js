const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const winston = require('winston');
const solanaTransferService = require('../services/solanaTransferService');
const evmTransferService = require('../services/evmTransferService');

const router = express.Router();

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// Get gas estimate for multisend
router.post('/estimate-gas', authMiddleware, async (req, res) => {
  try {
    const { chain, token, recipients } = req.body;
    
    if (!chain || !recipients || !Array.isArray(recipients)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request parameters'
      });
    }
    
    // Calculate gas estimate based on chain and recipient count
    let baseGas, perRecipientGas;
    
    switch (chain) {
      case 'solana':
        baseGas = 0.001;
        perRecipientGas = 0.0001;
        break;
      case 'ethereum':
        baseGas = 0.01;
        perRecipientGas = 0.0003;
        break;
      case 'bsc':
        baseGas = 0.005;
        perRecipientGas = 0.0002;
        break;
      case 'base':
        baseGas = 0.002;
        perRecipientGas = 0.0001;
        break;
      default:
        baseGas = 0.005;
        perRecipientGas = 0.0002;
    }
    
    const totalGas = baseGas + (recipients.length * perRecipientGas);
    const gasPrice = Math.random() * 50 + 20; // Mock gas price in gwei
    
    res.json({
      success: true,
      estimate: {
        gasLimit: recipients.length * 50000,
        gasPrice: gasPrice,
        totalGas: totalGas,
        totalCost: totalGas * gasPrice,
        currency: chain === 'solana' ? 'SOL' : chain === 'bsc' ? 'BNB' : 'ETH'
      }
    });
    
  } catch (error) {
    logger.error('Error estimating gas:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to estimate gas'
    });
  }
});

// Validate multisend transaction
router.post('/validate', authMiddleware, async (req, res) => {
  try {
    const { chain, token, recipients, senderAddress } = req.body;
    
    const errors = [];
    const warnings = [];
    
    // Validate recipients
    recipients.forEach((recipient, index) => {
      if (!recipient.address) {
        errors.push(`Recipient ${index + 1}: Missing address`);
      }
      if (!recipient.amount || recipient.amount <= 0) {
        errors.push(`Recipient ${index + 1}: Invalid amount`);
      }
      
      // Check for duplicate addresses
      const duplicates = recipients.filter(r => r.address === recipient.address);
      if (duplicates.length > 1) {
        warnings.push(`Address ${recipient.address} appears ${duplicates.length} times`);
      }
    });
    
    // Mock balance check
    const totalAmount = recipients.reduce((sum, r) => sum + (r.amount || 0), 0);
    const mockBalance = Math.random() * 1000 + 100;
    
    if (totalAmount > mockBalance) {
      errors.push(`Insufficient balance. Required: ${totalAmount}, Available: ${mockBalance.toFixed(4)}`);
    }
    
    res.json({
      success: errors.length === 0,
      errors,
      warnings,
      summary: {
        totalRecipients: recipients.length,
        uniqueAddresses: new Set(recipients.map(r => r.address)).size,
        totalAmount: totalAmount,
        estimatedTime: recipients.length * 2 // 2 seconds per recipient
      }
    });
    
  } catch (error) {
    logger.error('Error validating multisend:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate transaction'
    });
  }
});

// Create HoudiniSwap order for privacy transfer
router.post('/privacy/create-order', authMiddleware, async (req, res) => {
  try {
    const {
      amount,
      recipientAddress,
      sendingBlockchain,
      receivingBlockchain,
      sendingToken,
      receivingToken,
      anonymous
    } = req.body;
    
    // Mock HoudiniSwap order creation
    const orderId = 'HS-' + Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
    const tempWallet = 'HOU' + Math.random().toString(36).substring(2, 15);
    
    // Calculate fees
    const baseFee = 0.002;
    const crossChainFee = sendingBlockchain !== receivingBlockchain ? 0.005 : 0;
    const anonymousFee = anonymous ? 0.003 : 0;
    const totalFee = baseFee + crossChainFee + anonymousFee;
    
    res.json({
      success: true,
      order: {
        orderId,
        tempWallet,
        amount,
        recipientAddress,
        sendingBlockchain,
        receivingBlockchain,
        sendingToken,
        receivingToken,
        anonymous,
        fees: {
          base: baseFee,
          crossChain: crossChainFee,
          anonymous: anonymousFee,
          total: totalFee
        },
        estimatedTime: 300, // 5 minutes
        status: 'CREATED',
        createdAt: new Date().toISOString()
      }
    });
    
  } catch (error) {
    logger.error('Error creating privacy order:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create privacy order'
    });
  }
});

// Check privacy transfer status
router.get('/privacy/status/:orderId', authMiddleware, async (req, res) => {
  try {
    const { orderId } = req.params;
    
    // Mock status check
    const statuses = ['CREATED', 'PROCESSING', 'COMPLETED', 'FAILED'];
    const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
    
    const response = {
      success: true,
      order: {
        orderId,
        status: randomStatus,
        progress: randomStatus === 'COMPLETED' ? 100 : Math.floor(Math.random() * 80) + 10,
        lastUpdated: new Date().toISOString()
      }
    };
    
    if (randomStatus === 'COMPLETED') {
      response.order.completedAt = new Date().toISOString();
      response.order.txHash = '0x' + Array(64).fill(0).map(() => 
        Math.floor(Math.random() * 16).toString(16)
      ).join('');
    }
    
    if (randomStatus === 'FAILED') {
      response.order.error = 'Transaction failed due to network congestion';
    }
    
    res.json(response);
    
  } catch (error) {
    logger.error('Error checking privacy order status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check order status'
    });
  }
});

// Many-to-many transfers for Solana
router.post('/many-to-many', authMiddleware, async (req, res) => {
  try {
    const { projectId, transfers, chain, tokenAddress } = req.body;
    
    const supportedChains = ['ethereum', 'bsc', 'base', 'solana'];
    if (!supportedChains.includes(chain)) {
      return res.status(400).json({
        success: false,
        error: `Unsupported chain: ${chain}. Supported chains: ${supportedChains.join(', ')}`
      });
    }
    
    if (!transfers || !Array.isArray(transfers) || transfers.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No transfers provided'
      });
    }
    
    // Choose the appropriate service based on chain
    const transferService = chain === 'solana' ? solanaTransferService : evmTransferService;
    
    // Validate all transfers
    const validationErrors = [];
    transfers.forEach((transfer, index) => {
      if (!transfer.senderPrivateKey) {
        validationErrors.push(`Transfer ${index + 1}: Missing sender private key`);
      } else if (!transferService.isValidPrivateKey(transfer.senderPrivateKey)) {
        validationErrors.push(`Transfer ${index + 1}: Invalid sender private key`);
      }
      
      if (!transfer.recipientAddress) {
        validationErrors.push(`Transfer ${index + 1}: Missing recipient address`);
      } else if (!transferService.isValidAddress(transfer.recipientAddress)) {
        validationErrors.push(`Transfer ${index + 1}: Invalid recipient address`);
      }
      
      if (!transfer.amount || transfer.amount <= 0) {
        validationErrors.push(`Transfer ${index + 1}: Invalid amount`);
      }
    });
    
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        errors: validationErrors
      });
    }
    
    // Process transfers
    logger.info(`Processing ${transfers.length} many-to-many transfers for project ${projectId} on ${chain}`);
    
    let result;
    if (chain === 'solana') {
      result = await solanaTransferService.processManyToMany(transfers, tokenAddress);
    } else {
      result = await evmTransferService.processManyToMany(transfers, chain, tokenAddress);
    }
    
    logger.info(`Many-to-many transfer completed: ${result.successCount} success, ${result.failureCount} failed`);
    
    res.json({
      success: true,
      results: result.results,
      successCount: result.successCount,
      failureCount: result.failureCount,
      summary: {
        total: result.total,
        successCount: result.successCount,
        failureCount: result.failureCount,
        processedAt: new Date().toISOString()
      }
    });
    
  } catch (error) {
    logger.error('Error processing many-to-many transfers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process transfers: ' + error.message
    });
  }
});

// Check balances for many-to-many transfers
router.post('/check-balances', authMiddleware, async (req, res) => {
  try {
    const { addresses, tokenAddress, chain } = req.body;
    
    if (!addresses || !Array.isArray(addresses)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid addresses array'
      });
    }
    
    if (!chain) {
      return res.status(400).json({
        success: false,
        error: 'Chain is required'
      });
    }
    
    const balances = {};
    
    if (chain === 'solana') {
      // Solana balance checking
      for (const address of addresses) {
        try {
          if (solanaTransferService.isValidAddress(address)) {
            if (!tokenAddress) {
              // Get SOL balance
              const balance = await solanaTransferService.getBalance(address);
              balances[address] = balance / 1e9; // Convert lamports to SOL
            } else {
              // Get token balance
              const balance = await solanaTransferService.getTokenBalance(address, tokenAddress);
              balances[address] = Number(balance) / 1e9; // Assuming 9 decimals, should be fetched
            }
          } else {
            balances[address] = 0;
          }
        } catch (error) {
          logger.error(`Error getting balance for ${address}:`, error);
          balances[address] = 0;
        }
      }
    } else {
      // EVM chains balance checking
      const { ethers } = require('ethers');
      
      for (const address of addresses) {
        try {
          if (evmTransferService.isValidAddress(address)) {
            if (!tokenAddress) {
              // Get native token balance
              const balance = await evmTransferService.getBalance(address, chain);
              balances[address] = parseFloat(ethers.utils.formatEther(balance));
            } else {
              // Get token balance
              const balance = await evmTransferService.getTokenBalance(address, tokenAddress, chain);
              const decimals = await evmTransferService.getTokenDecimals(tokenAddress, chain);
              balances[address] = parseFloat(ethers.utils.formatUnits(balance, decimals));
            }
          } else {
            balances[address] = 0;
          }
        } catch (error) {
          logger.error(`Error getting balance for ${address}:`, error);
          balances[address] = 0;
        }
      }
    }
    
    res.json({
      success: true,
      balances
    });
    
  } catch (error) {
    logger.error('Error checking balances:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check balances'
    });
  }
});

// Get multisender stats
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Mock statistics
    const stats = {
      totalTransactions: Math.floor(Math.random() * 100) + 50,
      totalRecipients: Math.floor(Math.random() * 1000) + 500,
      totalVolume: (Math.random() * 10000 + 5000).toFixed(2),
      privacyTransfers: Math.floor(Math.random() * 50) + 20,
      standardTransfers: Math.floor(Math.random() * 100) + 30,
      lastTransaction: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      favoriteChain: ['ethereum', 'bsc', 'solana', 'base'][Math.floor(Math.random() * 4)]
    };
    
    res.json({
      success: true,
      stats
    });
    
  } catch (error) {
    logger.error('Error fetching multisender stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics'
    });
  }
});

module.exports = router;