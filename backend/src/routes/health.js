const express = require('express');
const axios = require('axios');
const router = express.Router();

const UPTIME_KUMA_URL = process.env.UPTIME_KUMA_URL || 'http://uptime-kuma:3001';

router.get('/', async (req, res) => {
  try {
    // Check Uptime Kuma connectivity
    const kumaHealth = await axios.get(`${UPTIME_KUMA_URL}/health`, {
      timeout: 5000,
    });

    res.json({
      status: 'healthy',
      uptime_kuma: kumaHealth.status === 200 ? 'connected' : 'unreachable',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      uptime_kuma: 'unreachable',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

module.exports = router;
