const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const TokenService = require('../services/tokenService');

// Apply auth middleware to all routes
router.use(authMiddleware);

// Prepare token creation transaction
router.post('/prepare-creation', async (req, res) => {
  try {
    const {
      name,
      symbol,
      totalSupply,
      decimals,
      description,
      website,
      twitter,
      telegram,
      blockchain,
      creatorAddress
    } = req.body;

    // Validate required fields
    if (!name || !symbol || !totalSupply || !blockchain || !creatorAddress) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Prepare the transaction based on blockchain
    let transaction;
    switch (blockchain) {
      case 'solana':
        transaction = await TokenService.prepareSolanaTokenCreation({
          name,
          symbol,
          totalSupply,
          decimals: decimals || 9,
          metadata: { description, website, twitter, telegram },
          creatorAddress
        });
        break;
      
      case 'ethereum':
      case 'bsc':
      case 'base':
        transaction = await TokenService.prepareEVMTokenCreation({
          name,
          symbol,
          totalSupply,
          decimals: decimals || 18,
          blockchain,
          creatorAddress
        });
        break;
      
      default:
        return res.status(400).json({
          success: false,
          message: 'Unsupported blockchain'
        });
    }

    res.json({
      success: true,
      transaction
    });
  } catch (error) {
    console.error('Token preparation error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Deploy signed token transaction
router.post('/deploy', async (req, res) => {
  try {
    const { signedTransaction, blockchain, metadata } = req.body;

    if (!signedTransaction || !blockchain) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Broadcast the signed transaction
    let result;
    switch (blockchain) {
      case 'solana':
        result = await TokenService.deploySolanaToken(signedTransaction);
        break;
      
      case 'ethereum':
      case 'bsc':
      case 'base':
        result = await TokenService.deployEVMToken(signedTransaction, blockchain);
        break;
      
      default:
        return res.status(400).json({
          success: false,
          message: 'Unsupported blockchain'
        });
    }

    // Save token to database
    const Token = require('../models/Token');
    const token = new Token({
      userId: req.userId,
      name: metadata.name,
      symbol: metadata.symbol,
      totalSupply: metadata.totalSupply,
      decimals: metadata.decimals,
      contractAddress: result.contractAddress,
      transactionHash: result.transactionHash,
      blockchain,
      metadata,
      createdAt: new Date()
    });
    
    await token.save();

    res.json({
      success: true,
      contractAddress: result.contractAddress,
      transactionHash: result.transactionHash
    });
  } catch (error) {
    console.error('Token deployment error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get user's tokens
router.get('/my-tokens', async (req, res) => {
  try {
    const { blockchain } = req.query;
    const Token = require('../models/Token');
    
    const query = { userId: req.userId };
    if (blockchain) {
      query.blockchain = blockchain;
    }

    const tokens = await Token.find(query).sort({ createdAt: -1 });

    res.json({
      success: true,
      tokens
    });
  } catch (error) {
    console.error('Error fetching tokens:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get token details
router.get('/:contractAddress', async (req, res) => {
  try {
    const { contractAddress } = req.params;
    const { blockchain } = req.query;

    if (!blockchain) {
      return res.status(400).json({
        success: false,
        message: 'Blockchain parameter required'
      });
    }

    // Fetch token details from blockchain
    const details = await TokenService.getTokenDetails(contractAddress, blockchain);

    res.json({
      success: true,
      token: details
    });
  } catch (error) {
    console.error('Error fetching token details:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Token operations (mint, burn, etc.)
router.post('/:contractAddress/mint', async (req, res) => {
  try {
    const { contractAddress } = req.params;
    const { amount, recipient, blockchain } = req.body;

    // Prepare mint transaction
    const transaction = await TokenService.prepareMintTransaction({
      contractAddress,
      amount,
      recipient,
      blockchain
    });

    res.json({
      success: true,
      transaction
    });
  } catch (error) {
    console.error('Error preparing mint transaction:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

router.post('/:contractAddress/burn', async (req, res) => {
  try {
    const { contractAddress } = req.params;
    const { amount, blockchain } = req.body;

    // Prepare burn transaction
    const transaction = await TokenService.prepareBurnTransaction({
      contractAddress,
      amount,
      blockchain
    });

    res.json({
      success: true,
      transaction
    });
  } catch (error) {
    console.error('Error preparing burn transaction:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;