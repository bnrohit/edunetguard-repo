const express = require('express');
const axios = require('axios');
const fs = require('fs');
const { version } = require('../../package.json');
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

  // Alpine separates Nmap from its NSE runtime data. Report that separately:
  // a healthy monitoring engine does not imply device identification works.
  const discoveryReady =
    fs.existsSync('/usr/share/nmap/nse_main.lua') &&
    fs.existsSync('/usr/share/nmap/nmap-service-probes');

  res.json({
    status: discoveryReady ? 'healthy' : 'degraded',
    service: 'edunetguard-api',
    monitoring_engine: engine,
    monitoring_engine_error: engineError,
    device_discovery: discoveryReady ? 'ready' : 'unavailable',
    device_discovery_error: discoveryReady ? null :
      'Nmap NSE runtime data missing; rebuild backend with nmap-nselibs and nmap-scripts.',
    timestamp: new Date().toISOString(),
    version,
  });
});

module.exports = router;
