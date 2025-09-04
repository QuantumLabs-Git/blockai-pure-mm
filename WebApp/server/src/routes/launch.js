const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const winston = require('winston');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

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

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/tokens');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'token-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Upload token image
router.post('/upload-image', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No image file provided'
      });
    }

    // In production, you would upload to IPFS or cloud storage
    // For now, we'll return a mock IPFS hash
    const ipfsHash = 'Qm' + Math.random().toString(36).substring(2, 15) + 
                     Math.random().toString(36).substring(2, 15);

    res.json({
      success: true,
      imageUrl: `ipfs://${ipfsHash}`,
      localPath: req.file.path,
      filename: req.file.filename
    });

  } catch (error) {
    logger.error('Error uploading image:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload image'
    });
  }
});

// Validate bundle configuration
router.post('/bundles/validate', authMiddleware, async (req, res) => {
  try {
    const { tokenConfig, bundleConfig } = req.body;
    const errors = [];
    const warnings = [];

    // Token validation
    if (!tokenConfig.name || tokenConfig.name.length < 2) {
      errors.push('Token name must be at least 2 characters');
    }
    if (!tokenConfig.symbol || tokenConfig.symbol.length < 2) {
      errors.push('Token symbol must be at least 2 characters');
    }
    if (!tokenConfig.description || tokenConfig.description.length < 10) {
      errors.push('Token description must be at least 10 characters');
    }

    // Bundle validation
    const totalSol = parseFloat(bundleConfig.totalSolAmount);
    const devBuy = parseFloat(bundleConfig.devBuyAmount);
    const jitoTip = parseFloat(bundleConfig.jitoTipAmount);
    const wallets = parseInt(bundleConfig.numberOfWallets);

    if (isNaN(totalSol) || totalSol < 1) {
      errors.push('Total SOL amount must be at least 1 SOL');
    }
    if (isNaN(devBuy) || devBuy < 0) {
      errors.push('Dev buy amount must be 0 or greater');
    }
    if (isNaN(jitoTip) || jitoTip < 0.0001) {
      errors.push('Jito tip must be at least 0.0001 SOL');
    }
    if (isNaN(wallets) || wallets < 1 || wallets > 21) {
      errors.push('Number of wallets must be between 1 and 21');
    }

    // Warnings
    if (totalSol < 5) {
      warnings.push('Consider using at least 5 SOL for better distribution');
    }
    if (jitoTip < 0.001) {
      warnings.push('Jito tip below 0.001 SOL may result in slower inclusion');
    }
    if (bundleConfig.useVanityAddress) {
      warnings.push('Vanity address generation may take additional time');
    }

    res.json({
      success: errors.length === 0,
      errors,
      warnings,
      estimatedCost: {
        totalSol: totalSol + devBuy + jitoTip,
        breakdown: {
          distribution: totalSol,
          devBuy: devBuy,
          jitoTip: jitoTip,
          networkFees: 0.01 // Estimate
        }
      }
    });

  } catch (error) {
    logger.error('Error validating bundle:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate bundle configuration'
    });
  }
});

// Execute bundle
router.post('/bundles/execute', authMiddleware, async (req, res) => {
  try {
    const { tokenConfig, bundleConfig, simulation = true, imagePath } = req.body;
    const pumpfunBundler = require('../services/pumpfunBundler');

    // For safety, always run in simulation mode unless explicitly disabled
    if (!simulation && process.env.ENABLE_LIVE_TRADING !== 'true') {
      return res.status(400).json({
        success: false,
        error: 'Live trading is disabled. Set ENABLE_LIVE_TRADING=true to enable.'
      });
    }

    if (simulation) {
      // Run simulation
      const tokenMint = (bundleConfig.vanityPrefix || '') + 
        Math.random().toString(36).substring(2, 15).toUpperCase();
      
      const results = {
        tokenMint,
        metadataUri: 'ipfs://Qm' + Math.random().toString(36).substring(2, 15),
        lutAddress: 'LUT' + Math.random().toString(36).substring(2, 15).toUpperCase(),
        bundleId: 'BDL' + Math.random().toString(36).substring(2, 15).toUpperCase(),
        walletCount: parseInt(bundleConfig.numberOfWallets),
        totalSolSpent: bundleConfig.totalSolAmount,
        bondingCurveProgress: (Math.random() * 30 + 10).toFixed(2),
        marketCap: (parseFloat(bundleConfig.totalSolAmount) * 150 + Math.random() * 1000).toFixed(2),
        transactionHash: '5' + Math.random().toString(36).substring(2, 15),
        timestamp: new Date().toISOString(),
        status: 'completed',
        simulation: true
      };

      res.json({
        success: true,
        simulation: true,
        results
      });
    } else {
      // Execute real bundle
      logger.info('Executing real Pump.fun bundle launch', {
        tokenName: tokenConfig.name,
        tokenSymbol: tokenConfig.symbol,
        userId: req.user.userId
      });

      // Parse wallet keys if provided
      let purchaseWalletKeys = [];
      if (bundleConfig.walletInputMethod === 'manual' && bundleConfig.purchaseWallets) {
        purchaseWalletKeys = bundleConfig.purchaseWallets
          .split('\n')
          .map(key => key.trim())
          .filter(key => key.length > 0);
      }

      const config = {
        rpcUrl: bundleConfig.rpcUrl,
        mainWalletPrivateKey: bundleConfig.mainWalletPrivateKey,
        tokenConfig,
        totalSolAmount: parseFloat(bundleConfig.totalSolAmount),
        numberOfWallets: parseInt(bundleConfig.numberOfWallets),
        solPerWallet: parseFloat(bundleConfig.solPerWallet),
        devBuyAmount: parseFloat(bundleConfig.devBuyAmount),
        jitoTipAmount: parseFloat(bundleConfig.jitoTipAmount),
        useVanityAddress: bundleConfig.useVanityAddress,
        vanityPrefix: bundleConfig.vanityPrefix,
        walletInputMethod: bundleConfig.walletInputMethod,
        purchaseWalletKeys,
        imagePath
      };

      const results = await pumpfunBundler.executeBundleLaunch(config);

      // Log successful launch
      logger.info('Bundle launch completed', {
        tokenMint: results.tokenMint,
        bundleId: results.bundleId,
        userId: req.user.userId
      });

      res.json({
        success: true,
        simulation: false,
        results
      });
    }

  } catch (error) {
    logger.error('Error executing bundle:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to execute bundle'
    });
  }
});

// Get bundle status
router.get('/bundles/status/:bundleId', authMiddleware, async (req, res) => {
  try {
    const { bundleId } = req.params;

    // Mock status response
    const statuses = ['pending', 'executing', 'completed', 'failed'];
    const status = statuses[Math.floor(Math.random() * statuses.length)];

    res.json({
      success: true,
      bundle: {
        id: bundleId,
        status,
        progress: status === 'completed' ? 100 : Math.floor(Math.random() * 90),
        lastUpdated: new Date().toISOString(),
        details: {
          walletsProcessed: Math.floor(Math.random() * 20),
          transactionsConfirmed: Math.floor(Math.random() * 20),
          bondingCurveProgress: (Math.random() * 30 + 10).toFixed(2)
        }
      }
    });

  } catch (error) {
    logger.error('Error fetching bundle status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch bundle status'
    });
  }
});

// Get user's launch history
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Mock launch history
    const history = [
      {
        id: 'LAUNCH-001',
        tokenName: 'Test Token',
        tokenSymbol: 'TEST',
        tokenMint: 'TEST' + Math.random().toString(36).substring(2, 10).toUpperCase(),
        launchType: 'pumpfun-bundle',
        status: 'completed',
        bondingCurveProgress: 85.5,
        marketCap: 125000,
        totalSolSpent: 10,
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'LAUNCH-002',
        tokenName: 'Moon Token',
        tokenSymbol: 'MOON',
        tokenMint: 'MOON' + Math.random().toString(36).substring(2, 10).toUpperCase(),
        launchType: 'pumpfun-bundle',
        status: 'completed',
        bondingCurveProgress: 100,
        marketCap: 450000,
        totalSolSpent: 25,
        timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];

    res.json({
      success: true,
      launches: history,
      totalLaunches: history.length,
      successRate: 100
    });

  } catch (error) {
    logger.error('Error fetching launch history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch launch history'
    });
  }
});

// Estimate vanity address generation time
router.post('/bundles/estimate-vanity', authMiddleware, async (req, res) => {
  try {
    const { prefix } = req.body;

    if (!prefix || prefix.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Prefix is required'
      });
    }

    // Estimate based on prefix length
    const difficulty = Math.pow(58, prefix.length);
    const estimatedSeconds = difficulty / 10000; // Rough estimate

    res.json({
      success: true,
      prefix,
      difficulty,
      estimatedTime: {
        seconds: estimatedSeconds,
        formatted: estimatedSeconds < 60 ? 
          `${estimatedSeconds.toFixed(0)} seconds` :
          `${(estimatedSeconds / 60).toFixed(1)} minutes`
      },
      warning: prefix.length > 4 ? 
        'Prefixes longer than 4 characters may take a very long time' : null
    });

  } catch (error) {
    logger.error('Error estimating vanity generation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to estimate vanity generation time'
    });
  }
});

module.exports = router;