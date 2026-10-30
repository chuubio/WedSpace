const express = require('express');
const { Project, Design, Decoration } = require('../models');
const { authWajib } = require('../middleware/auth');

const router = express.Router();

router.get('/', authWajib, async (req, res) => {
  const whereProyek = req.user.role === 'admin' ? {} : { user_id: req.user.id };
  const proyek = await Project.findAll({ where: whereProyek, attributes: ['id'], include: [{ model: Design, attributes: ['id'] }] });
  const total_proyek = proyek.length;
  const rancangan_tersimpan = proyek.reduce((s, p) => s + (p.Designs || []).length, 0);
  const dekorasi_tersedia = await Decoration.count({
    where: req.user.role === 'admin' ? {} : { is_active: true },
  });
  return res.json({ data: { total_proyek, rancangan_tersimpan, dekorasi_tersedia } });
});

module.exports = router;
