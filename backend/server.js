require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { sequelize } = require('./models');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/api/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/classes', require('./routes/classes'));
app.use('/api', require('./routes/students'));
app.use('/api', require('./routes/rules'));
app.use('/api/rooms', require('./routes/rooms'));
app.use('/api', require('./routes/seats'));
app.use('/api/generator', require('./routes/generator'));
app.use('/api/settings', require('./routes/settings'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Production: Frontend static files servieren
const frontendPath = path.join(__dirname, 'public');
app.use(express.static(frontendPath));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// Start server
async function start() {
  try {
    await sequelize.authenticate();
    console.log('Datenbank verbunden.');
    await sequelize.sync({ alter: false });
    console.log('Models synchronisiert.');
  } catch (err) {
    console.error('Datenbank-Fehler:', err.message);
    console.log('Server startet trotzdem – bitte Datenbankverbindung prüfen.');
  }
  app.listen(PORT, () => {
    console.log(`Backend läuft auf http://localhost:${PORT}`);
  });
}

start();
