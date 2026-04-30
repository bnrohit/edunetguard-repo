const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const NodeCache = require('node-cache');
const path = require('path');

const statusRoutes = require('./routes/status');
const healthRoutes = require('./routes/health');
const configRoutes = require('./routes/config');

const app = express();
const PORT = process.env.PORT || 4000;
const CACHE_TTL = parseInt(process.env.CACHE_TTL) || 30;

// Initialize cache
const cache = new NodeCache({ stdTTL: CACHE_TTL, checkperiod: 10 });

// Security middleware
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

// Rate limiting
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests, please try again later.' },
});
app.use(limiter);

// Attach cache to requests
app.use((req, res, next) => {
  req.cache = cache;
  next();
});

// Routes
app.use('/status', statusRoutes);
app.use('/health', healthRoutes);
app.use('/config', configRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'EduNetGuard API',
    version: '1.0.0',
    status: 'operational',
    endpoints: {
      status: '/status',
      health: '/health',
      config: '/config',
    },
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 EduNetGuard API running on port ${PORT}`);
  console.log(`📊 Cache TTL: ${CACHE_TTL}s`);
});
