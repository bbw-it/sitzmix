const express = require('express');
const router = express.Router();
const { Sequelize } = require('sequelize');
const { Setting } = require('../models');

// Get all settings
router.get('/', async (req, res) => {
  try {
    const settings = await Setting.findAll();
    const result = {};
    settings.forEach(s => { result[s.setting_key] = s.setting_value; });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update settings
router.put('/', async (req, res) => {
  try {
    const { settings } = req.body;
    for (const [key, value] of Object.entries(settings)) {
      await Setting.upsert({ setting_key: key, setting_value: value });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Test database connection
router.post('/test-connection', async (req, res) => {
  const { host, port, user, password, database } = req.body;
  try {
    const testDb = new Sequelize(database, user, password, {
      host,
      port: parseInt(port, 10),
      dialect: 'mariadb',
      logging: false,
      dialectOptions: { connectTimeout: 5000 },
    });
    await testDb.authenticate();
    await testDb.close();
    res.json({ success: true, message: 'Verbindung erfolgreich!' });
  } catch (err) {
    res.json({ success: false, message: `Verbindung fehlgeschlagen: ${err.message}` });
  }
});

module.exports = router;
