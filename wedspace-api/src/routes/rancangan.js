const express = require('express');
const { z } = require('zod');
const { Design, DesignItem, Decoration, Project } = require('../models');
const { authWajib } = require('../middleware/auth');

const router = express.Router();

// Memuat rancangan dan memastikan WO hanya membuka miliknya sendiri (FR-WO9, FR-WO16, FR-WO17)
async function muatRancangan(req, res, next) {
  const rancangan = await Design.findByPk(req.params.id, {
    include: [{ model: DesignItem, include: [{ model: Decoration }] }, { model: Project }],
  });
  if (!rancangan) {
    return res.status(404).json({ pesan: 'Rancangan tidak ditemukan.' });
  }
  if (req.user.role !== 'admin' && rancangan.Project.user_id !== req.user.id) {
    return res.status(403).json({ pesan: 'Kamu tidak punya akses ke rancangan ini.' });
  }
  req.rancangan = rancangan;
  return next();
}

// GET /api/rancangan/:id — buka rancangan beserta dekorasi di dalamnya (FR-WO9, FR-WO15, FR-WO16)
router.get('/:id', authWajib, muatRancangan, async (req, res) => {
  const polos = req.rancangan.toJSON();
  return res.json({
    data: {
      ...polos,
      proyek: polos.Project,
    },
  });
});

// PUT /api/rancangan/:id — simpan rancangan (nama + seluruh design_items) (FR-WO9, FR-WO15, FR-WO16)
router.put('/:id', authWajib, muatRancangan, async (req, res) => {
  const skema = z.object({
    nama_rancangan: z.string().min(1, 'Nama rancangan wajib diisi').optional(),
    item: z.array(z.object({
      decoration_id: z.coerce.number().int().positive('decoration_id tidak valid'),
      posisi_x: z.coerce.number(),
      posisi_y: z.coerce.number(),
      rotasi: z.coerce.number().optional().default(0),
      jumlah: z.coerce.number().int().positive('Jumlah minimal 1').optional().default(1),
    })).optional().default([]),
  });
  const parsed = skema.safeParse(req.body || {});
  if (!parsed.success) {
    return res.status(400).json({ pesan: parsed.error.issues[0].message });
  }

  if (parsed.data.nama_rancangan) {
    await req.rancangan.update({ nama_rancangan: parsed.data.nama_rancangan });
  }

  // Ganti seluruh isi design_items lalu isi ulang (sederhana dan aman untuk simpan penuh)
  await DesignItem.destroy({ where: { design_id: req.rancangan.id } });
  if (parsed.data.item.length > 0) {
    await DesignItem.bulkCreate(parsed.data.item.map((i) => ({ ...i, design_id: req.rancangan.id })));
  }

  const segar = await Design.findByPk(req.rancangan.id, {
    include: [{ model: DesignItem, include: [{ model: Decoration }] }],
  });
  return res.json({ data: segar });
});

// GET /api/rancangan/:id/estimasi — rincian dan total biaya (FR-WO12)
router.get('/:id/estimasi', authWajib, muatRancangan, async (req, res) => {
  const rincian = (req.rancangan.DesignItems || []).map((i) => {
    const harga = Number(i.Decoration?.harga || 0);
    const jumlah = Number(i.jumlah || 1);
    return {
      nama_dekorasi: i.Decoration?.nama_dekorasi || 'Dekorasi dihapus',
      kategori: i.Decoration?.kategori || '-',
      harga_satuan: harga,
      jumlah,
      subtotal: harga * jumlah,
    };
  });
  const total = rincian.reduce((s, r) => s + r.subtotal, 0);
  return res.json({ data: { rancangan_id: req.rancangan.id, rincian, total } });
});

module.exports = router;
