const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const DHCP_PATH = path.join(__dirname, '../../data/dhcp_scopes.sample.json');

router.get('/', (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(DHCP_PATH, 'utf8'));
    const scopes = data.scopes.map((scope) => ({
      ...scope,
      severity: scope.percentUsed >= 90 ? 'critical' : scope.percentUsed >= 80 ? 'warning' : 'normal',
    }));
    res.json({ scopes, demo_mode: true, timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ error: 'Unable to load DHCP data', message: error.message });
  }
});

module.exports = router;
