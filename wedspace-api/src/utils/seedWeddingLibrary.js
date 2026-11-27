const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
const { sequelize, Model3DLibrary, Decoration } = require('../models');

const ASSETS = [
  {
    nama_model: 'Meja Bundar Perjamuan 10 Orang',
    nama_dekorasi: 'Meja Bundar Perjamuan 3D',
    kategori: 'Meja',
    file_path: '/uploads/library/meja_bundar.glb',
    panjang: 180,
    lebar: 180,
    tinggi: 75,
    harga: 350000,
    deskripsi: 'Meja bundar perjamuan lengkap dengan taplak krem, piring, dan vas bunga centerpiece.',
  },
  {
    nama_model: 'Kursi Tiffany Putih Klasik',
    nama_dekorasi: 'Kursi Tiffany Putih 3D',
    kategori: 'Kursi',
    file_path: '/uploads/library/kursi_tiffany.glb',
    panjang: 45,
    lebar: 45,
    tinggi: 90,
    harga: 20000,
    deskripsi: 'Kursi Tiffany putih elegan dengan bantalan duduk krem dan pita sandaran.',
  },
  {
    nama_model: 'Floral Wedding Arch Modern',
    nama_dekorasi: 'Wedding Arch Floral Emas',
    kategori: 'Pelaminan',
    file_path: '/uploads/library/wedding_arch.glb',
    panjang: 240,
    lebar: 80,
    tinggi: 260,
    harga: 2500000,
    deskripsi: 'Gerbang lengkung besi emas berhias rangkaian bunga mawar pastel untuk akad atau pintu masuk.',
  },
  {
    nama_model: 'Pelaminan Floral Elegan',
    nama_dekorasi: 'Pelaminan Floral Elegan 3D',
    kategori: 'Pelaminan',
    file_path: '/uploads/library/pelaminan_floral_elegan.glb',
    panjang: 450,
    lebar: 220,
    tinggi: 280,
    harga: 8500000,
    deskripsi: 'Set pelaminan 3D lengkap dengan panggung marmer, backdrop 3 panel bertrim emas, sofa pengantin, kursi orang tua, dan standing flower.',
  },
  {
    nama_model: 'Sofa Pengantin Klasik Emas',
    nama_dekorasi: 'Sofa Pengantin Klasik Emas',
    kategori: 'Kursi',
    file_path: '/uploads/library/sofa_pengantin_klasik.glb',
    panjang: 180,
    lebar: 85,
    tinggi: 115,
    harga: 1500000,
    deskripsi: 'Sofa pengantin mewah rangka emas dengan bantalan krem empuk dan bantal aksen blush.',
  },
  {
    nama_model: 'Meja Prasmanan VIP',
    nama_dekorasi: 'Meja Prasmanan VIP 3D',
    kategori: 'Meja',
    file_path: '/uploads/library/meja_prasmanan_vip.glb',
    panjang: 300,
    lebar: 85,
    tinggi: 90,
    harga: 750000,
    deskripsi: 'Meja buffet katering panjang lengkap dengan skirting krem, pita burgundy, dan 3 chafing dish.',
  },
  {
    nama_model: 'Standing Flower Peony Emas',
    nama_dekorasi: 'Standing Flower Peony 3D',
    kategori: 'Bunga',
    file_path: '/uploads/library/standing_flower_peony.glb',
    panjang: 55,
    lebar: 55,
    tinggi: 155,
    harga: 450000,
    deskripsi: 'Standing flower rangka pilar emas tinggi dengan rangkaian bunga peony pastel.',
  },
  {
    nama_model: 'Backdrop Photobooth Floral',
    nama_dekorasi: 'Backdrop Photobooth Floral 3D',
    kategori: 'Backdrop',
    file_path: '/uploads/library/backdrop_photobooth_floral.glb',
    panjang: 260,
    lebar: 85,
    tinggi: 240,
    harga: 1800000,
    deskripsi: 'Backdrop photobooth panel ganda berbingkai emas lengkap dengan bangku foto dan rangkaian bunga.',
  },
  {
    nama_model: 'Lampu Gantung Kristal Chandelier',
    nama_dekorasi: 'Chandelier Kristal Emas 3D',
    kategori: 'Lighting',
    file_path: '/uploads/library/lampu_gantung_kristal.glb',
    panjang: 90,
    lebar: 90,
    tinggi: 120,
    harga: 2200000,
    deskripsi: 'Lampu gantung kristal 2 tingkat rangka emas untuk langit-langit venue atau tenda.',
  },
  {
    nama_model: 'Gazebo Akad Nikah',
    nama_dekorasi: 'Gazebo Akad Nikah 3D',
    kategori: 'Pelaminan',
    file_path: '/uploads/library/gazebo_akad_nikah.glb',
    panjang: 350,
    lebar: 350,
    tinggi: 300,
    harga: 6500000,
    deskripsi: 'Gazebo pavilion 4 pilar putih-emas dengan panggung marmer dan hiasan bunga sudut atas.',
  },
  {
    nama_model: 'Welcome Sign Kayu & Floral',
    nama_dekorasi: 'Welcome Sign Easel 3D',
    kategori: 'Aksesoris',
    file_path: '/uploads/library/welcome_sign_easel.glb',
    panjang: 75,
    lebar: 65,
    tinggi: 165,
    harga: 350000,
    deskripsi: 'Papan ucapan selamat datang berbingkai emas di atas tripod easel kayu dengan aksen bunga.',
  },
  {
    nama_model: 'Meja Akad Nikah VIP',
    nama_dekorasi: 'Meja Akad Nikah VIP 3D',
    kategori: 'Meja',
    file_path: '/uploads/library/meja_akad_nikah.glb',
    panjang: 200,
    lebar: 90,
    tinggi: 75,
    harga: 900000,
    deskripsi: 'Meja akad nikah putih-marmer beraksen list emas lengkap dengan rangkaian bunga memanjang.',
  },
];

async function run() {
  try {
    await sequelize.authenticate();

    for (const a of ASSETS) {
      const [lib, libCreated] = await Model3DLibrary.findOrCreate({
        where: { file_path: a.file_path },
        defaults: {
          nama_model: a.nama_model,
          kategori: a.kategori,
          file_path: a.file_path,
          thumbnail_path: null,
          panjang: a.panjang,
          lebar: a.lebar,
          tinggi: a.tinggi,
          sumber: 'WedSpace Master 3D Studio',
          license_name: 'CC-BY-4.0',
          license_url: 'https://creativecommons.org/licenses/by/4.0/',
          attribution_text: 'Aset master 3D dekorasi pernikahan WedSpace Studio',
          is_active: true,
        },
      });

      if (!libCreated) {
        await lib.update({
          nama_model: a.nama_model,
          kategori: a.kategori,
          panjang: a.panjang,
          lebar: a.lebar,
          tinggi: a.tinggi,
          is_active: true,
        });
      }

      const [dek, dekCreated] = await Decoration.findOrCreate({
        where: {
          nama_dekorasi: a.nama_dekorasi,
          created_by_user_id: null,
        },
        defaults: {
          nama_dekorasi: a.nama_dekorasi,
          kategori: a.kategori,
          harga: a.harga,
          panjang: a.panjang,
          lebar: a.lebar,
          tinggi: a.tinggi,
          deskripsi: a.deskripsi,
          visibility: 'public',
          is_active: true,
          model_3d_source: 'library',
          library_model_id: lib.id,
          model_3d: a.file_path,
          created_by_user_id: null,
        },
      });

      if (!dekCreated) {
        await dek.update({
          model_3d_source: 'library',
          library_model_id: lib.id,
          model_3d: a.file_path,
          is_active: true,
        });
      }

      console.log(`[SEED OK] ${a.nama_dekorasi} -> lib#${lib.id}, dek#${dek.id}`);
    }

    console.log(`\nSelesai! ${ASSETS.length} model 3D dekorasi pernikahan terdaftar di Model3DLibrary & Katalog Komunitas.`);
  } catch (err) {
    console.error('Gagal seed library 3D:', err);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

run();
