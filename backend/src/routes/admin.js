const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { UserAdmin, Session, QnaThread } = require('../config/database');
const { adminLoginLimiter, getClientIp } = require('../middleware/rateLimiter');
const { authenticateAdmin, generateToken } = require('../middleware/auth');
const { broadcastEvent, getActiveClientsCount } = require('./events');

/**
 * POST /api/admin/login
 * Autentikasi Admin tersembunyi dengan proteksi brute-force & exponential lockout
 */
router.post('/login', adminLoginLimiter, async (req, res) => {
  try {
    const { username, password, passcode } = req.body;
    const targetPassword = password || passcode;
    const targetUsername = (username && username.trim()) || 'admin_utama';
    const ip = getClientIp(req);
    const userAgent = req.headers['user-agent'] || 'unknown';

    if (!targetPassword) {
      return res.status(400).json({ success: false, message: 'Kata sandi / passcode wajib diisi.' });
    }

    const admin = await UserAdmin.findOne({ username: targetUsername });

    if (!admin || !admin.is_active) {
      req.recordFailedLogin();
      return res.status(401).json({
        success: false,
        message: 'Kredensial atau passcode tidak cocok. Akses ditolak.'
      });
    }

    // Verifikasi password hash via bcrypt
    const isMatch = await bcrypt.compare(targetPassword, admin.password_hash);
    if (!isMatch) {
      req.recordFailedLogin();
      return res.status(401).json({
        success: false,
        message: 'Kredensial atau passcode tidak cocok. Akses ditolak.'
      });
    }

    // Login sukses: reset failed attempts
    req.resetLoginAttempts();

    const logEntry = {
      action: 'LOGIN_SUCCESS',
      ip,
      user_agent: userAgent,
      timestamp: new Date()
    };

    await UserAdmin.findByIdAndUpdate(admin._id, {
      $set: { last_login: new Date() },
      $push: { security_logs: logEntry }
    });

    const token = generateToken({
      id: admin._id,
      username: admin.username,
      role: admin.role
    });

    res.json({
      success: true,
      message: 'Login berhasil.',
      token,
      admin: {
        username: admin.username,
        role: admin.role
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Terjadi kesalahan sistem saat login: ' + err.message });
  }
});

/**
 * GET /api/admin/me
 * Cek sesi admin aktif
 */
router.get('/me', authenticateAdmin, async (req, res) => {
  try {
    const admin = await UserAdmin.findById(req.admin.id);
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Pengguna admin tidak ditemukan.' });
    }

    res.json({
      success: true,
      admin: {
        username: admin.username,
        role: admin.role,
        last_login: admin.last_login
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * PUT /api/admin/change-password
 * Mengubah kata sandi / passcode admin yang sedang aktif
 */
router.put('/change-password', authenticateAdmin, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    const ip = getClientIp(req);
    const userAgent = req.headers['user-agent'] || 'unknown';

    if (!current_password || !new_password) {
      return res.status(400).json({ success: false, message: 'Kata sandi saat ini dan kata sandi baru wajib diisi.' });
    }

    if (new_password.length < 6) {
      return res.status(400).json({ success: false, message: 'Kata sandi / passcode baru minimal 6 karakter.' });
    }

    const admin = await UserAdmin.findById(req.admin.id);
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Akun admin tidak ditemukan.' });
    }

    const isMatch = await bcrypt.compare(current_password, admin.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Kata sandi saat ini tidak sesuai.' });
    }

    const salt = await bcrypt.genSalt(12);
    const newHash = await bcrypt.hash(new_password, salt);

    const logEntry = {
      action: 'PASSWORD_CHANGED',
      ip,
      user_agent: userAgent,
      timestamp: new Date()
    };

    await UserAdmin.findByIdAndUpdate(admin._id, {
      $set: { password_hash: newHash },
      $push: { security_logs: logEntry }
    });

    res.json({
      success: true,
      message: 'Kata sandi / passcode admin berhasil diperbarui!'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal mengubah kata sandi: ' + err.message });
  }
});

/**
 * GET /api/admin/stats
 * Mengambil ringkasan statistik sesi Tanya Jawab untuk Dashboard Admin
 */
router.get('/stats', authenticateAdmin, async (req, res) => {
  try {
    const sessionId = req.query.session_id || 'default_session';
    const questions = await QnaThread.find({ session_id: sessionId });

    const totalQuestions = questions.length;
    const answeredQuestions = questions.filter((q) => q.status === 'answered' || (q.answers && q.answers.length > 0)).length;
    const totalUpvotes = questions.reduce((acc, q) => acc + (q.upvotes?.length || 0), 0);
    const totalAnswers = questions.reduce((acc, q) => acc + (q.answers?.length || 0), 0);
    const structuredQuestionsCount = questions.filter((q) => q.question?.response_type === 'structured').length;
    const activeClients = getActiveClientsCount();

    res.json({
      success: true,
      data: {
        totalQuestions,
        answeredQuestions,
        totalUpvotes,
        totalAnswers,
        structuredQuestionsCount,
        activeClients
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal memuat statistik: ' + err.message });
  }
});

/**
 * GET /api/admin/session
 * Mengambil data konfigurasi sesi
 */
router.get('/session', async (req, res) => {
  try {
    const sessionId = req.query.session_id || 'default_session';
    const session = await Session.findOne({ session_id: sessionId });

    res.json({
      success: true,
      data: session
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * PUT /api/admin/session
 * Memperbarui konfigurasi sesi sosialisasi
 */
router.put('/session', authenticateAdmin, async (req, res) => {
  try {
    const { session_id = 'default_session', title, description, is_active, session_code } = req.body;

    const updated = await Session.findOneAndUpdate(
      { session_id },
      {
        $set: {
          title: title || 'Sesi Tanya Jawab Interaktif',
          description: description || '',
          is_active: is_active !== undefined ? Boolean(is_active) : true,
          session_code: session_code || 'SOS-2026'
        }
      },
      { upsert: true, new: true }
    );

    broadcastEvent('session_update', {
      action: 'session_modified',
      session: updated
    });

    res.json({
      success: true,
      message: 'Pengaturan sesi berhasil diperbarui.',
      data: updated
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal memperbarui sesi: ' + err.message });
  }
});

module.exports = router;
