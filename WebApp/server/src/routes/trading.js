const express = require('express');
const router = express.Router();

router.get('/pairs', async (req, res) => {
  try {
    // Return available trading pairs
    res.json({
      success: true,
      pairs: [
        { symbol: 'SOL/USDC', base: 'SOL', quote: 'USDC' },
        { symbol: 'ETH/USDC', base: 'ETH', quote: 'USDC' }
      ]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

router.post('/order', async (req, res) => {
  try {
    const { pair, side, amount, price, type } = req.body;
    
    // Process order (would interact with DEX/CEX)
    res.json({
      success: true,
      orderId: `order_${Date.now()}`,
      message: 'Order placed successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;