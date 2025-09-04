const express = require('express');
const router = express.Router();

// General API endpoints
router.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

router.get('/user/profile', (req, res) => {
  // Return user profile
  res.json({
    success: true,
    user: {
      id: req.userId,
      // Add more user data here
    }
  });
});

module.exports = router;