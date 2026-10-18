require('dotenv').config();

const bcrypt = require('bcrypt');

const {
  sequelize,
  User,
  Project,
  Design,
  Decoration,
  DesignItem,
} = require('./models');

const dataDekorasi = [
  {
    nama_dekorasi: 'Pelaminan Floral Minimal',
    kategori: 'Pelaminan',
    harga: 5000000,
    panjang: 400,
    lebar: 200,
    tinggi: 250,
    deskripsi: 'Pelaminan dengan rangkaian bunga bernuansa lembut.',
  },
  {
    nama_dekorasi: 'Pelaminan Klasik Emas',
    kategori: 'Pelaminan',
    harga: 9000000,
    panjang: 450,
    lebar: 220,
    tinggi: 260,
    deskripsi: 'Pelaminan klasik dengan ornamen emas.',
  },
  {
    nama_dekorasi: 'Meja Bundar 10 Orang',
    kategori: 'Meja',
    harga: 350000,
    panjang: 180,
    lebar: 180,
    tinggi: 75,
    deskripsi: 'Meja bundar untuk 10 tamu.',
  },
  {
    nama_dekorasi: 'Meja Persegi 6 Orang',
    kategori: 'Meja',
    harga: 250000,
    panjang: 150,
    lebar: 90,
    tinggi: 75,
    deskripsi: 'Meja persegi panjang untuk 6 tamu.',
  },
  {
    nama_dekorasi: 'Meja Prasmanan Panjang',
    kategori: 'Meja',
    harga: 600000,
    panjang: 300,
    lebar: 80,
    tinggi: 90,
    deskripsi: 'Meja prasmanan untuk katering.',
  },
  {
    nama_dekorasi: 'Kursi Tiffany Putih',
    kategori: 'Kursi',
    harga: 15000,
    panjang: 45,
    lebar: 45,
    tinggi: 90,
    deskripsi: 'Kursi tamu berwarna putih.',
  },
  {
    nama_dekorasi: 'Kursi Chiavari Emas',
    kategori: 'Kursi',
    harga: 25000,
    panjang: 45,
    lebar: 45,
    tinggi: 92,
    deskripsi: 'Kursi elegan berwarna emas.',
  },
  {
    nama_dekorasi: 'Standing Flower Peony',
    kategori: 'Bunga',
    harga: 450000,
    panjang: 50,
    lebar: 50,
    tinggi: 140,
    deskripsi: 'Rangkaian bunga peony berdiri.',
  },
  {
    nama_dekorasi: 'Buket Meja Mawar',
    kategori: 'Bunga',
    harga: 150000,
    panjang: 30,
    lebar: 30,
    tinggi: 40,
    deskripsi: 'Rangkaian mawar untuk meja tamu.',
  },
  {
    nama_dekorasi: 'Backdrop Photobooth',
    kategori: 'Backdrop',
    harga: 1200000,
    panjang: 200,
    lebar: 30,
    tinggi: 250,
    deskripsi: 'Backdrop untuk area foto tamu.',
  },
  {
    nama_dekorasi: 'Fairy Light Curtain',
    kategori: 'Lighting',
    harga: 800000,
    panjang: 300,
    lebar: 20,
    tinggi: 250,
    deskripsi: 'Tirai lampu kecil bernuansa hangat.',
  },
  {
    nama_dekorasi: 'Lampu Gantung Kristal',
    kategori: 'Lighting',
    harga: 2500000,
    panjang: 80,
    lebar: 80,
    tinggi: 100,
    deskripsi: 'Lampu gantung dekoratif.',
  },
];

async function seed() {
  try {
    await sequelize.authenticate();

    // Membuat tabel yang belum tersedia tanpa menghapus tabel lama.
    await sequelize.sync();

    const hash = await bcrypt.hash('password123', 10);

    // Membuat akun admin jika belum tersedia.
    const [admin] = await User.findOrCreate({
      where: {
        username_email: 'admin@wedspace.test',
      },
      defaults: {
        nama: 'Admin WedSpace',
        username_email: 'admin@wedspace.test',
        password: hash,
        role: 'admin',
      },
    });

    // Membuat akun WO jika belum tersedia.
    const [wo] = await User.findOrCreate({
      where: {
        username_email: 'wo@wedspace.test',
      },
      defaults: {
        nama: 'Ella',
        username_email: 'wo@wedspace.test',
        password: hash,
        role: 'wo',
      },
    });

    // Menambahkan dekorasi yang belum tersedia.
    const dekorasiByName = new Map();

    for (const data of dataDekorasi) {
      const [dekorasi] = await Decoration.findOrCreate({
        where: {
          nama_dekorasi: data.nama_dekorasi,
        },
        defaults: data,
      });

      dekorasiByName.set(dekorasi.nama_dekorasi, dekorasi);
    }

    // Membuat proyek contoh jika belum tersedia.
    const [proyek] = await Project.findOrCreate({
      where: {
        user_id: wo.id,
        nama_proyek: 'Pernikahan Rina & Dimas',
      },
      defaults: {
        user_id: wo.id,
        nama_proyek: 'Pernikahan Rina & Dimas',
        nama_venue: 'Grand Ballroom Balikpapan',
        panjang_venue: 20,
        lebar_venue: 12,
        jumlah_tamu: 300,
        tema: 'Rustic Elegan',
        anggaran: 50000000,
      },
    });

    // Membuat rancangan contoh jika belum tersedia.
    const [rancangan] = await Design.findOrCreate({
      where: {
        project_id: proyek.id,
        nama_rancangan: 'Rancangan 1',
      },
      defaults: {
        project_id: proyek.id,
        nama_rancangan: 'Rancangan 1',
      },
    });

    const itemContoh = [
      {
        nama: 'Pelaminan Floral Minimal',
        posisi_x: 1000,
        posisi_y: 170,
        rotasi: 0,
        jumlah: 1,
      },
      {
        nama: 'Meja Bundar 10 Orang',
        posisi_x: 700,
        posisi_y: 500,
        rotasi: 0,
        jumlah: 6,
      },
      {
        nama: 'Kursi Tiffany Putih',
        posisi_x: 1000,
        posisi_y: 1100,
        rotasi: 0,
        jumlah: 60,
      },
    ];

    // Menambahkan item contoh hanya jika dekorasinya belum
    // tercatat pada rancangan contoh tersebut.
    for (const item of itemContoh) {
      const dekorasi = dekorasiByName.get(item.nama);

      if (!dekorasi) {
        throw new Error(`Dekorasi tidak ditemukan: ${item.nama}`);
      }

      const dataItem = {
        design_id: rancangan.id,
        decoration_id: dekorasi.id,
        posisi_x: item.posisi_x,
        posisi_y: item.posisi_y,
        rotasi: item.rotasi,
        jumlah: item.jumlah,
      };

      await DesignItem.findOrCreate({
        where: {
          design_id: rancangan.id,
          decoration_id: dekorasi.id,
        },
        defaults: dataItem,
      });
    }

    console.log('Seed selesai.');
    console.log('Admin:', admin.username_email);
    console.log('WO:', wo.username_email);
    console.log('Password awal: password123');
    console.log(
      'Data awal sudah diperiksa dan ditambahkan jika belum tersedia.'
    );
  } catch (error) {
    console.error('Seed gagal:', error.message);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

seed();