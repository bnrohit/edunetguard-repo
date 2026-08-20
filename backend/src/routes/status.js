const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const UPTIME_KUMA_URL = process.env.UPTIME_KUMA_URL || 'http://uptime-kuma:3001';
const UPTIME_KUMA_STATUS_PAGE = process.env.UPTIME_KUMA_STATUS_PAGE || 'edunetguard';
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
  data.source = {
    engine: 'demo',
    connected: false,
    status_page_slug: UPTIME_KUMA_STATUS_PAGE,
  };
  return data;
}

function latestHeartbeat(heartbeats = []) {
  if (!Array.isArray(heartbeats) || heartbeats.length === 0) return null;

  return heartbeats.reduce((latest, heartbeat) => {
    if (!latest) return heartbeat;
    const latestTime = Date.parse(latest.time || '') || 0;
    const currentTime = Date.parse(heartbeat.time || '') || 0;
    return currentTime >= latestTime ? heartbeat : latest;
  }, null);
}

function normalizeMonitorStatus(status) {
  switch (Number(status)) {
    case 1:
      return 'up';
    case 0:
      return 'down';
    case 3:
      return 'maintenance';
    case 2:
    default:
      return 'pending';
  }
}

function normalizeUptime(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  const percent = numeric <= 1 ? numeric * 100 : numeric;
  return Math.round(percent * 100) / 100;
}

function transformKumaStatus(pageData, heartbeatData) {
  const heartbeatList = heartbeatData?.heartbeatList || {};
  const uptimeList = heartbeatData?.uptimeList || {};

  const transformed = {
    timestamp: new Date().toISOString(),
    overall: { status: 'operational', uptime_percentage: 100 },
    services: [],
    incident: pageData?.incident || null,
    demo_mode: false,
    source: {
      engine: 'Uptime Kuma',
      connected: true,
      status_page_slug: UPTIME_KUMA_STATUS_PAGE,
      status_page_title: pageData?.config?.title || null,
    },
  };

  for (const group of pageData?.publicGroupList || []) {
    for (const monitor of group.monitorList || []) {
      const monitorId = String(monitor.id);
      const heartbeat = latestHeartbeat(heartbeatList[monitorId] || heartbeatList[monitor.id] || []);
      const uptime = normalizeUptime(
        uptimeList[`${monitorId}_24`] ??
        uptimeList[`${monitor.id}_24`] ??
        monitor.uptime
      );

      transformed.services.push({
        id: monitor.id,
        name: monitor.name,
        status: normalizeMonitorStatus(heartbeat?.status ?? monitor.status),
        uptime: uptime ?? 100,
        last_check: heartbeat?.time ? new Date(heartbeat.time).toISOString() : null,
        response_time_ms: Number.isFinite(Number(heartbeat?.ping)) ? Number(heartbeat.ping) : null,
        message: heartbeat?.msg || null,
        group: group.name || 'General',
        type: monitor.type || null,
      });
    }
  }

  const total = transformed.services.length;
  const downCount = transformed.services.filter((service) => service.status === 'down').length;
  const pendingCount = transformed.services.filter((service) => service.status === 'pending').length;

  if (total === 0) {
    transformed.overall.status = 'unknown';
    transformed.overall.uptime_percentage = 0;
    return transformed;
  }

  if (downCount === total) transformed.overall.status = 'major_outage';
  else if (downCount > 0 || pendingCount > 0) transformed.overall.status = 'partial_outage';
  else transformed.overall.status = 'operational';

  const uptimeValues = transformed.services
    .map((service) => Number(service.uptime))
    .filter(Number.isFinite);

  if (uptimeValues.length > 0) {
    const average = uptimeValues.reduce((sum, value) => sum + value, 0) / uptimeValues.length;
    transformed.overall.uptime_percentage = Math.round(average * 100) / 100;
  }

  return transformed;
}

async function fetchKumaStatus() {
  const slug = encodeURIComponent(UPTIME_KUMA_STATUS_PAGE);
  const [pageResponse, heartbeatResponse] = await Promise.all([
    axios.get(`${UPTIME_KUMA_URL}/api/status-page/${slug}`, {
      timeout: 10000,
      headers: { Accept: 'application/json' },
    }),
    axios.get(`${UPTIME_KUMA_URL}/api/status-page/heartbeat/${slug}`, {
      timeout: 10000,
      headers: { Accept: 'application/json' },
    }),
  ]);

  return transformKumaStatus(pageResponse.data, heartbeatResponse.data);
}

router.get('/', async (req, res) => {
  const cacheKey = 'monitors_status';
  const cached = req.cache.get(cacheKey);
  if (cached) return res.json(cached);

  try {
    const transformed = await fetchKumaStatus();
    req.cache.set(cacheKey, transformed);
    return res.json(transformed);
  } catch (error) {
    console.warn(
      `Uptime Kuma status page '${UPTIME_KUMA_STATUS_PAGE}' unavailable:`,
      error.message
    );

    if (ALLOW_DEMO_FALLBACK) {
      const demo = loadDemoStatus();
      demo.warning = `Live monitoring is unavailable. Publish an Uptime Kuma status page with slug '${UPTIME_KUMA_STATUS_PAGE}' and add monitors to it.`;
      req.cache.set(cacheKey, demo, 10);
      return res.json(demo);
    }

    return res.status(503).json({
      error: 'Unable to fetch status from monitoring service',
      message: error.message,
      status_page_slug: UPTIME_KUMA_STATUS_PAGE,
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

    const status = await fetchKumaStatus();
    const monitor = status.services.find((service) => String(service.id) === String(id));

    if (!monitor) {
      return res.status(404).json({
        error: 'Monitor not found on the configured public status page',
        id,
        status_page_slug: UPTIME_KUMA_STATUS_PAGE,
      });
    }

    const data = {
      ...monitor,
      timestamp: status.timestamp,
      source: status.source,
    };

    req.cache.set(cacheKey, data);
    return res.json(data);
  } catch (error) {
    return res.status(503).json({
      error: 'Unable to fetch monitor details',
      message: error.message,
    });
  }
});

module.exports = router;
