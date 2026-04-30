const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const UPTIME_KUMA_URL = process.env.UPTIME_KUMA_URL || 'http://uptime-kuma:3001';
const ALLOW_DEMO_FALLBACK = process.env.ALLOW_DEMO_FALLBACK !== 'false';
const DEMO_STATUS_PATH = path.join(__dirname, '../../data/demo_status.json');

function loadDemoStatus() {
  const raw = fs.readFileSync(DEMO_STATUS_PATH, 'utf8');
  const data = JSON.parse(raw);
  data.timestamp = new Date().toISOString();
  data.services = data.services.map((service) => ({
    ...service,
    last_check: new Date().toISOString(),
  }));
  data.demo_mode = true;
  return data;
}

function transformKumaStatus(data) {
  const transformed = {
    timestamp: new Date().toISOString(),
    overall: { status: 'operational', uptime_percentage: 100 },
    services: [],
    demo_mode: false,
  };

  if (data && data.publicGroupList) {
    data.publicGroupList.forEach((group) => {
      if (group.monitorList) {
        group.monitorList.forEach((monitor) => {
          transformed.services.push({
            id: monitor.id,
            name: monitor.name,
            status: monitor.status === 1 ? 'up' : monitor.status === 0 ? 'down' : 'pending',
            uptime: monitor.uptime || 100,
            last_check: monitor.lastCheck ? new Date(monitor.lastCheck).toISOString() : null,
            group: group.name || 'General',
            type: monitor.type || 'http',
            url: monitor.url || null,
          });
        });
      }
    });
  }

  const downCount = transformed.services.filter((s) => s.status === 'down').length;
  if (downCount === 0) transformed.overall.status = 'operational';
  else if (downCount === transformed.services.length) transformed.overall.status = 'major_outage';
  else transformed.overall.status = 'partial_outage';

  if (transformed.services.length > 0) {
    const avgUptime = transformed.services.reduce((sum, s) => sum + (s.uptime || 100), 0) / transformed.services.length;
    transformed.overall.uptime_percentage = Math.round(avgUptime * 100) / 100;
  }

  return transformed;
}

router.get('/', async (req, res) => {
  const cacheKey = 'monitors_status';
  const cached = req.cache.get(cacheKey);
  if (cached) return res.json(cached);

  try {
    const response = await axios.get(`${UPTIME_KUMA_URL}/api/status-page/default`, {
      timeout: 10000,
      headers: { Accept: 'application/json' },
    });

    const transformed = transformKumaStatus(response.data);
    req.cache.set(cacheKey, transformed);
    return res.json(transformed);
  } catch (error) {
    console.warn('Uptime Kuma status unavailable:', error.message);

    if (ALLOW_DEMO_FALLBACK) {
      const demo = loadDemoStatus();
      demo.warning = 'Demo fallback is active. Configure Uptime Kuma monitors to show live data.';
      req.cache.set(cacheKey, demo, 10);
      return res.json(demo);
    }

    return res.status(503).json({
      error: 'Unable to fetch status from monitoring service',
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const cacheKey = `monitor_${id}`;
    const cached = req.cache.get(cacheKey);
    if (cached) return res.json(cached);

    const [statusRes, uptimeRes] = await Promise.all([
      axios.get(`${UPTIME_KUMA_URL}/api/badge/${id}/status`, { timeout: 5000 }),
      axios.get(`${UPTIME_KUMA_URL}/api/badge/${id}/uptime/24`, { timeout: 5000 }),
    ]);

    const data = {
      id,
      status: statusRes.data,
      uptime_24h: uptimeRes.data,
      timestamp: new Date().toISOString(),
    };

    req.cache.set(cacheKey, data);
    res.json(data);
  } catch (error) {
    res.status(503).json({ error: 'Unable to fetch monitor details', message: error.message });
  }
});

module.exports = router;
