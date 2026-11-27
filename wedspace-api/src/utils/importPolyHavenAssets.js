const fs = require('node:fs');
const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
const { sequelize, Model3DLibrary, Decoration } = require('../models');

const POLYHAVEN_ASSETS = [
  {
    id: 'Chandelier_01',
    nama_model: 'Chandelier Klasik Mewah (Poly Haven)',
    nama_dekorasi: 'Chandelier Klasik Mewah',
    kategori: 'Lighting',
    panjang: 90,
    lebar: 90,
    tinggi: 110,
    harga: 2800000,
    deskripsi: 'Lampu gantung chandelier klasik realistis dengan detail kuningan dan kristal (Aset 3D CC0 Poly Haven).',
  },
  {
    id: 'Sofa_01',
    nama_model: 'Sofa Pengantin Klasik Realistis (Poly Haven)',
    nama_dekorasi: 'Sofa Pengantin Realistis',
    kategori: 'Kursi',
    panjang: 200,
    lebar: 90,
    tinggi: 95,
    harga: 1800000,
    deskripsi: 'Sofa klasik realistis untuk area pelaminan atau lounge VIP tamu pernikahan (Aset 3D CC0 Poly Haven).',
  },
  {
    id: 'ArmChair_01',
    nama_model: 'Kursi VIP Orang Tua Realistis (Poly Haven)',
    nama_dekorasi: 'Kursi VIP Orang Tua',
    kategori: 'Kursi',
    panjang: 80,
    lebar: 80,
    tinggi: 95,
    harga: 450000,
    deskripsi: 'Armchair elegan berlapis kain untuk kursi orang tua di pelaminan atau sudut photobooth (Aset 3D CC0 Poly Haven).',
  },
  {
    id: 'dining_chair_02',
    nama_model: 'Kursi Tamu Kayu Elegan (Poly Haven)',
    nama_dekorasi: 'Kursi Tamu Kayu Elegan',
    kategori: 'Kursi',
    panjang: 48,
    lebar: 50,
    tinggi: 90,
    harga: 35000,
    deskripsi: 'Kursi kayu klasik berkualitas tinggi untuk tema pernikahan rustic maupun elegan (Aset 3D CC0 Poly Haven).',
  },
  {
    id: 'ClassicConsole_01',
    nama_model: 'Meja Konsol Buku Tamu Klasik (Poly Haven)',
    nama_dekorasi: 'Meja Konsol Buku Tamu',
    kategori: 'Meja',
    panjang: 140,
    lebar: 45,
    tinggi: 85,
    harga: 650000,
    deskripsi: 'Meja konsol klasik berukir untuk area registrasi, buku tamu, atau display souvenir (Aset 3D CC0 Poly Haven).',
  },
  {
    id: 'dining_table',
    nama_model: 'Meja Perjamuan Kayu Rustic (Poly Haven)',
    nama_dekorasi: 'Meja Perjamuan Kayu Rustic',
    kategori: 'Meja',
    panjang: 200,
    lebar: 100,
    tinggi: 76,
    harga: 550000,
    deskripsi: 'Meja perjamuan panjang berbahan kayu solid untuk intimate wedding atau jamuan keluarga (Aset 3D CC0 Poly Haven).',
  },
  {
    id: 'potted_plant_01',
    nama_model: 'Tanaman Hias Pot Dekorasi (Poly Haven)',
    nama_dekorasi: 'Tanaman Hias Pot Dekorasi',
    kategori: 'Bunga',
    panjang: 60,
    lebar: 60,
    tinggi: 130,
    harga: 250000,
    deskripsi: 'Tanaman hias daun hijau dalam pot keramik untuk pemanis sudut venue & panggung (Aset 3D CC0 Poly Haven).',
  },
  {
    id: 'brass_candleholders',
    nama_model: 'Tempat Lilin Kuningan Emas (Poly Haven)',
    nama_dekorasi: 'Tempat Lilin Kuningan Emas',
    kategori: 'Lighting',
    panjang: 35,
    lebar: 35,
    tinggi: 45,
    harga: 180000,
    deskripsi: 'Set tempat lilin kuningan emas untuk centerpiece meja makan malam romantis (Aset 3D CC0 Poly Haven).',
  },
  {
    id: 'antique_ceramic_vase_01',
    nama_model: 'Vas Keramik Antik Dekorasi (Poly Haven)',
    nama_dekorasi: 'Vas Keramik Antik',
    kategori: 'Bunga',
    panjang: 35,
    lebar: 35,
    tinggi: 55,
    harga: 200000,
    deskripsi: 'Vas keramik antik bergaya vintage untuk aksen meja konsol dan sudut pelaminan (Aset 3D CC0 Poly Haven).',
  },
  {
    id: 'ornate_mirror_01',
    nama_model: 'Cermin Ukir Emas Welcome Sign (Poly Haven)',
    nama_dekorasi: 'Cermin Ukir Emas Welcome Sign',
    kategori: 'Aksesoris',
    panjang: 80,
    lebar: 15,
    tinggi: 120,
    harga: 400000,
    deskripsi: 'Cermin berbingkai ukir emas klasik yang populer sebagai welcome sign atau dekorasi pintu masuk (Aset 3D CC0 Poly Haven).',
  },
  // Batch 2: 20 Aset Tambahan Dekorasi Pernikahan (CC0 Poly Haven)
  {
    id: 'Chandelier_02',
    nama_model: 'Chandelier Kristal Klasik 2 (Poly Haven)',
    nama_dekorasi: 'Chandelier Kristal Klasik 2',
    kategori: 'Lighting',
    panjang: 100,
    lebar: 100,
    tinggi: 120,
    harga: 3000000,
    deskripsi: 'Lampu gantung chandelier kristal besar untuk ballroom pernikahan mewah (Aset 3D CC0 Poly Haven).',
  },
  {
    id: 'Chandelier_03',
    nama_model: 'Chandelier Emas Antik (Poly Haven)',
    nama_dekorasi: 'Chandelier Emas Antik',
    kategori: 'Lighting',
    panjang: 85,
    lebar: 85,
    tinggi: 105,
    harga: 2400000,
    deskripsi: 'Chandelier bernuansa emas antik untuk venue klasik maupun vintage (Aset 3D CC0 Poly Haven).',
  },
  {
    id: 'lantern_chandelier_01',
    nama_model: 'Lampu Gantung Lentera (Poly Haven)',
    nama_dekorasi: 'Lampu Gantung Lentera',
    kategori: 'Lighting',
    panjang: 60,
    lebar: 60,
    tinggi: 90,
    harga: 1200000,
    deskripsi: 'Lampu gantung bergaya lentera untuk tenda outdoor atau garden wedding (Aset 3D CC0 Poly Haven).',
  },
  {
    id: 'Lantern_01',
    nama_model: 'Lentera Meja Klasik (Poly Haven)',
    nama_dekorasi: 'Lentera Meja Klasik',
    kategori: 'Lighting',
    panjang: 25,
    lebar: 25,
    tinggi: 45,
    harga: 120000,
    deskripsi: 'Lentera dekoratif untuk hiasan aisle jalan pengantin atau centerpiece meja (Aset 3D CC0 Poly Haven).',
  },
  {
    id: 'wooden_lantern_01',
    nama_model: 'Lentera Kayu Rustic (Poly Haven)',
    nama_dekorasi: 'Lentera Kayu Rustic',
    kategori: 'Lighting',
    panjang: 28,
    lebar: 28,
    tinggi: 48,
    harga: 135000,
    deskripsi: 'Lentera berbingkai kayu bergaya rustic untuk dekorasi outdoor & jalur masuk (Aset 3D CC0 Poly Haven).',
  },
  {
    id: 'sofa_02',
    nama_model: 'Sofa Lounge VIP Modern (Poly Haven)',
    nama_dekorasi: 'Sofa Lounge VIP Modern',
    kategori: 'Kursi',
    panjang: 210,
    lebar: 90,
    tinggi: 85,
    harga: 1600000,
    deskripsi: 'Sofa lounge modern untuk area tunggu keluarga besar atau sudut photobooth (Aset 3D CC0 Poly Haven).',
  },
  {
    id: 'sofa_03',
    nama_model: 'Sofa Pengantin Minimalis (Poly Haven)',
    nama_dekorasi: 'Sofa Pengantin Minimalis',
    kategori: 'Kursi',
    panjang: 195,
    lebar: 88,
    tinggi: 82,
    harga: 1700000,
    deskripsi: 'Sofa bergaya minimalis elegan untuk pelaminan modern (Aset 3D CC0 Poly Haven).',
  },
  {
    id: 'Ottoman_01',
    nama_model: 'Ottoman Bangku VIP (Poly Haven)',
    nama_dekorasi: 'Ottoman Bangku VIP',
    kategori: 'Kursi',
    panjang: 85,
    lebar: 60,
    tinggi: 45,
    harga: 350000,
    deskripsi: 'Bangku ottoman berlapis kain empuk untuk pelengkap area lounge atau photobooth (Aset 3D CC0 Poly Haven).',
  },
  {
    id: 'painted_wooden_bench',
    nama_model: 'Bangku Taman Wedding Outdoor (Poly Haven)',
    nama_dekorasi: 'Bangku Taman Wedding Outdoor',
    kategori: 'Kursi',
    panjang: 150,
    lebar: 55,
    tinggi: 88,
    harga: 420000,
    deskripsi: 'Bangku kayu taman klasik untuk kursi tamu garden wedding atau properti foto (Aset 3D CC0 Poly Haven).',
  },
  {
    id: 'round_wooden_table_01',
    nama_model: 'Meja Bundar Kayu Rustic (Poly Haven)',
    nama_dekorasi: 'Meja Bundar Kayu Rustic',
    kategori: 'Meja',
    panjang: 130,
    lebar: 130,
    tinggi: 76,
    harga: 420000,
    deskripsi: 'Meja bundar berbahan kayu natural untuk tema intimate rustic wedding (Aset 3D CC0 Poly Haven).',
  },
  {
    id: 'coffee_table_round_01',
    nama_model: 'Meja Kopi Bundar VIP (Poly Haven)',
    nama_dekorasi: 'Meja Kopi Bundar VIP',
    kategori: 'Meja',
    panjang: 85,
    lebar: 85,
    tinggi: 45,
    harga: 280000,
    deskripsi: 'Meja kopi bundar pelengkap area lounge tamu VIP (Aset 3D CC0 Poly Haven).',
  },
  {
    id: 'side_table_tall_01',
    nama_model: 'Meja Pedestal Tinggi Dekorasi (Poly Haven)',
    nama_dekorasi: 'Meja Pedestal Tinggi',
    kategori: 'Meja',
    panjang: 45,
    lebar: 45,
    tinggi: 95,
    harga: 220000,
    deskripsi: 'Meja pedestal tinggi untuk meletakkan vas bunga, kue, atau bingkai foto (Aset 3D CC0 Poly Haven).',
  },
  {
    id: 'potted_plant_02',
    nama_model: 'Tanaman Hias Pot Daun Hijau (Poly Haven)',
    nama_dekorasi: 'Tanaman Hias Daun Hijau',
    kategori: 'Bunga',
    panjang: 55,
    lebar: 55,
    tinggi: 110,
    harga: 220000,
    deskripsi: 'Tanaman daun hijau segar dalam pot untuk dekorasi sudut ruangan & panggung (Aset 3D CC0 Poly Haven).',
  },
  {
    id: 'potted_plant_04',
    nama_model: 'Tanaman Hias Sukulen Pot (Poly Haven)',
    nama_dekorasi: 'Tanaman Sukulen Pot',
    kategori: 'Bunga',
    panjang: 40,
    lebar: 40,
    tinggi: 60,
    harga: 160000,
    deskripsi: 'Tanaman sukulen dalam pot dekoratif untuk meja konsol atau tema botanical (Aset 3D CC0 Poly Haven).',
  },
  {
    id: 'brass_vase_01',
    nama_model: 'Vas Bunga Kuningan Emas (Poly Haven)',
    nama_dekorasi: 'Vas Bunga Kuningan Emas',
    kategori: 'Bunga',
    panjang: 30,
    lebar: 30,
    tinggi: 50,
    harga: 175000,
    deskripsi: 'Vas kuningan emas elegan untuk rangkaian bunga di meja VIP atau pelaminan (Aset 3D CC0 Poly Haven).',
  },
  {
    id: 'ceramic_vase_01',
    nama_model: 'Vas Keramik Putih Minimalis (Poly Haven)',
    nama_dekorasi: 'Vas Keramik Putih Minimalis',
    kategori: 'Bunga',
    panjang: 30,
    lebar: 30,
    tinggi: 48,
    harga: 150000,
    deskripsi: 'Vas keramik putih bersih untuk dekorasi meja penerima tamu dan centerpiece (Aset 3D CC0 Poly Haven).',
  },
  {
    id: 'standing_picture_frame_01',
    nama_model: 'Bingkai Foto Prewedding Meja (Poly Haven)',
    nama_dekorasi: 'Bingkai Foto Prewedding Meja',
    kategori: 'Aksesoris',
    panjang: 25,
    lebar: 12,
    tinggi: 35,
    harga: 85000,
    deskripsi: 'Bingkai foto berdiri untuk memajang foto prewedding di meja buku tamu (Aset 3D CC0 Poly Haven).',
  },
  {
    id: 'fancy_picture_frame_01',
    nama_model: 'Bingkai Foto Ukir Emas (Poly Haven)',
    nama_dekorasi: 'Bingkai Foto Ukir Emas',
    kategori: 'Aksesoris',
    panjang: 65,
    lebar: 8,
    tinggi: 85,
    harga: 250000,
    deskripsi: 'Bingkai ukir emas klasik ukuran besar untuk galeri foto prewedding (Aset 3D CC0 Poly Haven).',
  },
  {
    id: 'strawberry_chocolate_cake',
    nama_model: 'Kue Pernikahan Cokelat Stroberi (Poly Haven)',
    nama_dekorasi: 'Kue Pernikahan Stroberi',
    kategori: 'Aksesoris',
    panjang: 35,
    lebar: 35,
    tinggi: 25,
    harga: 650000,
    deskripsi: 'Properti kue pernikahan cokelat stroberi untuk meja dessert atau cake table (Aset 3D CC0 Poly Haven).',
  },
  {
    id: 'brass_goblets',
    nama_model: 'Gelas Piala Kuningan Toast (Poly Haven)',
    nama_dekorasi: 'Gelas Piala Kuningan Toast',
    kategori: 'Aksesoris',
    panjang: 25,
    lebar: 25,
    tinggi: 22,
    harga: 140000,
    deskripsi: 'Set gelas piala kuningan klasik untuk meja pengantin (Aset 3D CC0 Poly Haven).',
  },
];

const BASE_DIR = path.join(__dirname, '..', '..', 'uploads', 'library', 'polyhaven');

async function downloadFile(url, destPath) {
  if (fs.existsSync(destPath) && fs.statSync(destPath).size > 0) return;
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Gagal download ${url}: HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(destPath, buf);
}

async function importOne(asset) {
  const filesRes = await fetch(`https://api.polyhaven.com/files/${asset.id}`);
  if (!filesRes.ok) throw new Error(`Gagal ambil metadata file ${asset.id}`);
  const filesJson = await filesRes.json();

  const gltfEntry = filesJson.gltf?.['1k']?.gltf || filesJson.gltf?.['2k']?.gltf;
  if (!gltfEntry || !gltfEntry.url) {
    throw new Error(`Format glTF tidak tersedia untuk ${asset.id}`);
  }

  const assetDir = path.join(BASE_DIR, asset.id);
  fs.mkdirSync(assetDir, { recursive: true });

  const gltfFilename = path.basename(new URL(gltfEntry.url).pathname);
  const gltfLocalPath = path.join(assetDir, gltfFilename);
  await downloadFile(gltfEntry.url, gltfLocalPath);

  // Download semua file include (.bin + textures) sesuai path relatifnya
  const includes = gltfEntry.include || {};
  for (const [relPath, info] of Object.entries(includes)) {
    if (!info?.url) continue;
    const dest = path.join(assetDir, relPath);
    await downloadFile(info.url, dest);
  }

  // Download thumbnail preview resmi Poly Haven
  const thumbUrl = `https://cdn.polyhaven.com/asset_img/thumbs/${asset.id}.png?height=300`;
  const thumbPath = path.join(assetDir, 'thumb.png');
  try {
    await downloadFile(thumbUrl, thumbPath);
  } catch (err) {
    console.warn(`[WARN] Thumbnail ${asset.id} gagal diunduh:`, err.message);
  }

  const webModelPath = `/uploads/library/polyhaven/${asset.id}/${gltfFilename}`;
  const webThumbPath = fs.existsSync(thumbPath) ? `/uploads/library/polyhaven/${asset.id}/thumb.png` : null;

  const [lib, libCreated] = await Model3DLibrary.findOrCreate({
    where: { file_path: webModelPath },
    defaults: {
      nama_model: asset.nama_model,
      kategori: asset.kategori,
      file_path: webModelPath,
      thumbnail_path: webThumbPath,
      panjang: asset.panjang,
      lebar: asset.lebar,
      tinggi: asset.tinggi,
      sumber: 'Poly Haven',
      license_name: 'CC0',
      license_url: 'https://polyhaven.com/license',
      attribution_text: `Model 3D CC0 dari Poly Haven (${asset.id})`,
      is_active: true,
    },
  });

  if (!libCreated) {
    await lib.update({
      nama_model: asset.nama_model,
      kategori: asset.kategori,
      thumbnail_path: webThumbPath,
      panjang: asset.panjang,
      lebar: asset.lebar,
      tinggi: asset.tinggi,
      is_active: true,
    });
  }

  const [dek, dekCreated] = await Decoration.findOrCreate({
    where: {
      nama_dekorasi: asset.nama_dekorasi,
      created_by_user_id: null,
    },
    defaults: {
      nama_dekorasi: asset.nama_dekorasi,
      kategori: asset.kategori,
      harga: asset.harga,
      panjang: asset.panjang,
      lebar: asset.lebar,
      tinggi: asset.tinggi,
      deskripsi: asset.deskripsi,
      gambar: webThumbPath,
      visibility: 'public',
      is_active: true,
      model_3d_source: 'library',
      library_model_id: lib.id,
      model_3d: webModelPath,
      created_by_user_id: null,
    },
  });

  if (!dekCreated) {
    await dek.update({
      gambar: webThumbPath,
      model_3d_source: 'library',
      library_model_id: lib.id,
      model_3d: webModelPath,
      is_active: true,
    });
  }

  console.log(`[POLYHAVEN OK] ${asset.nama_dekorasi} (${asset.id}) -> lib#${lib.id}, dek#${dek.id}`);
}

async function run() {
  try {
    await sequelize.authenticate();
    let okCount = 0;
    for (const asset of POLYHAVEN_ASSETS) {
      try {
        await importOne(asset);
        okCount++;
      } catch (err) {
        console.error(`[FAIL] ${asset.id}:`, err.message);
      }
    }
    console.log(`\nSelesai! ${okCount}/${POLYHAVEN_ASSETS.length} aset 3D Poly Haven (CC0) berhasil diunduh dan didaftarkan.`);
  } finally {
    await sequelize.close();
  }
}

run();
