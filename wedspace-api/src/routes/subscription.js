const express = require('express');
const { z } = require('zod');
const { authWajib } = require('../middleware/auth');
const {
  ringkasLangganan,
  aktifkanPremium,
  batalkanPremium,
} = require('../services/subscription');
const { DURASI_PREMIUM_HARI, PAKET } = require('../config/subscription');

const router = express.Router();

function hanyaPengembangan(req, res, next) {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({
      pesan: 'Endpoint simulasi langganan tidak tersedia di mode produksi.',
    });
  }
  return next();
}

router.get('/me', authWajib, async (req, res) => {
  const ringkasan = await ringkasLangganan(req.user.id);
  if (!ringkasan) {
    return res.status(404).json({ pesan: 'Akun tidak ditemukan.' });
  }
  return res.json(ringkasan);
});

router.post('/activate', authWajib, hanyaPengembangan, async (req, res) => {
  const parsed = z.object({
    hari: z.coerce.number().int('Durasi harus bilangan bulat').positive('Durasi harus lebih dari 0').max(365, 'Durasi maksimal 365 hari').optional(),
  }).safeParse(req.body || {});

  if (!parsed.success) {
    return res.status(400).json({ pesan: parsed.error.issues[0].message });
  }

  const sebelum = await ringkasLangganan(req.user.id);
  if (!sebelum) {
    return res.status(404).json({ pesan: 'Akun tidak ditemukan.' });
  }
  if (sebelum.plan === PAKET.ADMIN) {
    return res.status(400).json({ pesan: 'Admin tidak dibatasi paket, jadi tidak perlu upgrade.' });
  }

  const hari = parsed.data.hari || DURASI_PREMIUM_HARI;
  await aktifkanPremium(req.user.id, hari);

  const sesudah = await ringkasLangganan(req.user.id);
  return res.json({
    pesan: `Paket Premium simulasi aktif selama ${hari} hari (tanpa pembayaran).`,
    ...sesudah,
  });
});

router.post('/reset', authWajib, hanyaPengembangan, async (req, res) => {
  const sebelum = await ringkasLangganan(req.user.id);
  if (!sebelum) {
    return res.status(404).json({ pesan: 'Akun tidak ditemukan.' });
  }
  if (sebelum.plan === PAKET.ADMIN) {
    return res.status(400).json({ pesan: 'Admin tidak dibatasi paket, jadi tidak ada langganan untuk dibatalkan.' });
  }

  await batalkanPremium(req.user.id);

  const sesudah = await ringkasLangganan(req.user.id);
  return res.json({
    pesan: 'Langganan Premium dibatalkan (simulasi). Akun kembali ke paket Free.',
    ...sesudah,
  });
});

module.exports = router;
