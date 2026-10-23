const express = require('express');
const axios = require('axios');
const router = express.Router();

const MONITORING_URL = process.env.UPTIME_KUMA_URL || 'http://uptime-kuma:3001';

router.get('/', async (req, res) => {
  let engine = 'unreachable';
  let engineError = null;

  try {
    const health = await axios.get(MONITORING_URL + '/health', { timeout: 3000 });
    engine = health.status === 200 ? 'connected' : 'unreachable';
  } catch (error) {
    engineError = error.message;
  }

  res.json({
    status: 'healthy',
    service: 'edunetguard-api',
    monitoring_engine: engine,
    monitoring_engine_error: engineError,
    timestamp: new Date().toISOString(),
    version: '0.6.0',
  });
});

module.exports = router;
