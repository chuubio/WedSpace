require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const jwt = require('jsonwebtoken');
const { sequelize, User, Decoration } = require('../models');

async function testMediaSecurity() {
  await sequelize.authenticate();

  const [woA] = await User.findOrCreate({
    where: { username_email: 'wo@wedspace.test' },
  });

  const [woB] = await User.findOrCreate({
    where: { username_email: 'wo2@wedspace.test' },
  });

  const dirGambar = path.join(__dirname, '..', '..', 'uploads', 'gambar');
  const dummyFile = 'dummy-private-test.jpg';
  fs.writeFileSync(path.join(dirGambar, dummyFile), 'dummy-content');

  // Buat dekorasi privat milik WO A
  const decPrivat = await Decoration.create({
    nama_dekorasi: 'Tes Gambar Privat',
    kategori: 'Meja',
    harga: 100000,
    panjang: 100,
    lebar: 100,
    tinggi: 100,
    gambar: `/uploads/gambar/${dummyFile}`,
    created_by_user_id: woA.id,
    visibility: 'private',
  });

  const { periksaAksesMedia } = require('../middleware/mediaAkses');

  function mockReq(headers = {}, query = {}) {
    return {
      params: { tipe: 'gambar', file: dummyFile },
      headers,
      query,
    };
  }

  function mockRes() {
    return {
      statusCode: 200,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.body = data;
        return this;
      },
      sendFile(p) {
        this.fileSent = p;
        return this;
      },
    };
  }

  // 1. Tanpa token -> harus 403
  const res1 = mockRes();
  await periksaAksesMedia(mockReq(), res1, () => {});
  console.log('Test Media 1 (Tanpa token):', res1.statusCode === 403 ? 'PASS (403 Forbidden)' : `FAIL (${res1.statusCode})`);

  // 2. Token WO B (bukan pemilik) -> harus 403
  const tokenWoB = jwt.sign({ id: woB.id, role: woB.role }, process.env.JWT_SECRET);
  const res2 = mockRes();
  await periksaAksesMedia(mockReq({ authorization: `Bearer ${tokenWoB}` }), res2, () => {});
  console.log('Test Media 2 (Token WO B):', res2.statusCode === 403 ? 'PASS (403 Forbidden)' : `FAIL (${res2.statusCode})`);

  // 3. Token WO A (pemilik) -> harus kirim file
  const tokenWoA = jwt.sign({ id: woA.id, role: woA.role }, process.env.JWT_SECRET);
  const res3 = mockRes();
  await periksaAksesMedia(mockReq({ authorization: `Bearer ${tokenWoA}` }), res3, () => {});
  console.log('Test Media 3 (Token WO A):', res3.fileSent ? 'PASS (File terkirim)' : 'FAIL');

  // Bersihkan data uji
  await decPrivat.destroy();
  if (fs.existsSync(path.join(dirGambar, dummyFile))) {
    fs.unlinkSync(path.join(dirGambar, dummyFile));
  }

  await sequelize.close();
}

testMediaSecurity();
