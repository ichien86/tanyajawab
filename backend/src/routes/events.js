const express = require('express');
const router = express.Router();

let clients = [];

/**
 * Endpoint SSE: GET /api/events
 */
router.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Menonaktifkan buffering Nginx jika ada reverse proxy

  res.flushHeaders();

  const clientId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  const newClient = {
    id: clientId,
    res
  };

  clients.push(newClient);

  // Kirim event pembuka
  res.write(`event: connected\ndata: ${JSON.stringify({ clientId, timestamp: new Date().toISOString() })}\n\n`);

  // Handler saat koneksi ditutup klien
  req.on('close', () => {
    clients = clients.filter((c) => c.id !== clientId);
  });
});

/**
 * Broadcast event ke seluruh klien SSE aktif
 * @param {string} eventName
 * @param {Object} data
 */
function broadcastEvent(eventName, data) {
  const payload = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
  clients.forEach((client) => {
    try {
      client.res.write(payload);
    } catch (err) {
      console.error('Error saat broadcast SSE ke klien:', client.id, err.message);
    }
  });
}

// Keepalive interval setiap 20 detik
const keepaliveTimer = setInterval(() => {
  clients.forEach((client) => {
    try {
      client.res.write(': keepalive\n\n');
    } catch (_) {}
  });
}, 20000);
if (keepaliveTimer.unref) {
  keepaliveTimer.unref();
}

module.exports = {
  router,
  broadcastEvent,
  getActiveClientsCount: () => clients.length
};
