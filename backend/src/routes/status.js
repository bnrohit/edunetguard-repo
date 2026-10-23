const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const { enrichService } = require('../services/network-advisor');

const MONITORING_URL = process.env.UPTIME_KUMA_URL || 'http://uptime-kuma:3001';
const STATUS_PAGE_SLUG = process.env.UPTIME_KUMA_STATUS_PAGE || 'edunetguard';
const ALLOW_DEMO_FALLBACK = process.env.ALLOW_DEMO_FALLBACK !== 'false';
const DEMO_STATUS_PATH = path.join(__dirname, '../../data/demo_status.json');

function loadDemoStatus() {
  const raw = fs.readFileSync(DEMO_STATUS_PATH, 'utf8');
  const data = JSON.parse(raw);
  data.timestamp = new Date().toISOString();
  data.services = data.services.map((service) => enrichService({
    ...service,
    last_check: new Date().toISOString(),
  }));
  data.demo_mode = true;
  data.source = {
    engine: 'EduNetGuard Demo Telemetry',
    connected: false,
    status_page_slug: STATUS_PAGE_SLUG,
  };
  data.summary = buildSummary(data.services);
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

function buildSummary(services = []) {
  const counts = {
    total: services.length,
    operational: 0,
    down: 0,
    pending: 0,
    maintenance: 0,
    attention: 0,
  };

  let responseTotal = 0;
  let responseCount = 0;
  let slowest = null;
  let latestCheck = null;

  for (const service of services) {
    if (service.status === 'up') counts.operational += 1;
    if (service.status === 'down') counts.down += 1;
    if (service.status === 'pending') counts.pending += 1;
    if (service.status === 'maintenance') counts.maintenance += 1;
    if (service.status === 'down' || service.status === 'pending') counts.attention += 1;

    const response = Number(service.response_time_ms);
    if (Number.isFinite(response)) {
      responseTotal += response;
      responseCount += 1;
      if (!slowest || response > slowest.response_time_ms) {
        slowest = {
          id: service.id,
          name: service.name,
          response_time_ms: Math.round(response),
        };
      }
    }

    if (service.last_check) {
      const checkTime = Date.parse(service.last_check);
      if (Number.isFinite(checkTime) && (!latestCheck || checkTime > latestCheck)) {
        latestCheck = checkTime;
      }
    }
  }

  return {
    ...counts,
    availability_health_score: counts.total
      ? Math.round(((counts.operational + counts.maintenance) / counts.total) * 100)
      : 0,
    average_response_ms: responseCount
      ? Math.round((responseTotal / responseCount) * 10) / 10
      : null,
    slowest_service: slowest,
    latest_check: latestCheck ? new Date(latestCheck).toISOString() : null,
  };
}

function transformMonitoringStatus(pageData, heartbeatData) {
  const heartbeatList = heartbeatData?.heartbeatList || {};
  const uptimeList = heartbeatData?.uptimeList || {};

  const transformed = {
    timestamp: new Date().toISOString(),
    overall: { status: 'operational', uptime_percentage: 100 },
    services: [],
    incident: pageData?.incident || null,
    demo_mode: false,
    source: {
      engine: 'EduNetGuard Monitoring Engine',
      connected: true,
      status_page_slug: STATUS_PAGE_SLUG,
      status_page_title: pageData?.config?.title || null,
    },
  };

  for (const group of pageData?.publicGroupList || []) {
    for (const monitor of group.monitorList || []) {
      const monitorId = String(monitor.id);
      const heartbeat = latestHeartbeat(heartbeatList[monitorId] || heartbeatList[monitor.id] || []);
      const uptime = normalizeUptime(
        uptimeList[monitorId + '_24'] ??
        uptimeList[String(monitor.id) + '_24'] ??
        monitor.uptime
      );

      transformed.services.push(enrichService({
        id: monitor.id,
        name: monitor.name,
        status: normalizeMonitorStatus(heartbeat?.status ?? monitor.status),
        uptime: uptime ?? 100,
        last_check: heartbeat?.time ? new Date(heartbeat.time).toISOString() : null,
        response_time_ms: Number.isFinite(Number(heartbeat?.ping)) ? Number(heartbeat.ping) : null,
        message: heartbeat?.msg || null,
        group: group.name || 'Infrastructure Services',
        type: monitor.type || null,
      }));
    }
  }

  const total = transformed.services.length;
  const downCount = transformed.services.filter((service) => service.status === 'down').length;
  const pendingCount = transformed.services.filter((service) => service.status === 'pending').length;

  if (total === 0) {
    transformed.overall.status = 'unknown';
    transformed.overall.uptime_percentage = 0;
    transformed.summary = buildSummary(transformed.services);
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

  transformed.summary = buildSummary(transformed.services);
  return transformed;
}

async function fetchMonitoringStatus() {
  const slug = encodeURIComponent(STATUS_PAGE_SLUG);
  const [pageResponse, heartbeatResponse] = await Promise.all([
    axios.get(MONITORING_URL + '/api/status-page/' + slug, {
      timeout: 10000,
      headers: { Accept: 'application/json' },
    }),
    axios.get(MONITORING_URL + '/api/status-page/heartbeat/' + slug, {
      timeout: 10000,
      headers: { Accept: 'application/json' },
    }),
  ]);

  return transformMonitoringStatus(pageResponse.data, heartbeatResponse.data);
}

router.get('/', async (req, res) => {
  const cacheKey = 'monitors_status';
  const cached = req.cache.get(cacheKey);
  if (cached) return res.json(cached);

  try {
    const transformed = await fetchMonitoringStatus();
    req.cache.set(cacheKey, transformed);
    return res.json(transformed);
  } catch (error) {
    console.warn('Monitoring status page unavailable:', error.message);

    if (ALLOW_DEMO_FALLBACK) {
      const demo = loadDemoStatus();
      demo.warning = 'Live monitoring is unavailable. Demo telemetry is clearly marked and must not be treated as operational data.';
      req.cache.set(cacheKey, demo, 10);
      return res.json(demo);
    }

    return res.status(503).json({
      error: 'Unable to fetch live monitoring telemetry',
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const cacheKey = 'monitor_' + id;
    const cached = req.cache.get(cacheKey);
    if (cached) return res.json(cached);

    const status = await fetchMonitoringStatus();
    const monitor = status.services.find((service) => String(service.id) === String(id));

    if (!monitor) {
      return res.status(404).json({
        error: 'Monitor not found on the configured operations status page',
        id,
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
