const express = require('express');
const axios = require('axios');
const router = express.Router();

const UPTIME_KUMA_URL = process.env.UPTIME_KUMA_URL || 'http://uptime-kuma:3001';

router.get('/', async (req, res) => {
  let kuma = 'unreachable';
  let kuma_error = null;

  try {
    const kumaHealth = await axios.get(`${UPTIME_KUMA_URL}/health`, { timeout: 3000 });
    kuma = kumaHealth.status === 200 ? 'connected' : 'unreachable';
  } catch (error) {
    kuma_error = error.message;
  }

  res.json({
    status: 'healthy',
    service: 'edunetguard-api',
    uptime_kuma: kuma,
    uptime_kuma_error: kuma_error,
    timestamp: new Date().toISOString(),
    version: '0.1.0',
  });
});

module.exports = router;
