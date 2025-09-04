const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');

// Store warmup instances
const warmupInstances = new Map();
const warmupLogs = new Map();

// Create warmup process
router.post('/start', async (req, res) => {
  try {
    const {
      instanceId,
      wallets,
      tokens,
      gasFee,
      priorityFee,
      timeBetweenTx,
      shuffleWallets,
      randomizeAmounts
    } = req.body;

    // Validate inputs
    if (!wallets || wallets.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No wallets provided'
      });
    }

    if (!tokens || tokens.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No tokens provided'
      });
    }

    // Initialize logs for this instance
    warmupLogs.set(instanceId, []);

    // Create temp directory if it doesn't exist
    const tempDir = path.join(process.cwd(), 'temp');
    await fs.mkdir(tempDir, { recursive: true });

    // Write wallets to CSV
    const walletsPath = path.join(tempDir, `wallets_${instanceId}.csv`);
    const walletsContent = 'private_key,label\n' + 
      wallets.map((w, i) => `${w},wallet_${i + 1}`).join('\n');
    await fs.writeFile(walletsPath, walletsContent);

    // Write tokens to CSV
    const tokensPath = path.join(tempDir, `tokens_${instanceId}.csv`);
    const tokensContent = 'token_address,name,description\n' +
      tokens.map((t, i) => `${t},token_${i + 1},warmup_token`).join('\n');
    await fs.writeFile(tokensPath, tokensContent);

    // Create config for this instance
    const configPath = path.join(tempDir, `config_${instanceId}.ts`);
    const configContent = `
export const BUY_AMOUNT = ${randomizeAmounts ? '0.02' : '0.05'};
export const TIME_PERIOD = ${timeBetweenTx};
export const GAS_FEE = ${gasFee};
export const PRIORITY_FEE = ${priorityFee};
export const SHUFFLE_WALLETS = ${shuffleWallets};
export const RANDOMIZE_AMOUNTS = ${randomizeAmounts};
export const WALLETS_CSV = '${walletsPath}';
export const TOKENS_CSV = '${tokensPath}';
`;
    await fs.writeFile(configPath, configContent);

    // Add log entry
    addLog(instanceId, 'Starting wallet warmup process...');
    addLog(instanceId, `Loaded ${wallets.length} wallets`);
    addLog(instanceId, `Using ${tokens.length} tokens for warmup`);
    addLog(instanceId, `Time between transactions: ${timeBetweenTx} seconds`);

    // Create warmup instance
    const instance = {
      id: instanceId,
      status: 'running',
      startTime: Date.now(),
      config: {
        wallets: wallets.length,
        tokens: tokens.length,
        timeBetweenTx,
        shuffleWallets,
        randomizeAmounts,
        gasFee,
        priorityFee
      }
    };

    warmupInstances.set(instanceId, instance);

    // Simulate warmup execution
    simulateWarmupExecution(instanceId, wallets, tokens, timeBetweenTx);

    res.json({
      success: true,
      message: 'Warmup started successfully',
      instanceId
    });

  } catch (error) {
    console.error('Error starting warmup:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Stop warmup process
router.post('/stop', async (req, res) => {
  try {
    const { instanceId } = req.body;
    const instance = warmupInstances.get(instanceId);

    if (!instance) {
      return res.status(404).json({
        success: false,
        message: 'Instance not found'
      });
    }

    instance.status = 'stopped';
    addLog(instanceId, 'Warmup process stopped by user');

    // Clean up temp files
    await cleanupTempFiles(instanceId);

    res.json({
      success: true,
      message: 'Warmup stopped successfully'
    });

  } catch (error) {
    console.error('Error stopping warmup:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get warmup status
router.get('/status/:instanceId', async (req, res) => {
  try {
    const { instanceId } = req.params;
    const instance = warmupInstances.get(instanceId);

    if (!instance) {
      return res.json({
        success: false,
        message: 'Instance not found'
      });
    }

    res.json({
      success: true,
      status: instance.status,
      startTime: instance.startTime,
      config: instance.config
    });

  } catch (error) {
    console.error('Error getting status:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get warmup logs
router.get('/logs/:instanceId', async (req, res) => {
  try {
    const { instanceId } = req.params;
    const logs = warmupLogs.get(instanceId) || [];

    res.json({
      success: true,
      logs: logs.map(log => `[${log.timestamp}] ${log.message}`)
    });

  } catch (error) {
    console.error('Error getting logs:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Helper functions
function addLog(instanceId, message, type = 'info') {
  const logs = warmupLogs.get(instanceId) || [];
  const timestamp = new Date().toLocaleTimeString();
  
  logs.push({
    timestamp,
    message,
    type
  });

  // Keep only last 1000 logs
  if (logs.length > 1000) {
    logs.splice(0, logs.length - 1000);
  }

  warmupLogs.set(instanceId, logs);
}

async function cleanupTempFiles(instanceId) {
  const tempDir = path.join(process.cwd(), 'temp');
  const files = [
    `wallets_${instanceId}.csv`,
    `tokens_${instanceId}.csv`,
    `config_${instanceId}.ts`
  ];

  for (const file of files) {
    try {
      await fs.unlink(path.join(tempDir, file));
    } catch (error) {
      // Ignore if file doesn't exist
    }
  }
}

// Simulate warmup execution (temporary implementation)
function simulateWarmupExecution(instanceId, wallets, tokens, timeBetweenTx) {
  let walletIndex = 0;
  let transactionCount = 0;

  const executeTransaction = () => {
    const instance = warmupInstances.get(instanceId);
    if (!instance || instance.status !== 'running') {
      return;
    }

    if (walletIndex >= wallets.length) {
      walletIndex = 0; // Loop back to start
    }

    const wallet = walletIndex + 1;
    const token = tokens[Math.floor(Math.random() * tokens.length)];
    const amount = (Math.random() * 0.02 + 0.01).toFixed(4);
    const action = Math.random() > 0.5 ? 'buy' : 'sell';

    transactionCount++;
    addLog(instanceId, `[TX ${transactionCount}] Wallet ${wallet}: ${action} ${amount} SOL of token`, 'info');
    
    // Simulate transaction processing
    setTimeout(() => {
      if (Math.random() > 0.1) {
        addLog(instanceId, `[TX ${transactionCount}] Transaction successful`, 'success');
      } else {
        addLog(instanceId, `[TX ${transactionCount}] Transaction failed: simulated error`, 'error');
      }
      
      walletIndex++;
      
      // Schedule next transaction
      const nextInstance = warmupInstances.get(instanceId);
      if (nextInstance && nextInstance.status === 'running') {
        setTimeout(executeTransaction, timeBetweenTx * 1000);
      }
    }, 2000);
  };

  // Start first transaction after a short delay
  setTimeout(executeTransaction, 2000);
}

module.exports = router;