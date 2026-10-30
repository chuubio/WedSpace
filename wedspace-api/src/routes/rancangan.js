const express = require('express');
const { z } = require('zod');
const { Design, DesignItem, Decoration, Project } = require('../models');
const { authWajib } = require('../middleware/auth');
const { getUserPlan } = require('../services/subscription');
const { batasPaket } = require('../config/subscription');
const { buatPdfRancangan } = require('../services/pdf');

const router = express.Router();

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

router.get('/:id', authWajib, muatRancangan, async (req, res) => {
  const polos = req.rancangan.toJSON();
  return res.json({
    data: {
      ...polos,
      proyek: polos.Project,
    },
  });
});

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

  await DesignItem.destroy({ where: { design_id: req.rancangan.id } });
  if (parsed.data.item.length > 0) {
    await DesignItem.bulkCreate(parsed.data.item.map((i) => ({ ...i, design_id: req.rancangan.id })));
  }

  const segar = await Design.findByPk(req.rancangan.id, {
    include: [{ model: DesignItem, include: [{ model: Decoration }] }],
  });
  return res.json({ data: segar });
});

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

router.get('/:id/ekspor', authWajib, muatRancangan, async (req, res) => {
  const plan = await getUserPlan(req.user.id);
  if (!batasPaket(plan).ekspor_pdf) {
    return res.status(403).json({
      pesan: 'Ekspor rancangan ke PDF hanya tersedia pada paket Premium. Upgrade ke Premium untuk membuka fitur ini.',
      paket: plan,
    });
  }

  const pdf = buatPdfRancangan(req.rancangan);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="rancangan-${req.rancangan.id}.pdf"`);
  res.setHeader('Content-Length', pdf.length);
  return res.send(pdf);
});

module.exports = router;
