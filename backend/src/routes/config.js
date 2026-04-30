const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const CONFIG_PATH = path.join(__dirname, '../../config/school.json');

// Default configuration
const defaultConfig = {
  school: {
    name: 'Your School Name',
    logo: null,
    timezone: 'UTC',
    contactEmail: 'tech@school.edu',
  },
  theme: {
    primaryColor: '#2563eb',
    darkMode: false,
  },
  display: {
    showIncidentHistory: true,
    refreshInterval: 30,
    showUptimePercentage: true,
  },
  categories: [
    { id: 'internet', name: 'Internet & Connectivity', icon: 'wifi' },
    { id: 'internal', name: 'Internal Services', icon: 'server' },
    { id: 'learning', name: 'Learning Management', icon: 'book' },
    { id: 'facilities', name: 'Facilities', icon: 'building' },
  ],
};

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const fileConfig = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
      return { ...defaultConfig, ...fileConfig };
    }
  } catch (error) {
    console.error('Error loading config:', error.message);
  }
  return defaultConfig;
}

router.get('/', (req, res) => {
  const config = loadConfig();
  res.json(config);
});

module.exports = router;
