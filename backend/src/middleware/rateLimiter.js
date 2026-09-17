/**
 * Proteksi Brute-Force & Progressive Lockout untuk Login Admin
 * Sesuai Spesifikasi TDD v2.0 Sec 4:
 * - Maksimal 5 kali percobaan gagal per IP dalam 15 menit.
 * - Lockout progresif (exponential backoff: 30 detik -> 5 menit -> 15 menit).
 */

const attemptsMap = new Map(); // ip -> { failedCount, lockUntil, lockoutLevel }

function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0].trim() ||
         req.connection?.remoteAddress ||
         req.socket?.remoteAddress ||
         '127.0.0.1';
}

function adminLoginLimiter(req, res, next) {
  const ip = getClientIp(req);
  const now = Date.now();
  const record = attemptsMap.get(ip) || { failedCount: 0, lockUntil: 0, lockoutLevel: 0 };

  if (record.lockUntil > now) {
    const remainingSecs = Math.ceil((record.lockUntil - now) / 1000);
    return res.status(429).json({
      success: false,
      message: `Terlalu banyak percobaan login gagal. Akses dikunci sementara selama ${remainingSecs} detik. Silakan coba lagi nanti.`,
      lockoutRemaining: remainingSecs
    });
  }

  // Tempelkan helper recordFailedLogin ke request
  req.recordFailedLogin = () => {
    const rec = attemptsMap.get(ip) || { failedCount: 0, lockUntil: 0, lockoutLevel: 0 };
    rec.failedCount += 1;

    if (rec.failedCount >= 5) {
      rec.lockoutLevel += 1;
      let lockDurationMs = 30 * 1000; // Tingkat 1: 30 detik

      if (rec.lockoutLevel === 2) {
        lockDurationMs = 5 * 60 * 1000; // Tingkat 2: 5 menit
      } else if (rec.lockoutLevel >= 3) {
        lockDurationMs = 15 * 60 * 1000; // Tingkat 3: 15 menit
      }

      rec.lockUntil = Date.now() + lockDurationMs;
      rec.failedCount = 0; // Reset hitungan gagal setelah terkunci
    }

    attemptsMap.set(ip, rec);
  };

  req.resetLoginAttempts = () => {
    attemptsMap.delete(ip);
  };

  next();
}

module.exports = {
  adminLoginLimiter,
  getClientIp
};

