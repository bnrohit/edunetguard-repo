const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const SITES_PATH = path.join(__dirname, '../../data/sites.sample.json');

router.get('/', (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(SITES_PATH, 'utf8'));
    res.json({ ...data, demo_mode: true, timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ error: 'Unable to load sites data', message: error.message });
  }
});

module.exports = router;
