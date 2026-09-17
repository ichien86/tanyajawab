const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const UPLOAD_DIR = path.join(__dirname, '../../uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Konfigurasi penyimpanan disk multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const sessionId = req.body.session_id || 'session';
    const cleanSessionId = String(sessionId).replace(/[^a-zA-Z0-9_-]/g, '');
    const filename = `${cleanSessionId}_${uuidv4()}${ext}`;
    cb(null, filename);
  }
});

// Filter tipe file dasar berdasarkan ekstensi dan mimetype
const fileFilter = (req, file, cb) => {
  const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (!allowedExtensions.includes(ext)) {
    return cb(new Error('Format file tidak didukung. Hanya PDF, JPG, dan PNG yang diperbolehkan.'), false);
  }
  cb(null, true);
};

const upload = multer({
  storage,
  limits: {
    fileSize: 2 * 1024 * 1024 // 2 MB
  },
  fileFilter
});

/**
 * Validasi Magic-Bytes Server-Side (TDD v2.0 Sec 5)
 * PDF:  25 50 44 46 (%PDF)
 * JPEG: FF D8 FF
 * PNG:  89 50 4E 47 (\x89PNG)
 */
function verifyMagicBytes(filePath) {
  try {
    const buffer = Buffer.alloc(8);
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buffer, 0, 8, 0);
    fs.closeSync(fd);

    // Cek PDF: 0x25 0x50 0x44 0x46
    if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
      return { valid: true, type: 'pdf' };
    }

    // Cek JPEG: 0xFF 0xD8 0xFF
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return { valid: true, type: 'jpeg' };
    }

    // Cek PNG: 0x89 0x50 0x4E 0x47
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
      return { valid: true, type: 'png' };
    }

    return { valid: false, type: 'unknown' };
  } catch (err) {
    return { valid: false, error: err.message };
  }
}

/**
 * Middleware untuk mengecek magic bytes setelah upload Multer selesai
 */
function validateUploadedFile(req, res, next) {
  if (!req.file) {
    return next();
  }

  const result = verifyMagicBytes(req.file.path);
  if (!result.valid) {
    // Hapus file yang tidak lolos validasi magic bytes
    try {
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
    } catch (_) {}

    return res.status(400).json({
      success: false,
      message: 'Validasi keamanan gagal: Konten berkas tidak cocok dengan format berkas asli (Magic Bytes Mismatch). Berkas ditolak.'
    });
  }

  req.file.verifiedType = result.type;
  next();
}

module.exports = {
  upload,
  validateUploadedFile,
  verifyMagicBytes,
  UPLOAD_DIR
};

