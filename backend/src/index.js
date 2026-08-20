const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const NodeCache = require('node-cache');

const statusRoutes = require('./routes/status');
const healthRoutes = require('./routes/health');
const configRoutes = require('./routes/config');
const sitesRoutes = require('./routes/sites');
const dhcpRoutes = require('./routes/dhcp');

const app = express();
const PORT = process.env.PORT || 4000;
const CACHE_TTL = parseInt(process.env.CACHE_TTL, 10) || 30;

const cache = new NodeCache({ stdTTL: CACHE_TTL, checkperiod: 10 });

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost'],
  methods: ['GET'],
}));

app.use(compression());

const limiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' },
});
app.use(limiter);

app.use((req, res, next) => {
  req.cache = cache;
  next();
});

app.use('/status', statusRoutes);
app.use('/health', healthRoutes);
app.use('/config', configRoutes);
app.use('/sites', sitesRoutes);
app.use('/dhcp', dhcpRoutes);

app.get('/', (req, res) => {
  res.json({
    name: 'EduNetGuard API',
    version: '0.2.0',
    status: 'operational',
    monitoring: {
      engine: 'Uptime Kuma',
      status_page_slug: process.env.UPTIME_KUMA_STATUS_PAGE || 'edunetguard',
    },
    endpoints: {
      status: '/status',
      health: '/health',
      config: '/config',
      sites: '/sites',
      dhcp: '/dhcp',
    },
  });
});

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 EduNetGuard API v0.2.0 running on port ${PORT}`);
  console.log(`📊 Cache TTL: ${CACHE_TTL}s`);
  console.log(`🛡️ Uptime Kuma status page: ${process.env.UPTIME_KUMA_STATUS_PAGE || 'edunetguard'}`);
});
