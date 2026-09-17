require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDatabase, getDbMode } = require('./config/database');
const { runSeed } = require('./seeds/seed');

const eventsRoute = require('./routes/events');
const qnaRoute = require('./routes/qna');
const adminRoute = require('./routes/admin');
const filesRoute = require('./routes/files');

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-token']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging sederhana
app.use((req, res, next) => {
  if (req.path !== '/api/events') {
    console.log(`[${new Date().toISOString().substring(11, 19)}] ${req.method} ${req.path}`);
  }
  next();
});

// API Routes (Fokus pada Tanya Jawab & Admin)
app.use('/api/events', eventsRoute.router);
app.use('/api/qna', qnaRoute);
app.use('/api/admin', adminRoute);
app.use('/api/files', filesRoute);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'Forum Tanya Jawab & Kuesioner Dinamis',
    dbMode: getDbMode(),
    activeClients: eventsRoute.getActiveClientsCount(),
    timestamp: new Date().toISOString()
  });
});

// Serve frontend dist jika sudah di-build
const FRONTEND_DIST = path.join(__dirname, '../../frontend/dist');
const fs = require('fs');
if (fs.existsSync(FRONTEND_DIST)) {
  app.use(express.static(FRONTEND_DIST));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
    }
  });
}

async function startServer() {
  await initDatabase();
  await runSeed();

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`====================================================`);
    console.log(`🚀 Forum Tanya Jawab Interaktif Aktif!`);
    console.log(`📍 URL Layar Peserta : http://localhost:${PORT}`);
    console.log(`📡 SSE Stream        : http://localhost:${PORT}/api/events`);
    console.log(`🛡️ Portal Admin      : http://localhost:${PORT}/admin`);
    console.log(`🗄️ Mode Database     : ${getDbMode().toUpperCase()}`);
    console.log(`====================================================`);
  });

  return server;
}

if (require.main === module) {
  startServer().catch((err) => {
    console.error('Fatal error starting server:', err);
    process.exit(1);
  });
}

module.exports = { app, startServer };
