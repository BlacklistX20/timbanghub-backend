const { rateLimit } = require('express-rate-limit');

/**
 * Rate limiter khusus endpoint login - mencegah brute-force menebak password.
 *
 * skipSuccessfulRequests: true -> yang dihitung terhadap kuota HANYA percobaan
 * yang GAGAL (salah username/password). User yang berhasil login tidak pernah
 * ikut mengurangi jatah, jadi tidak mengganggu pemakaian normal.
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // jendela waktu 15 menit
  limit: 5, // maksimal 5 percobaan GAGAL per IP dalam jendela waktu di atas
  standardHeaders: 'draft-8', // kirim header RateLimit standar ke client
  legacyHeaders: false, // matikan header X-RateLimit-* versi lama
  skipSuccessfulRequests: true,
  ipv6Subnet: 56,
  message: { message: 'Terlalu banyak percobaan login gagal. Coba lagi dalam 15 menit.' },
});

module.exports = { loginLimiter };