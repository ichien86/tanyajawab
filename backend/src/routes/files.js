const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { authenticateAdmin } = require('../middleware/auth');
const { UPLOAD_DIR } = require('../middleware/upload');

/**
 * GET /api/files/:filename
 * Endpoint pengunduhan berkas terisolasi bertanda tangan token admin (TDD v2.0 Sec 5)
 */
router.get('/:filename', authenticateAdmin, (req, res) => {
  const { filename } = req.params;

  // Sanitasi nama berkas untuk mencegah directory traversal attack
  const safeFilename = path.basename(filename);
  const filePath = path.join(UPLOAD_DIR, safeFilename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({
      success: false,
      message: 'Berkas tidak ditemukan atau telah dihapus.'
    });
  }

  res.sendFile(filePath);
});

module.exports = router;

