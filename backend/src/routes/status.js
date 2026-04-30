const express = require('express');
const axios = require('axios');
const router = express.Router();

const UPTIME_KUMA_URL = process.env.UPTIME_KUMA_URL || 'http://uptime-kuma:3001';

// Get all monitors status
router.get('/', async (req, res) => {
  try {
    const cacheKey = 'monitors_status';
    const cached = req.cache.get(cacheKey);

    if (cached) {
      return res.json(cached);
    }

    // Fetch from Uptime Kuma's public status page API
    // Note: This uses the badge/status page endpoints which are public
    const response = await axios.get(`${UPTIME_KUMA_URL}/api/status-page/default`, {
      timeout: 10000,
      headers: {
        'Accept': 'application/json',
      }
    });

    const data = response.data;

    // Transform to our format
    const transformed = {
      timestamp: new Date().toISOString(),
      overall: {
        status: 'operational', // calculated below
        uptime_percentage: 100,
      },
      services: [],
    };

    if (data && data.publicGroupList) {
      data.publicGroupList.forEach(group => {
        if (group.monitorList) {
          group.monitorList.forEach(monitor => {
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

    // Calculate overall status
    const downCount = transformed.services.filter(s => s.status === 'down').length;
    if (downCount === 0) {
      transformed.overall.status = 'operational';
    } else if (downCount === transformed.services.length) {
      transformed.overall.status = 'major_outage';
    } else {
      transformed.overall.status = 'partial_outage';
    }

    // Calculate average uptime
    if (transformed.services.length > 0) {
      const avgUptime = transformed.services.reduce((sum, s) => sum + (s.uptime || 100), 0) / transformed.services.length;
      transformed.overall.uptime_percentage = Math.round(avgUptime * 100) / 100;
    }

    req.cache.set(cacheKey, transformed);
    res.json(transformed);
  } catch (error) {
    console.error('Error fetching status:', error.message);
    res.status(503).json({
      error: 'Unable to fetch status from monitoring service',
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Get specific monitor details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const cacheKey = `monitor_${id}`;
    const cached = req.cache.get(cacheKey);

    if (cached) {
      return res.json(cached);
    }

    // Fetch monitor details from Uptime Kuma badge API
    const [statusRes, uptimeRes] = await Promise.all([
      axios.get(`${UPTIME_KUMA_URL}/api/badge/${id}/status`, { timeout: 5000 }),
      axios.get(`${UPTIME_KUMA_URL}/api/badge/${id}/uptime/24`, { timeout: 5000 }),
    ]);

    const data = {
      id: parseInt(id),
      status: statusRes.data,
      uptime_24h: uptimeRes.data,
      timestamp: new Date().toISOString(),
    };

    req.cache.set(cacheKey, data);
    res.json(data);
  } catch (error) {
    console.error(`Error fetching monitor ${req.params.id}:`, error.message);
    res.status(503).json({
      error: 'Unable to fetch monitor details',
      message: error.message,
    });
  }
});

module.exports = router;
