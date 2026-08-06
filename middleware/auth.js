const jwt = require('jsonwebtoken');

/**
 * Middleware verifikasi JWT, dengan pembatasan role opsional.
 *
 * Penggunaan:
 *   requireAuth()                          -> wajib login, role apa saja
 *   requireAuth(['admin', 'dev'])          -> wajib login DAN salah satu role tsb
 *   requireAuth(['operator', 'admin', 'dev']) -> operator ke atas
 */
const requireAuth = (allowedRoles = null) => {
  return (req, res, next) => {
    const token = req.header('Authorization');
    if (!token) {
      return res.status(401).json({ message: 'Akses ditolak. Token tidak ditemukan.' });
    }

    try {
      const tokenClean = token.startsWith('Bearer ') ? token.slice(7) : token;
      const decoded = jwt.verify(tokenClean, process.env.JWT_SECRET);

      if (allowedRoles && !allowedRoles.includes(decoded.role)) {
        return res.status(403).json({ message: `Akses ditolak. Hanya role ${allowedRoles.join('/')} yang diizinkan!` });
      }

      req.user = decoded;
      next();
    } catch (err) {
      res.status(401).json({ message: 'Sesi tidak valid atau telah kedaluwarsa. Silakan login ulang.' });
    }
  };
};

module.exports = { requireAuth };