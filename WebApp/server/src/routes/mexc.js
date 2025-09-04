const express = require('express');
const router = express.Router();
const crypto = require('crypto');

// Store trading instances in memory (use Redis in production)
const tradingInstances = new Map();
const instanceLogs = new Map();

// Simulate market data
const marketData = {
  'BTC/USDT': { price: 45000, change24h: 2.5 },
  'ETH/USDT': { price: 2500, change24h: -1.2 },
  'SOL/USDT': { price: 100, change24h: 5.8 },
  'BNB/USDT': { price: 320, change24h: 0.8 },
  'XRP/USDT': { price: 0.65, change24h: -0.5 }
};

// Start a trading instance
router.post('/start', async (req, res) => {
  try {
    const { instanceId, config } = req.body;
    
    // Validate configuration
    if (!config.apiKey || !config.apiSecret) {
      return res.status(400).json({
        success: false,
        message: 'API credentials are required'
      });
    }

    // Initialize instance
    const instance = {
      id: instanceId,
      status: 'running',
      config: config,
      startTime: Date.now(),
      stats: {
        totalTrades: 0,
        successfulTrades: 0,
        failedTrades: 0,
        totalVolume: 0,
        pnl: 0,
        currentPosition: 0
      }
    };

    tradingInstances.set(instanceId, instance);
    instanceLogs.set(instanceId, []);

    // Add initial logs
    addLog(instanceId, 'Market maker started', 'success');
    addLog(instanceId, `Trading pair: ${config.tradingPair}`, 'info');
    addLog(instanceId, `Bid spread: ${config.bidSpread}%, Ask spread: ${config.askSpread}%`, 'info');
    addLog(instanceId, `Order amount: ${config.orderAmount}`, 'info');

    // Start simulated trading
    startSimulatedTrading(instanceId);

    res.json({
      success: true,
      message: 'Market maker started successfully',
      instanceId
    });

  } catch (error) {
    console.error('Error starting market maker:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Stop a trading instance
router.post('/stop', async (req, res) => {
  try {
    const { instanceId } = req.body;
    const instance = tradingInstances.get(instanceId);

    if (!instance) {
      return res.status(404).json({
        success: false,
        message: 'Instance not found'
      });
    }

    instance.status = 'stopped';
    addLog(instanceId, 'Market maker stopped', 'warning');

    res.json({
      success: true,
      message: 'Market maker stopped successfully'
    });

  } catch (error) {
    console.error('Error stopping market maker:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get instance status
router.get('/status/:instanceId', async (req, res) => {
  try {
    const { instanceId } = req.params;
    const instance = tradingInstances.get(instanceId);

    if (!instance) {
      return res.json({
        success: false,
        message: 'Instance not found'
      });
    }

    const runTime = Date.now() - instance.startTime;
    const market = marketData[instance.config.tradingPair] || { price: 0, change24h: 0 };

    res.json({
      success: true,
      status: instance.status,
      runTime,
      stats: instance.stats,
      marketData: market,
      config: {
        tradingPair: instance.config.tradingPair,
        bidSpread: instance.config.bidSpread,
        askSpread: instance.config.askSpread
      }
    });

  } catch (error) {
    console.error('Error getting status:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get instance logs
router.get('/logs/:instanceId', async (req, res) => {
  try {
    const { instanceId } = req.params;
    const logs = instanceLogs.get(instanceId) || [];

    res.json({
      success: true,
      logs: logs.slice(-100) // Return last 100 logs
    });

  } catch (error) {
    console.error('Error getting logs:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Update configuration
router.put('/config/:instanceId', async (req, res) => {
  try {
    const { instanceId } = req.params;
    const { config } = req.body;
    const instance = tradingInstances.get(instanceId);

    if (!instance) {
      return res.status(404).json({
        success: false,
        message: 'Instance not found'
      });
    }

    instance.config = { ...instance.config, ...config };
    addLog(instanceId, 'Configuration updated', 'info');

    res.json({
      success: true,
      message: 'Configuration updated successfully'
    });

  } catch (error) {
    console.error('Error updating config:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Helper functions
function addLog(instanceId, message, type = 'info') {
  const logs = instanceLogs.get(instanceId) || [];
  const timestamp = new Date().toISOString();
  
  logs.push({
    timestamp,
    message,
    type
  });

  // Keep only last 1000 logs
  if (logs.length > 1000) {
    logs.splice(0, logs.length - 1000);
  }

  instanceLogs.set(instanceId, logs);
}

// Simulate trading activity
function startSimulatedTrading(instanceId) {
  const interval = setInterval(() => {
    const instance = tradingInstances.get(instanceId);
    
    if (!instance || instance.status !== 'running') {
      clearInterval(interval);
      return;
    }

    // Simulate various trading activities
    const activities = [
      { action: 'place_bid', success: 0.95 },
      { action: 'place_ask', success: 0.95 },
      { action: 'fill_order', success: 0.7 },
      { action: 'cancel_order', success: 0.98 },
      { action: 'update_spread', success: 1 }
    ];

    const activity = activities[Math.floor(Math.random() * activities.length)];
    const isSuccess = Math.random() < activity.success;

    switch (activity.action) {
      case 'place_bid':
        if (isSuccess) {
          const price = getMarketPrice(instance.config.tradingPair) * (1 - instance.config.bidSpread / 100);
          addLog(instanceId, `Placed bid order at ${price.toFixed(2)}`, 'info');
        } else {
          addLog(instanceId, 'Failed to place bid order: Insufficient balance', 'error');
        }
        break;

      case 'place_ask':
        if (isSuccess) {
          const price = getMarketPrice(instance.config.tradingPair) * (1 + instance.config.askSpread / 100);
          addLog(instanceId, `Placed ask order at ${price.toFixed(2)}`, 'info');
        } else {
          addLog(instanceId, 'Failed to place ask order: API error', 'error');
        }
        break;

      case 'fill_order':
        if (isSuccess) {
          const side = Math.random() > 0.5 ? 'buy' : 'sell';
          const amount = instance.config.orderAmount;
          const price = getMarketPrice(instance.config.tradingPair);
          
          instance.stats.totalTrades++;
          instance.stats.successfulTrades++;
          instance.stats.totalVolume += amount * price;
          
          if (side === 'buy') {
            instance.stats.currentPosition += amount;
            instance.stats.pnl -= amount * price * 0.001; // Simulate fees
          } else {
            instance.stats.currentPosition -= amount;
            instance.stats.pnl += amount * price * 0.001; // Simulate profit
          }
          
          addLog(instanceId, `Order filled: ${side} ${amount} @ ${price.toFixed(2)}`, 'success');
        }
        break;

      case 'cancel_order':
        if (isSuccess) {
          addLog(instanceId, 'Cancelled stale order', 'warning');
        }
        break;

      case 'update_spread':
        const newBidSpread = (instance.config.bidSpread + (Math.random() - 0.5) * 0.02).toFixed(2);
        const newAskSpread = (instance.config.askSpread + (Math.random() - 0.5) * 0.02).toFixed(2);
        addLog(instanceId, `Updated spreads - Bid: ${newBidSpread}%, Ask: ${newAskSpread}%`, 'info');
        break;
    }

    // Update stats
    if (!isSuccess && activity.action.includes('order')) {
      instance.stats.failedTrades++;
    }

  }, 5000); // Simulate activity every 5 seconds
}

function getMarketPrice(pair) {
  const market = marketData[pair];
  if (!market) return 0;
  
  // Add some random variation
  const variation = (Math.random() - 0.5) * 0.002;
  return market.price * (1 + variation);
}

module.exports = router;