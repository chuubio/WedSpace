# WedSpace Web

Frontend WedSpace merupakan bagian dari aplikasi berbasis web untuk membantu Wedding Organizer (WO) merancang layout venue pernikahan, melihat visualisasi dekorasi, dan memperkirakan biaya rancangan.

## Teknologi

- Vue 3
- Vite
- Vue Router
- Pinia
- Tailwind CSS
- JavaScript

## Persiapan

Pastikan Node.js dan npm sudah terpasang di komputer.

## Instalasi

Jalankan perintah berikut dari folder `wedspace-web`:

```bash
npm install
```

## Menjalankan Frontend

Jalankan aplikasi dalam mode pengembangan:

```bash
npm run dev
```

Setelah server berjalan, buka alamat yang ditampilkan di terminal. Secara default, Vite biasanya menggunakan:

`http://localhost:5173`

## Build untuk Produksi

Untuk membuat hasil build aplikasi, jalankan:

```bash
npm run build
```

Hasil build akan dibuat di folder `dist`.

## Menjalankan Backend

Untuk menggunakan fitur yang membutuhkan API dan database, backend WedSpace juga harus dijalankan. Pastikan MySQL aktif dan backend sudah dikonfigurasi sesuai file `.env` di folder `wedspace-api`.

## Catatan Pengembangan

Frontend WedSpace masih dalam tahap pengembangan. Fitur dan halaman dapat berubah mengikuti proses implementasi dan pengujian aplikasi.
