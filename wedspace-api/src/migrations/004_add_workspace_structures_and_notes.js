/**
 * Migration 004:
 * 1. Create `design_structures` table (tembok, pintu, jendela pada Workspace 2D & 3D)
 * 2. Create `design_notes` table (catatan WO per rancangan + pin opsional di canvas 2D & 3D)
 * 3. Seed tambahan dekorasi bawaan original WedSpace (public, platform-owned) jika belum ada
 */

const DEKORASI_ORIGINAL_TAMBAHAN = [
  {
    nama_dekorasi: 'Photobooth Floral Rustic',
    kategori: 'Photobooth',
    harga: 2500000,
    panjang: 250,
    lebar: 100,
    tinggi: 240,
    deskripsi: 'Booth foto pernikahan dengan rangka kayu, bunga mawar pastel, dan pencahayaan hangat.',
    visibility: 'public',
    is_active: true,
    model_3d_source: 'placeholder',
  },
  {
    nama_dekorasi: 'Welcome Sign Easel Kayu',
    kategori: 'Welcome Sign',
    harga: 450000,
    panjang: 80,
    lebar: 60,
    tinggi: 160,
    deskripsi: 'Papan selamat datang akrilik pada penyangga easel kayu dengan hiasan bunga sudut.',
    visibility: 'public',
    is_active: true,
    model_3d_source: 'placeholder',
  },
  {
    nama_dekorasi: 'Meja Prasmanan Catering',
    kategori: 'Meja Buffet',
    harga: 850000,
    panjang: 240,
    lebar: 90,
    tinggi: 85,
    deskripsi: 'Meja prasmanan panjang dengan taplak krem elegan dan pemanas hidangan stainless.',
    visibility: 'public',
    is_active: true,
    model_3d_source: 'placeholder',
  },
  {
    nama_dekorasi: 'Karpet Aisle Putih Elegan',
    kategori: 'Karpet',
    harga: 1200000,
    panjang: 600,
    lebar: 180,
    tinggi: 3,
    deskripsi: 'Karpet jalan pengantin warna putih gading untuk lorong utama menuju pelaminan.',
    visibility: 'public',
    is_active: true,
    model_3d_source: 'placeholder',
  },
  {
    nama_dekorasi: 'Lampu Gantung Chandelier Kristal',
    kategori: 'Lighting',
    harga: 1800000,
    panjang: 120,
    lebar: 120,
    tinggi: 280,
    deskripsi: 'Lampu gantung chandelier kristal beraksen emas untuk penerangan utama ruangan.',
    visibility: 'public',
    is_active: true,
    model_3d_source: 'placeholder',
  },
  {
    nama_dekorasi: 'Meja Penerima Tamu & Kotak Angpao',
    kategori: 'Meja',
    harga: 650000,
    panjang: 160,
    lebar: 75,
    tinggi: 80,
    deskripsi: 'Meja registrasi tamu lengkap dengan taplak linen dan penataan area buku tamu.',
    visibility: 'public',
    is_active: true,
    model_3d_source: 'placeholder',
  },
];

async function up(queryInterface, Sequelize) {
  const { sequelize } = queryInterface;

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS design_structures (
      id INT AUTO_INCREMENT PRIMARY KEY,
      design_id INT NOT NULL,
      tipe ENUM('wall', 'door', 'window') NOT NULL DEFAULT 'wall',
      label VARCHAR(120) NOT NULL DEFAULT 'Tembok',
      posisi_x FLOAT NOT NULL DEFAULT 0,
      posisi_y FLOAT NOT NULL DEFAULT 0,
      panjang FLOAT NOT NULL DEFAULT 300,
      tebal FLOAT NOT NULL DEFAULT 15,
      tinggi FLOAT NOT NULL DEFAULT 300,
      rotasi FLOAT NOT NULL DEFAULT 0,
      warna VARCHAR(32) NOT NULL DEFAULT '#EFE7DD',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_design_structures_design
        FOREIGN KEY (design_id) REFERENCES venue_designs(id)
        ON DELETE CASCADE
    ) ENGINE=InnoDB;
  `);
  console.log('[Migration 004] Table design_structures ready.');

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS design_notes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      design_id INT NOT NULL,
      judul VARCHAR(150) NOT NULL DEFAULT 'Catatan WO',
      isi TEXT NOT NULL,
      warna VARCHAR(32) NOT NULL DEFAULT '#F7E3A8',
      posisi_x FLOAT NULL DEFAULT NULL,
      posisi_y FLOAT NULL DEFAULT NULL,
      selesai TINYINT(1) NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_design_notes_design
        FOREIGN KEY (design_id) REFERENCES venue_designs(id)
        ON DELETE CASCADE
    ) ENGINE=InnoDB;
  `);
  console.log('[Migration 004] Table design_notes ready.');

  // Tambahkan katalog original bawaan WedSpace jika belum ada
  let inserted = 0;
  for (const item of DEKORASI_ORIGINAL_TAMBAHAN) {
    const [rows] = await sequelize.query(
      'SELECT id FROM decorations WHERE nama_dekorasi = ? AND created_by_user_id IS NULL LIMIT 1',
      { replacements: [item.nama_dekorasi] }
    );
    if (rows.length === 0) {
      await sequelize.query(
        `INSERT INTO decorations
          (nama_dekorasi, kategori, harga, panjang, lebar, tinggi, deskripsi, visibility, is_active, model_3d_source, created_by_user_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NOW(), NOW())`,
        {
          replacements: [
            item.nama_dekorasi,
            item.kategori,
            item.harga,
            item.panjang,
            item.lebar,
            item.tinggi,
            item.deskripsi,
            item.visibility,
            item.is_active ? 1 : 0,
            item.model_3d_source,
          ],
        }
      );
      inserted += 1;
    }
  }
  console.log(`[Migration 004] Original WedSpace catalog items inserted: ${inserted}`);
}

async function down(queryInterface) {
  const { sequelize } = queryInterface;
  await sequelize.query('DROP TABLE IF EXISTS design_notes;');
  await sequelize.query('DROP TABLE IF EXISTS design_structures;');
  console.log('[Migration 004] Dropped design_notes and design_structures.');
}

module.exports = { up, down };
