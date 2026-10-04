const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { OAuth2Client } = require('google-auth-library');
const { UserAdmin, Session, QnaThread } = require('../config/database');
const { adminLoginLimiter, getClientIp } = require('../middleware/rateLimiter');
const { authenticateAdmin, generateToken, isSuperAdmin, canManageSession } = require('../middleware/auth');
const { broadcastEvent, getActiveClientsCount } = require('./events');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID || '');

/**
 * GET /api/admin/auth-config
 * Mengembalikan konfigurasi Google Client ID ke frontend
 */
router.get('/auth-config', (req, res) => {
  res.json({
    success: true,
    google_client_id: process.env.GOOGLE_CLIENT_ID || '758955649265-10dc6jv0g605jvcadojho2i0d7miuln2.apps.googleusercontent.com',
    allow_password_fallback: false
  });
});

/**
 * POST /api/admin/google-login
 * Autentikasi Admin via Akun Google / Gmail (Google Identity Services)
 */
router.post('/google-login', adminLoginLimiter, async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ success: false, message: 'Kredensial token Google tidak ditemukan.' });
    }

    let payload;
    const clientId = process.env.GOOGLE_CLIENT_ID;

    // Verifikasi token Google
    if (process.env.NODE_ENV === 'test' && typeof credential === 'string' && credential.startsWith('test:')) {
      const parts = credential.split(':');
      payload = { email: parts[1], name: parts[2] || parts[1].split('@')[0] };
    } else if (clientId) {
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: clientId
      });
      payload = ticket.getPayload();
    } else {
      // Jika Google Client ID belum disetel, decode JWT payload (mode dev/setup)
      const jwt = require('jsonwebtoken');
      payload = jwt.decode(credential);
    }

    if (!payload || !payload.email) {
      return res.status(401).json({ success: false, message: 'Token Google tidak valid atau email tidak terbaca.' });
    }

    const email = payload.email.toLowerCase().trim();
    const name = payload.name || email.split('@')[0];
    const picture = payload.picture || '';
    const googleId = payload.sub || '';

    // Cek peran (superadmin vs administrator)
    const role = isSuperAdmin({ email }) ? 'superadmin' : 'administrator';

    // Cari atau buat pengguna di UserAdmin
    let admin = await UserAdmin.findOne({ email });
    if (!admin) {
      admin = await UserAdmin.create({
        username: email.split('@')[0],
        email,
        name,
        picture,
        google_id: googleId,
        role,
        is_active: true,
        last_login: new Date()
      });
    } else {
      await UserAdmin.findByIdAndUpdate(admin._id, {
        $set: {
          name,
          picture,
          google_id: googleId,
          role: isSuperAdmin({ email }) ? 'superadmin' : admin.role,
          last_login: new Date()
        }
      });
      admin.name = name;
      admin.picture = picture;
      admin.role = isSuperAdmin({ email }) ? 'superadmin' : admin.role;
    }

    req.resetLoginAttempts();

    const token = generateToken({
      id: admin._id,
      email: admin.email,
      username: admin.username,
      name: admin.name || admin.username,
      picture: admin.picture || '',
      role: admin.role
    });

    res.json({
      success: true,
      message: 'Login Google berhasil.',
      token,
      admin: {
        id: admin._id,
        email: admin.email,
        username: admin.username,
        name: admin.name,
        picture: admin.picture,
        role: admin.role
      }
    });
  } catch (err) {
    console.error('[Auth] Error verifikasi Google login:', err);
    res.status(401).json({ success: false, message: 'Gagal memverifikasi akun Google: ' + err.message });
  }
});

/**
 * POST /api/admin/login
 * Autentikasi Admin Darurat / Fallback Passcode
 */
router.post('/login', adminLoginLimiter, async (req, res) => {
  if (process.env.NODE_ENV !== 'test') {
    return res.status(403).json({
      success: false,
      message: 'Login dengan passcode darurat telah dinonaktifkan. Silakan gunakan Google Sign-In.'
    });
  }
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

    if (!admin || !admin.is_active || !admin.password_hash) {
      req.recordFailedLogin();
      return res.status(401).json({
        success: false,
        message: 'Kredensial atau passcode tidak cocok. Akses ditolak.'
      });
    }

    const isMatch = await bcrypt.compare(targetPassword, admin.password_hash);
    if (!isMatch) {
      req.recordFailedLogin();
      return res.status(401).json({
        success: false,
        message: 'Kredensial atau passcode tidak cocok. Akses ditolak.'
      });
    }

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
      email: admin.email || null,
      username: admin.username,
      name: admin.name || admin.username,
      picture: admin.picture || '',
      role: admin.role
    });

    res.json({
      success: true,
      message: 'Login berhasil.',
      token,
      admin: {
        id: admin._id,
        email: admin.email,
        username: admin.username,
        name: admin.name || admin.username,
        picture: admin.picture,
        role: admin.role
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Terjadi kesalahan sistem saat login: ' + err.message });
  }
});

/**
 * GET /api/admin/me
 * Cek sesi admin aktif & profil akun
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
        id: admin._id,
        username: admin.username,
        email: admin.email,
        name: admin.name || admin.username,
        picture: admin.picture,
        role: isSuperAdmin(admin) ? 'superadmin' : admin.role,
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

    if (admin.password_hash) {
      const isMatch = await bcrypt.compare(current_password, admin.password_hash);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Kata sandi saat ini tidak sesuai.' });
      }
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
 * GET /api/admin/sessions
 * Mengambil daftar sesi milik admin yang sedang login (atau seluruh sesi jika superadmin)
 */
router.get('/sessions', authenticateAdmin, async (req, res) => {
  try {
    let filter = {};
    if (!isSuperAdmin(req.admin)) {
      // User yang login berikutnya bukan superadmin, tapi hanya admin sesi saja
      filter = {
        owner_email: (req.admin.email || '').toLowerCase()
      };
    }

    const sessions = await Session.find(filter);

    const enriched = await Promise.all(
      sessions.map(async (s) => {
        const questions = await QnaThread.find({ session_id: s.session_id });
        const totalQuestions = questions.length;
        const totalAnswers = questions.reduce((acc, q) => acc + (q.answers?.length || 0), 0);
        const answeredQuestions = questions.filter((q) => q.status === 'answered' || (q.answers && q.answers.length > 0)).length;
        return {
          ...(s.toObject ? s.toObject() : s),
          totalQuestions,
          totalAnswers,
          answeredQuestions
        };
      })
    );

    res.json({
      success: true,
      data: enriched
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal memuat daftar sesi: ' + err.message });
  }
});

/**
 * POST /api/admin/sessions
 * Membuat sesi forum baru
 */
router.post('/sessions', authenticateAdmin, async (req, res) => {
  try {
    const { title, description, session_code, is_active } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Judul sesi wajib diisi.' });
    }

    const cleanTitle = title.trim();
    const cleanSlug = cleanTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '')
      .substring(0, 30);
    const uniqueSessionId = `${cleanSlug || 'sesi'}-${Date.now().toString(36)}`;

    let cleanCode = (session_code && session_code.trim().toUpperCase()) || '';
    if (!cleanCode) {
      cleanCode = 'SESI-' + Math.floor(1000 + Math.random() * 9000);
    }

    const existingCode = await Session.findOne({ session_code: cleanCode });
    if (existingCode) {
      return res.status(400).json({ success: false, message: `Kode sesi "${cleanCode}" sudah digunakan. Silakan gunakan kode lain.` });
    }

    const newSession = await Session.create({
      session_id: uniqueSessionId,
      session_code: cleanCode,
      title: cleanTitle,
      description: (description || '').trim(),
      owner_email: req.admin.email || 'admin@tanyajawab.local',
      owner_name: req.admin.name || req.admin.username || 'Admin',
      is_active: is_active !== undefined ? Boolean(is_active) : true,
      initial_seeded: false
    });

    broadcastEvent('session_update', {
      action: 'session_created',
      session: newSession
    });

    res.status(201).json({
      success: true,
      message: 'Sesi baru berhasil dibuat.',
      data: newSession
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal membuat sesi: ' + err.message });
  }
});

/**
 * GET /api/admin/sessions/:sessionId
 * Detail satu sesi spesifik
 */
router.get('/sessions/:sessionId', authenticateAdmin, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await Session.findOne({ session_id: sessionId });

    if (!session) {
      return res.status(404).json({ success: false, message: 'Sesi tidak ditemukan.' });
    }

    if (!canManageSession(req.admin, session)) {
      return res.status(403).json({ success: false, message: 'Anda tidak memiliki izin mengelola sesi ini.' });
    }

    res.json({
      success: true,
      data: session
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * PUT /api/admin/sessions/:sessionId
 * Memperbarui data konfigurasi sesi tertentu
 */
router.put('/sessions/:sessionId', authenticateAdmin, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { title, description, session_code, is_active } = req.body;

    const session = await Session.findOne({ session_id: sessionId });
    if (!session) {
      return res.status(404).json({ success: false, message: 'Sesi tidak ditemukan.' });
    }

    if (!canManageSession(req.admin, session)) {
      return res.status(403).json({ success: false, message: 'Anda tidak memiliki hak untuk mengubah sesi ini.' });
    }

    const updateFields = {};
    if (title !== undefined) updateFields.title = title.trim();
    if (description !== undefined) updateFields.description = description.trim();
    if (is_active !== undefined) updateFields.is_active = Boolean(is_active);
    if (session_code !== undefined) {
      const code = session_code.trim().toUpperCase();
      const existing = await Session.findOne({ session_code: code });
      if (existing && existing.session_id !== sessionId) {
        return res.status(400).json({ success: false, message: `Kode sesi "${code}" sudah digunakan oleh sesi lain.` });
      }
      updateFields.session_code = code;
    }

    const updated = await Session.findOneAndUpdate(
      { session_id: sessionId },
      { $set: updateFields },
      { new: true }
    );

    broadcastEvent('session_update', {
      action: 'session_modified',
      session: updated
    });

    res.json({
      success: true,
      message: 'Sesi berhasil diperbarui.',
      data: updated
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal memperbarui sesi: ' + err.message });
  }
});

/**
 * DELETE /api/admin/sessions/:sessionId
 * Menghapus sesi beserta seluruh pertanyaan dan berkas lampirannya
 */
router.delete('/sessions/:sessionId', authenticateAdmin, async (req, res) => {
  try {
    const { sessionId } = req.params;
    if (sessionId === 'default_session') {
      return res.status(400).json({ success: false, message: 'Sesi default sistem tidak dapat dihapus.' });
    }

    const session = await Session.findOne({ session_id: sessionId });
    if (!session) {
      return res.status(404).json({ success: false, message: 'Sesi tidak ditemukan.' });
    }

    if (!canManageSession(req.admin, session)) {
      return res.status(403).json({ success: false, message: 'Anda tidak memiliki hak untuk menghapus sesi ini.' });
    }

    // Bersihkan seluruh berkas fisik dari pertanyaan sesi ini
    const questions = await QnaThread.find({ session_id: sessionId });
    const { cleanupAnswerFiles } = require('./qna');
    if (typeof cleanupAnswerFiles === 'function') {
      for (const q of questions) {
        cleanupAnswerFiles(q.answers);
      }
    }

    await QnaThread.deleteMany({ session_id: sessionId });
    await Session.findOneAndDelete({ session_id: sessionId });

    broadcastEvent('session_update', {
      action: 'session_deleted',
      sessionId
    });

    res.json({
      success: true,
      message: 'Sesi dan seluruh data terkait berhasil dihapus permanen.'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Gagal menghapus sesi: ' + err.message });
  }
});

/**
 * GET /api/admin/session
 * Mengambil data sesi aktif (Mendukung lookup by session_id atau session_code)
 */
router.get('/session', async (req, res) => {
  try {
    const lookup = req.query.session_id || req.query.s || req.query.code || 'pokir_2028';

    let session = await Session.findOne({ session_id: lookup });
    if (!session) {
      session = await Session.findOne({ session_code: lookup });
    }
    if (!session) {
      session = await Session.findOne({ session_code: lookup.toUpperCase() });
    }
    if (!session) {
      session = await Session.findOne({ session_code: lookup.toLowerCase() });
    }
    // Kompatibilitas mundur jika mencari default_session
    if (!session && (lookup === 'default_session' || lookup === 'SOS-2026')) {
      session = await Session.findOne({ session_id: 'pokir_2028' });
    }

    if (!session) {
      return res.status(404).json({
        success: false,
        message: `Sesi "${lookup}" tidak ditemukan.`
      });
    }

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
 * Memperbarui konfigurasi sesi (kompatibilitas route lama)
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
