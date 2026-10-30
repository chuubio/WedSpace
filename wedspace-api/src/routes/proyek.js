const express = require('express');
const { z } = require('zod');
const { Project, Design, DesignItem } = require('../models');
const { authWajib } = require('../middleware/auth');
const { cekBatasProyek } = require('../services/subscription');

const router = express.Router();

const skemaProyek = z.object({
  nama_proyek: z.string().min(1, 'Nama proyek wajib diisi'),
  nama_venue: z.string().min(1, 'Nama venue wajib diisi'),
  panjang_venue: z.coerce.number().positive('Panjang venue harus lebih dari 0'),
  lebar_venue: z.coerce.number().positive('Lebar venue harus lebih dari 0'),
  jumlah_tamu: z.coerce.number().int('Jumlah tamu harus bilangan bulat').nonnegative('Jumlah tamu tidak boleh negatif').optional(),
  tema: z.string().optional().default(''),
  anggaran: z.coerce.number().int('Anggaran harus bilangan bulat').nonnegative('Anggaran tidak boleh negatif').optional(),
});

async function muatProyek(req, res, next) {
  const proyek = await Project.findByPk(req.params.id);
  if (!proyek) {
    return res.status(404).json({ pesan: 'Proyek tidak ditemukan.' });
  }
  if (req.user.role !== 'admin' && proyek.user_id !== req.user.id) {
    return res.status(403).json({ pesan: 'Kamu tidak punya akses ke proyek ini.' });
  }
  req.proyek = proyek;
  return next();
}

function bersihRancangan(rancangan) {
  const polos = rancangan.toJSON();
  const jumlah_item = (polos.DesignItems || []).length;
  delete polos.DesignItems;
  return { ...polos, jumlah_item };
}

router.get('/', authWajib, async (req, res) => {
  const where = req.user.role === 'admin' ? {} : { user_id: req.user.id };
  const daftar = await Project.findAll({
    where,
    include: [{ model: Design, attributes: ['id'] }],
    order: [['id', 'DESC']],
  });
  const data = daftar.map((p) => {
    const polos = p.toJSON();
    const jumlah_rancangan = (polos.Designs || []).length;
    delete polos.Designs;
    return { ...polos, jumlah_rancangan };
  });
  return res.json({ data });
});

router.post('/', authWajib, async (req, res) => {
  const parsed = skemaProyek.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ pesan: parsed.error.issues[0].message });
  }

  const batas = await cekBatasProyek(req.user.id);
  if (!batas.boleh) {
    return res.status(403).json({
      pesan: batas.pesan,
      paket: batas.plan,
      batas_proyek_aktif: batas.maks,
      proyek_aktif: batas.terpakai,
    });
  }

  const proyek = await Project.create({ ...parsed.data, user_id: req.user.id });
  const rancangan = await Design.create({ project_id: proyek.id, nama_rancangan: 'Rancangan 1' });
  return res.status(201).json({ data: { ...proyek.toJSON(), rancangan: [rancangan] } });
});

router.get('/:id', authWajib, muatProyek, async (req, res) => {
  const rancangan = await Design.findAll({
    where: { project_id: req.proyek.id },
    include: [{ model: DesignItem, attributes: ['id'] }],
    order: [['id', 'ASC']],
  });
  return res.json({ data: { ...req.proyek.toJSON(), rancangan: rancangan.map(bersihRancangan) } });
});

router.put('/:id', authWajib, muatProyek, async (req, res) => {
  const parsed = skemaProyek.partial().safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ pesan: parsed.error.issues[0].message });
  }
  await req.proyek.update(parsed.data);
  return res.json({ data: req.proyek });
});

router.delete('/:id', authWajib, muatProyek, async (req, res) => {
  await req.proyek.destroy();
  return res.json({ pesan: 'Proyek beserta seluruh rancangannya dihapus.' });
});

router.get('/:id/rancangan', authWajib, muatProyek, async (req, res) => {
  const rancangan = await Design.findAll({
    where: { project_id: req.proyek.id },
    include: [{ model: DesignItem, attributes: ['id'] }],
    order: [['id', 'ASC']],
  });
  return res.json({ data: rancangan.map(bersihRancangan) });
});

router.post('/:id/rancangan', authWajib, muatProyek, async (req, res) => {
  const parsed = z.object({ nama_rancangan: z.string().min(1, 'Nama rancangan wajib diisi').optional() }).safeParse(req.body || {});
  if (!parsed.success) {
    return res.status(400).json({ pesan: parsed.error.issues[0].message });
  }
  const hitung = await Design.count({ where: { project_id: req.proyek.id } });
  const dibuat = await Design.create({
    project_id: req.proyek.id,
    nama_rancangan: parsed.data.nama_rancangan || `Rancangan ${hitung + 1}`,
  });
  return res.status(201).json({ data: dibuat });
});

module.exports = router;
