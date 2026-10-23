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
const { router: authRoutes } = require('./routes/auth');
const userMonitorRoutes = require('./routes/user-monitors');
const { startScheduler } = require('./monitoring/user-monitor-runner');

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
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
}));

app.use(compression());
app.use(express.json({ limit: '32kb' }));

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
app.use('/auth', authRoutes);
app.use('/user-monitors', userMonitorRoutes);

app.get('/', (req, res) => {
  res.json({
    name: 'EduNetGuard API',
    version: '0.6.0',
    status: 'operational',
    monitoring: {
      engine: 'EduNetGuard Monitoring Engine',
      status_page_slug: process.env.UPTIME_KUMA_STATUS_PAGE || 'edunetguard',
    },
    endpoints: {
      status: '/status',
      health: '/health',
      config: '/config',
      sites: '/sites',
      dhcp: '/dhcp',
      auth: '/auth',
      userMonitors: '/user-monitors',
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
  startScheduler();
  console.log(`EduNetGuard API v0.6.0 running on port ${PORT}`);
  console.log(`Cache TTL: ${CACHE_TTL}s`);
  console.log(`Monitoring status page: ${process.env.UPTIME_KUMA_STATUS_PAGE || 'edunetguard'}`);
});
