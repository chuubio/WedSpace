const express = require('express');
const { Project } = require('../models');
const { authWajib } = require('../middleware/auth');
const {
  cekKuotaRekomendasi,
  catatPemakaianRekomendasi,
} = require('../services/subscription');
const { buatRekomendasiDekorasi } = require('../services/gemini');

const router = express.Router();

async function muatProyek(req, res, next) {
  const proyek = await Project.findByPk(req.params.projectId);
  if (!proyek) {
    return res.status(404).json({ pesan: 'Proyek tidak ditemukan.' });
  }
  if (req.user.role !== 'admin' && proyek.user_id !== req.user.id) {
    return res.status(403).json({ pesan: 'Kamu tidak punya akses ke proyek ini.' });
  }
  req.proyek = proyek;
  return next();
}

router.get('/:projectId/kuota', authWajib, muatProyek, async (req, res) => {
  try {
    const kuota = await cekKuotaRekomendasi(req.user.id, req.proyek.id);
    return res.json({ data: kuota });
  } catch (err) {
    return res.status(500).json({ pesan: 'Gagal memeriksa kuota rekomendasi.' });
  }
});

router.post('/:projectId', authWajib, muatProyek, async (req, res) => {
  if (req.user.role === 'admin') {
    return res.status(403).json({ pesan: 'Fitur rekomendasi dekorasi hanya tersedia untuk Wedding Organizer.' });
  }

  try {
    const kuota = await cekKuotaRekomendasi(req.user.id, req.proyek.id);
    if (!kuota.boleh) {
      return res.status(403).json({ pesan: kuota.pesan, data: kuota });
    }

    const requestData = {
      nama_proyek: req.proyek.nama_proyek,
      nama_venue: req.proyek.nama_venue,
      panjang_venue: req.proyek.panjang_venue,
      lebar_venue: req.proyek.lebar_venue,
      jumlah_tamu: req.proyek.jumlah_tamu,
      tema: req.proyek.tema,
      anggaran: req.proyek.anggaran,
    };

    const hasil = await buatRekomendasiDekorasi(requestData);
    const rekomendasi = hasil.rekomendasi;

    await catatPemakaianRekomendasi(req.user.id, req.proyek.id, kuota.plan, requestData, hasil);

    const kuotaTerbaru = await cekKuotaRekomendasi(req.user.id, req.proyek.id);

    return res.json({
      data: {
        rekomendasi,
        ringkasan: hasil.ringkasan,
        kuota: kuotaTerbaru,
      },
    });
  } catch (err) {
    if (err?.kode === 'GEMINI_API_KEY_TIDAK_ADA') {
      return res.status(503).json({ pesan: 'Rekomendasi AI belum diaktifkan. Silakan coba lagi nanti.' });
    }
    if (err?.kode === 'GEMINI_ERROR' || err?.kode === 'GEMINI_RESPONSE_INVALID' || err?.kode === 'REKOMENDASI_TIDAK_VALID') {
      return res.status(502).json({ pesan: 'Gagal membuat rekomendasi dari AI. Silakan coba lagi.' });
    }
    return res.status(500).json({ pesan: 'Gagal membuat rekomendasi dekorasi. Silakan coba lagi.' });
  }
});

module.exports = router;
