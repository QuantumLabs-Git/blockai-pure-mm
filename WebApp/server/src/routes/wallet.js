const express = require('express');
const router = express.Router();
const { Web3 } = require('web3');
const nacl = require('tweetnacl');
const bs58 = require('bs58');
const crypto = require('crypto');
const { getWalletBalances, getTokenInfo, NATIVE_TOKENS } = require('../services/balanceService');

// Initialize Web3 for EVM chains
const web3 = new Web3();

// Generate Solana keypair
function generateSolanaKeypair() {
  // Generate a random keypair using Ed25519
  const keypair = nacl.sign.keyPair();
  
  // Get the private key (seed + public key for Solana format)
  const privateKeyBytes = Buffer.concat([
    Buffer.from(keypair.secretKey.slice(0, 32)), // seed
    Buffer.from(keypair.publicKey) // public key
  ]);
  
  // Encode in base58
  const privateKey = bs58.encode(privateKeyBytes);
  const publicKey = bs58.encode(keypair.publicKey);
  
  return { privateKey, publicKey };
}

// Wallet generation endpoint
router.post('/generate', async (req, res) => {
  try {
    const { walletCount, blockchain, fileName } = req.body;
    
    // Validate inputs
    if (!walletCount || walletCount < 1 || walletCount > 1000) {
      return res.status(400).json({
        success: false,
        message: 'Wallet count must be between 1 and 1000'
      });
    }
    
    const wallets = [];
    
    if (blockchain === 'solana') {
      // Generate Solana wallets
      for (let i = 0; i < walletCount; i++) {
        try {
          const { privateKey, publicKey } = generateSolanaKeypair();
          wallets.push({
            address: publicKey,
            privateKey: privateKey
          });
        } catch (error) {
          console.error(`Error generating Solana wallet ${i + 1}:`, error);
        }
      }
    } else if (['ethereum', 'bsc', 'base'].includes(blockchain)) {
      // Generate EVM wallets
      for (let i = 0; i < walletCount; i++) {
        try {
          const account = web3.eth.accounts.create();
          let privateKey = account.privateKey;
          
          // Remove 0x prefix if present
          if (privateKey.startsWith('0x')) {
            privateKey = privateKey.slice(2);
          }
          
          wallets.push({
            address: account.address,
            privateKey: privateKey
          });
        } catch (error) {
          console.error(`Error generating ${blockchain} wallet ${i + 1}:`, error);
        }
      }
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid blockchain type'
      });
    }
    
    if (wallets.length === 0) {
      return res.status(500).json({
        success: false,
        message: 'Failed to generate any wallets'
      });
    }
    
    res.json({
      success: true,
      message: `Generated ${wallets.length} ${blockchain} wallets`,
      wallets: wallets
    });
  } catch (error) {
    console.error('Wallet generation error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Prepare transaction for signing
router.post('/prepare-transaction', async (req, res) => {
  try {
    const { from, to, amount, blockchain } = req.body;
    
    // Prepare unsigned transaction
    const unsignedTx = {
      from,
      to,
      amount,
      nonce: 0, // Would be fetched from blockchain
      gasPrice: '20000000000',
      gasLimit: '21000',
      chainId: 1
    };
    
    res.json({
      success: true,
      transaction: unsignedTx
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Broadcast signed transaction
router.post('/broadcast', async (req, res) => {
  try {
    const { signedTransaction, blockchain } = req.body;
    
    // Broadcast to blockchain
    // This would use web3.js or @solana/web3.js
    
    res.json({
      success: true,
      txHash: '0x...' // Placeholder
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get wallet balances for a project
router.post('/balances', async (req, res) => {
  try {
    const { chain, wallets, tokenAddress } = req.body;
    
    // Validate inputs
    if (!chain || !wallets || !Array.isArray(wallets)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request parameters'
      });
    }

    if (wallets.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No wallets provided'
      });
    }

    // Get native token info
    const nativeToken = NATIVE_TOKENS[chain];
    if (!nativeToken) {
      return res.status(400).json({
        success: false,
        message: 'Unsupported blockchain'
      });
    }

    // Fetch balances
    const balances = await getWalletBalances(chain, wallets, tokenAddress);
    
    // Get token info if a token address was provided
    let tokenInfo = null;
    if (tokenAddress && tokenAddress !== 'native') {
      tokenInfo = await getTokenInfo(chain, tokenAddress);
    }

    res.json({
      success: true,
      chain,
      nativeToken,
      tokenInfo,
      balances
    });
  } catch (error) {
    console.error('Balance fetch error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;