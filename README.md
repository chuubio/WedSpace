# WedSpace — Aplikasi Perancangan Venue Pernikahan

WedSpace adalah aplikasi perancangan venue pernikahan berbasis web yang dirancang untuk membantu Wedding Organizer (WO) dalam memodelkan dekorasi, menyusun layout venue, dan memperkirakan biaya dekorasi yang dibutuhkan.

Aplikasi ini dikembangkan untuk mendukung proses perancangan venue secara digital melalui katalog dekorasi, editor layout 2D, visualisasi 3D, estimasi biaya, serta rekomendasi dekorasi berbasis Artificial Intelligence (AI).

## Fitur Utama

- *Autentikasi Pengguna* : Login untuk Wedding Organizer dan Admin dengan hak akses sesuai peran.
- *Manajemen Proyek Venue* : Membuat, melihat, mengubah, dan menghapus proyek venue.
- *Katalog Dekorasi* : Menampilkan data dekorasi beserta kategori, harga, ukuran, dan informasi pendukung.
- *Manajemen Data Dekorasi* : Admin dapat menambahkan, melihat, mengubah, dan menghapus data dekorasi.
- *Perancangan Layout 2D* : Dirancang untuk menempatkan dekorasi dan mengatur posisi, rotasi, serta jumlahnya pada layout venue.
- *Visualisasi 3D* : Dirancang untuk menampilkan hasil rancangan 2D dalam bentuk visualisasi tiga dimensi.
- *Estimasi Biaya* : Menghitung perkiraan biaya berdasarkan harga dan jumlah dekorasi yang digunakan.
- *Rekomendasi Dekorasi Berbasis AI* : Dirancang untuk membantu WO menentukan pilihan dekorasi berdasarkan kebutuhan perancangan.

*Catatan: beberapa fitur masih dalam tahap pengembangan. Status implementasi terkini dijelaskan pada bagian Progres Pengembangan.*

## Teknologi yang Digunakan

### Frontend
- Vue 3
- JavaScript
- Vite
- Vue Router
- Pinia
- Tailwind CSS
- Font Awesome

### Backend
- Node.js
- Express.js
- Sequelize ORM versi 6
- MySQL
- JSON Web Token (JWT)
- bcrypt untuk hashing password
- Zod untuk validasi data
- Multer untuk penanganan upload file

### Lingkungan Pengembangan
- Visual Studio Code
- Laragon untuk menjalankan MySQL secara lokal
- Git dan GitHub untuk pengelolaan kode sumber

## Struktur Proyek
WedSpace/
├── README.md
├── .gitignore
├── erd-wedspace.erd.json
├── wedspace-api/
│   ├── src/
│   │   ├── config/
│   │   ├── models/
│   │   ├── routes/
│   │   └── middleware/
│   ├── .env.example
│   ├── package.json
│   └── seed.js
└── wedspace-web/
    ├── src/
    │   ├── assets/
    │   ├── components/
    │   ├── layouts/
    │   ├── router/
    │   ├── stores/
    │   └── views/
    ├── index.html
    └── package.json

Struktur di atas merupakan gambaran umum. Susunan file aktual dapat berkembang selama proses implementasi.

## Persiapan Lingkungan
Pastikan perangkat telah memiliki:
- Node.js dan npm.
- Laragon dengan layanan MySQL.
- Visual Studio Code.
- Browser modern.

## Cara Menjalankan Aplikasi

### 1. Siapkan Database
Jalankan MySQL melalui Laragon.
Buat database bernama `wedspace` apabila belum tersedia. Database dapat dibuat melalui aplikasi pengelola database yang terhubung ke MySQL Laragon.

### 2. Konfigurasi Backend
Buka terminal di folder `wedspace-api`:

```bash
cd wedspace-api
npm install
```

Salin file `.env.example` menjadi `.env`. Pada Windows PowerShell, jalankan:

```powershell
Copy-Item .env.example .env
```

Sesuaikan isi `.env` dengan konfigurasi MySQL lokal. Contoh:

```env
PORT=3000
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=wedspace
DB_USER=root
DB_PASS=
JWT_SECRET=isi_dengan_secret_acak_yang_aman
```

Password database dapat dikosongkan hanya jika akun MySQL lokal memang tidak menggunakan password. Ganti `JWT_SECRET` dengan string acak yang kuat dan jangan membagikan nilai aslinya.

Jalankan backend menggunakan:

```bash
npm run dev
```

Apabila koneksi berhasil, backend akan berjalan pada port 3000.

Untuk memeriksa endpoint dasar, buka:

`http://localhost:3000/api/ping`

Endpoint tersebut digunakan untuk memastikan API dapat memberikan respons.

### 3. Konfigurasi Frontend
Buka terminal baru di folder `wedspace-web`:

```bash
cd wedspace-web
npm install
npm run dev
```

Buka alamat yang ditampilkan Vite pada terminal, biasanya:

`http://localhost:5173`

Biarkan terminal backend dan frontend tetap berjalan saat aplikasi sedang diuji.

## Akun Pengujian
Setelah menjalankan proses seed, akun berikut dapat digunakan
untuk menguji fitur login WedSpace.

| Role  | Email                | Password      |
|-------|----------------------|---------------|
| Admin | admin@wedspace.test  | password123   |
| WO    | wo@wedspace.test     | password123   |

**Catatan:**
- Akun di atas hanya untuk pengujian lokal.
- Jalankan `node src/seed.js` dari folder `wedspace-api`
  untuk menambahkan data awal.
- Jika akun sudah ada sebelumnya, proses seed tidak otomatis
  mengubah password akun tersebut.
- Jangan gunakan kredensial pengujian ini untuk produksi.

## Paket Langganan (Free & Premium)

WedSpace memiliki paket penggunaan **Free** dan **Premium**, yang terpisah dari
kolom `role` pada tabel `users`.

- `role` (`wo` / `admin`) menentukan jenis pengguna.
- `subscription` (`free` / `premium`) menentukan paket penggunaan fitur.

### Paket Free

- Maksimal 2 proyek aktif.
- Layout 2D, visualisasi 3D, estimasi biaya, dan katalog dekorasi tetap tersedia.
- AI rekomendasi dekorasi: maksimal 3 rekomendasi per minggu untuk setiap proyek.
- Ekspor rancangan ke PDF belum tersedia.

### Paket Premium

- Proyek aktif tidak dibatasi.
- Layout 2D, visualisasi 3D, estimasi biaya, dan katalog dekorasi tersedia.
- AI rekomendasi dekorasi: 30 rekomendasi per minggu untuk setiap proyek.
- Ekspor rancangan ke PDF tersedia.

### Konfigurasi

Semua batas paket dikumpulkan di `wedspace-api/src/config/subscription.js`
dan dapat diubah melalui variabel environment (`.env`):

- `FREE_MAX_ACTIVE_PROJECTS` (default `2`)
- `FREE_AI_RECOMMENDATIONS_PER_WEEK` (default `3`)
- `PREMIUM_MAX_ACTIVE_PROJECTS` (default kosong = tanpa batas)
- `PREMIUM_AI_RECOMMENDATIONS_PER_WEEK` (default `30`)
- `PREMIUM_DURATION_DAYS` (default `30` untuk simulasi upgrade)

### Endpoint API Subscription

- `GET /api/subscription/me` — status paket user yang sedang login.
  Respons inti: `{ "plan": "free" | "premium" | "admin", "status": "active" | "expired" | "cancelled", "expires_at": "..." }`.

- `POST /api/subscription/activate` — **DEVELOPMENT / TESTING ONLY**.
  Simulasi aktivasi paket Premium tanpa payment gateway. Mengaktifkan Premium
  selama `hari` hari (default dari `PREMIUM_DURATION_DAYS`).

- `POST /api/subscription/reset` — **DEVELOPMENT / TESTING ONLY**.
  Simulasi pembatalan paket Premium dan kembali ke paket Free.

### Pembatasan Proyek Free

Pembuatan proyek baru (`POST /api/proyek`) dilakukan pengecekan batas di backend:

- Admin tidak dibatasi.
- Premium tidak dibatasi.
- Free dibatasi maksimal 2 proyek aktif; jika sudah mencapai batas, backend
  merespons `403` dengan pesan:
  `Anda telah mencapai batas 2 proyek aktif pada paket Free. Upgrade ke Premium untuk membuat lebih banyak proyek.`

### Kuota AI Rekomendasi

- `GET /api/rekomendasi/:projectId/kuota` — cek sisa kuota rekomendasi.
- `POST /api/rekomendasi/:projectId` — minta rekomendasi dekorasi (memakai 1 kuota).

## Struktur Data
WedSpace menggunakan MySQL sebagai database relasional dengan model utama yang mencakup:

- Pengguna
- Proyek venue
- Rancangan venue
- Data dekorasi
- Detail rancangan

Relasi antarmodel digunakan untuk menghubungkan pengguna dengan proyek, proyek dengan rancangan, serta rancangan dengan objek dekorasi yang digunakan.

## Progres Pengembangan
Status berikut menggambarkan progres pengembangan yang telah diperiksa, bukan pernyataan bahwa seluruh sistem sudah selesai.

| Bagian | Status |
|---|---|
| Fondasi proyek dan database | Selesai |
| Login dan autentikasi pengguna | Sudah diimplementasikan; masih ada penyempurnaan |
| CRUD data dekorasi Admin | Sudah diimplementasikan |
| Proyek venue dan katalog dekorasi | Sudah diimplementasikan |
| Editor layout 2D | Dalam pengembangan |
| Estimasi biaya | Backend tersedia; frontend dalam pengembangan |
| Visualisasi 3D | Belum selesai |
| Rekomendasi dekorasi berbasis AI | Sudah diimplementasikan (Gemini API + kuota Free/Premium) |
| Sistem paket langganan (Free/Premium) | Selesai (batas di backend) |
| Pengujian sistem menyeluruh | Belum selesai |

## Keamanan dan Konfigurasi
- File `.env` digunakan untuk menyimpan konfigurasi lokal dan tidak boleh diunggah ke repository.
- File `.env.example` menyediakan contoh variabel konfigurasi tanpa menyimpan secret asli.
- Folder `node_modules` tidak disertakan dalam repository karena dependency dapat dipasang kembali menggunakan npm.
- Password pengguna disimpan menggunakan mekanisme hashing.
- Akses halaman dan endpoint perlu disesuaikan dengan peran pengguna.

## Tujuan Pengembangan
WedSpace dikembangkan sebagai proyek perangkat lunak untuk membantu proses perancangan venue pernikahan secara digital. Pengembangan selanjutnya berfokus pada penyelesaian editor layout 2D, integrasi estimasi biaya, visualisasi 3D, rekomendasi dekorasi, dan pengujian sistem agar sesuai dengan kebutuhan yang telah dirancang dalam dokumen SRS dan SDD.