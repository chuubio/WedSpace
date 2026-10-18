const jwt = require('jsonwebtoken');

function authWajib(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ pesan: 'Token tidak ditemukan. Silakan login dulu.' });
  }
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    return next();
  } catch (err) {
    return res.status(401).json({ pesan: 'Token tidak valid atau kedaluwarsa.' });
  }
}

function adminSaja(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ pesan: 'Hanya admin yang boleh mengakses.' });
  }
  return next();
}

module.exports = { authWajib, adminSaja };
