-- WedSpace Database Backup before Tahap 2 Migration
-- 2026-11-19T04:08:19.822Z

CREATE TABLE `decorations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nama_dekorasi` varchar(255) NOT NULL,
  `kategori` varchar(255) NOT NULL,
  `harga` int NOT NULL,
  `panjang` float NOT NULL,
  `lebar` float NOT NULL,
  `tinggi` float NOT NULL,
  `model_3d` varchar(255) DEFAULT NULL,
  `gambar` varchar(255) DEFAULT NULL,
  `deskripsi` text,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO decorations VALUES
(1, "Pelaminan Floral Minimal", "Pelaminan", 5000000, 400, 200, 250, NULL, NULL, "", 1, "2026-10-16T05:50:48.000Z", "2026-11-04T03:07:27.000Z"),
(2, "Pelaminan Klasik Emas", "Pelaminan", 9000000, 450, 220, 260, NULL, NULL, "Pelaminan klasik dengan ornamen emas.", 1, "2026-10-16T05:50:48.000Z", "2026-11-18T13:01:29.000Z"),
(3, "Meja Bundar 10 Orang", "Meja", 350000, 180, 180, 75, NULL, NULL, "Meja bundar untuk 10 tamu.", 1, "2026-10-16T05:50:48.000Z", "2026-10-16T05:50:48.000Z"),
(4, "Meja Persegi 6 Orang", "Meja", 250000, 150, 90, 75, NULL, NULL, "Meja persegi panjang untuk 6 tamu.", 1, "2026-10-16T05:50:48.000Z", "2026-10-16T05:50:48.000Z"),
(5, "Meja Prasmanan Panjang", "Meja", 600000, 300, 80, 90, NULL, NULL, "Meja prasmanan untuk katering.", 1, "2026-10-16T05:50:48.000Z", "2026-10-16T05:50:48.000Z"),
(6, "Kursi Tiffany Putih", "Kursi", 15000, 45, 45, 90, NULL, NULL, "Kursi tamu berwarna putih.", 1, "2026-10-16T05:50:48.000Z", "2026-10-16T05:50:48.000Z"),
(7, "Kursi Chiavari Emas", "Kursi", 25000, 45, 45, 92, NULL, NULL, "Kursi elegan berwarna emas.", 1, "2026-10-16T05:50:48.000Z", "2026-10-16T05:50:48.000Z"),
(8, "Standing Flower Peony", "Bunga", 450000, 50, 50, 140, NULL, NULL, "Rangkaian bunga peony berdiri.", 1, "2026-10-16T05:50:48.000Z", "2026-10-16T05:50:48.000Z"),
(9, "Buket Meja Mawar", "Bunga", 150000, 30, 30, 40, NULL, NULL, "Rangkaian mawar untuk meja tamu.", 1, "2026-10-16T05:50:48.000Z", "2026-10-16T05:50:48.000Z"),
(10, "Backdrop Photobooth", "Backdrop", 1200000, 200, 30, 250, NULL, NULL, "Backdrop untuk area foto tamu.", 1, "2026-10-16T05:50:48.000Z", "2026-10-16T05:50:48.000Z"),
(11, "Fairy Light Curtain", "Lighting", 800000, 300, 20, 250, NULL, NULL, "Tirai lampu kecil bernuansa hangat.", 1, "2026-10-16T05:50:48.000Z", "2026-10-16T05:50:48.000Z"),
(12, "Lampu Gantung Kristal", "Lighting", 2500000, 80, 80, 100, NULL, NULL, "Lampu gantung dekoratif.", 1, "2026-10-16T05:50:48.000Z", "2026-10-16T05:50:48.000Z"),
(14, "Kursi plastik Napolly", "Kursi", 50000, 53, 47, 88, NULL, NULL, "", 1, "2026-11-04T03:02:03.000Z", "2026-11-04T03:07:02.000Z");

CREATE TABLE `design_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `posisi_x` float NOT NULL DEFAULT '0',
  `posisi_y` float NOT NULL DEFAULT '0',
  `rotasi` float NOT NULL DEFAULT '0',
  `jumlah` int NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `design_id` int NOT NULL,
  `decoration_id` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `design_id` (`design_id`),
  KEY `decoration_id` (`decoration_id`),
  CONSTRAINT `design_items_ibfk_1` FOREIGN KEY (`design_id`) REFERENCES `venue_designs` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `design_items_ibfk_2` FOREIGN KEY (`decoration_id`) REFERENCES `decorations` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO design_items VALUES
(1, 1000, 170, 0, 1, "2026-10-16T05:50:48.000Z", "2026-10-16T05:50:48.000Z", 1, 1),
(2, 700, 500, 0, 6, "2026-10-16T05:50:48.000Z", "2026-10-16T05:50:48.000Z", 1, 3),
(3, 1000, 1100, 0, 60, "2026-10-16T05:50:48.000Z", "2026-10-16T05:50:48.000Z", 1, 6);

CREATE TABLE `recommendation_usages` (
  `id` int NOT NULL AUTO_INCREMENT,
  `plan` varchar(255) DEFAULT NULL,
  `dipakai_pada` datetime NOT NULL,
  `request_data` json DEFAULT NULL,
  `result_data` json DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `user_id` int NOT NULL,
  `project_id` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `project_id` (`project_id`),
  CONSTRAINT `recommendation_usages_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `recommendation_usages_ibfk_2` FOREIGN KEY (`project_id`) REFERENCES `venue_projects` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=28 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO recommendation_usages VALUES
(10, "premium", "2026-10-30T03:33:52.000Z", NULL, NULL, "2026-10-30T03:33:52.000Z", "2026-10-30T03:33:52.000Z", 2, 1),
(11, "premium", "2026-10-30T03:47:00.000Z", NULL, NULL, "2026-10-30T03:47:00.000Z", "2026-10-30T03:47:00.000Z", 2, 1),
(12, "premium", "2026-10-30T03:47:57.000Z", NULL, NULL, "2026-10-30T03:47:57.000Z", "2026-10-30T03:47:57.000Z", 2, 1),
(13, "premium", "2026-10-30T03:53:44.000Z", NULL, NULL, "2026-10-30T03:53:44.000Z", "2026-10-30T03:53:44.000Z", 2, 1),
(14, "premium", "2026-10-30T03:55:18.000Z", NULL, NULL, "2026-10-30T03:55:18.000Z", "2026-10-30T03:55:18.000Z", 2, 1),
(15, "premium", "2026-10-30T04:06:23.000Z", NULL, NULL, "2026-10-30T04:06:23.000Z", "2026-10-30T04:06:23.000Z", 2, 1),
(16, "premium", "2026-10-30T04:08:15.000Z", NULL, NULL, "2026-10-30T04:08:15.000Z", "2026-10-30T04:08:15.000Z", 2, 20),
(17, "premium", "2026-11-03T15:04:29.000Z", {"tema":"Minimalis","anggaran":100000000,"nama_venue":"Grand Ballroom Balikpapan","jumlah_tamu":500,"lebar_venue":50,"nama_proyek":"Pernikahan manda mandi","panjang_venue":50}, {"ringkasan":"Rekomendasi dekorasi ini disesuaikan dengan tema minimalis, kapasitas 500 tamu, serta ukuran venue Grand Ballroom Balikpapan 50x50 meter dengan tetap menjaga anggaran di bawah 100 juta rupiah.","rekomendasi":[{"harga":5000000,"alasan":"Sangat sesuai dengan tema Minimalis pilihan klien dan cocok untuk ukuran venue Grand Ballroom Balikpapan.","kategori":"Pelaminan","decoration_id":1,"nama_dekorasi":"Pelaminan Floral Minimal","jumlah_disarankan":1},{"harga":350000,"alasan":"Mampu menampung sebagian besar dari 500 tamu undangan dengan pengaturan tempat duduk yang rapi di venue berukuran 50x50 meter.","kategori":"Meja","decoration_id":3,"nama_dekorasi":"Meja Bundar 10 Orang","jumlah_disarankan":50},{"harga":15000,"alasan":"Kursi Tiffany Putih sangat mendukung tema minimalis dan senada dengan dekorasi pelaminan.","kategori":"Kursi","decoration_id":6,"nama_dekorasi":"Kursi Tiffany Putih","jumlah_disarankan":500},{"harga":450000,"alasan":"Standing Flower Peony memberikan kesan estetis yang elegan dan pas untuk mempercantik area pelaminan dan jalur masuk.","kategori":"Bunga","decoration_id":8,"nama_dekorasi":"Standing Flower Peony","jumlah_disarankan":4},{"harga":1200000,"alasan":"Backdrop Photobooth diperlukan untuk area foto tamu mengingat jumlah undangan mencapai 500 orang.","kategori":"Backdrop","decoration_id":10,"nama_dekorasi":"Backdrop Photobooth","jumlah_disarankan":1},{"harga":800000,"alasan":"Fairy Light Curtain memberikan pencahayaan hangat yang memperkuat nuansa minimalis modern di dalam ballroom.","kategori":"Lighting","decoration_id":11,"nama_dekorasi":"Fairy Light Curtain","jumlah_disarankan":2}]}, "2026-11-03T15:04:29.000Z", "2026-11-03T15:04:29.000Z", 2, 20),
(18, "premium", "2026-11-03T15:08:32.000Z", {"tema":"Minimalis","anggaran":100000000,"nama_venue":"Grand Ballroom Balikpapan","jumlah_tamu":500,"lebar_venue":50,"nama_proyek":"Pernikahan manda mandi","panjang_venue":50}, {"ringkasan":"Rekomendasi dekorasi difokuskan pada elemen minimalis yang bersih dengan perabotan yang efisien untuk menampung 500 tamu dalam venue luas, tetap menjaga anggaran tetap efisien.","rekomendasi":[{"harga":5000000,"alasan":"Pelaminan Floral Minimal sangat cocok dengan tema minimalis yang diinginkan untuk pernikahan 500 tamu.","kategori":"Pelaminan","decoration_id":1,"nama_dekorasi":"Pelaminan Floral Minimal","jumlah_disarankan":1},{"harga":350000,"alasan":"Meja Bundar 10 orang merupakan pilihan efisien untuk menampung 500 tamu di venue seluas 2500 meter persegi.","kategori":"Meja","decoration_id":3,"nama_dekorasi":"Meja Bundar 10 Orang","jumlah_disarankan":50},{"harga":15000,"alasan":"Kursi Tiffany Putih sangat sesuai dengan estetika minimalis dan memberikan kesan bersih pada dekorasi.","kategori":"Kursi","decoration_id":6,"nama_dekorasi":"Kursi Tiffany Putih","jumlah_disarankan":500},{"harga":450000,"alasan":"Standing Flower Peony memberikan aksen bunga yang manis tanpa terlihat berlebihan di venue luas.","kategori":"Bunga","decoration_id":8,"nama_dekorasi":"Standing Flower Peony","jumlah_disarankan":10},{"harga":800000,"alasan":"Fairy Light Curtain memberikan suasana hangat dan elegan yang cocok untuk melengkapi tema minimalis.","kategori":"Lighting","decoration_id":11,"nama_dekorasi":"Fairy Light Curtain","jumlah_disarankan":5}]}, "2026-11-03T15:08:32.000Z", "2026-11-03T15:08:32.000Z", 2, 20),
(19, "premium", "2026-11-03T15:16:08.000Z", {"tema":"Minimalis","anggaran":100000000,"nama_venue":"Grand Ballroom Balikpapan","jumlah_tamu":500,"lebar_venue":50,"nama_proyek":"Pernikahan manda mandi","panjang_venue":50}, {"ringkasan":"Rekomendasi dekorasi disusun berdasarkan tema Minimalis dan kapasitas 500 tamu untuk Grand Ballroom Balikpapan (50x50m) sesuai anggaran proyek.","rekomendasi":[{"harga":5000000,"alasan":"Sangat sesuai dengan tema pernikahan Minimalis dan menjadi titik fokus utama di venue Grand Ballroom yang luas.","kategori":"Pelaminan","decoration_id":1,"nama_dekorasi":"Pelaminan Floral Minimal","jumlah_disarankan":1},{"harga":350000,"alasan":"Menampung 500 tamu secara efisien dengan 50 meja bundar di venue berukuran 50x50 meter.","kategori":"Meja","decoration_id":3,"nama_dekorasi":"Meja Bundar 10 Orang","jumlah_disarankan":50},{"harga":15000,"alasan":"Kursi berwarna putih yang selaras dengan tema minimalis serta menyediakan tempat duduk untuk 500 tamu.","kategori":"Kursi","decoration_id":6,"nama_dekorasi":"Kursi Tiffany Putih","jumlah_disarankan":500},{"harga":600000,"alasan":"Memfasilitasi area katering dan prasmanan untuk alur pelayanan 500 tamu undangan.","kategori":"Meja","decoration_id":5,"nama_dekorasi":"Meja Prasmanan Panjang","jumlah_disarankan":6},{"harga":150000,"alasan":"Pemanis dekorasi meja tamu yang memberikan kesan elegan namun tetap simpel.","kategori":"Bunga","decoration_id":9,"nama_dekorasi":"Buket Meja Mawar","jumlah_disarankan":50},{"harga":450000,"alasan":"Mempercantik lorong jalan menuju pelaminan di ballroom yang luas.","kategori":"Bunga","decoration_id":8,"nama_dekorasi":"Standing Flower Peony","jumlah_disarankan":8},{"harga":1200000,"alasan":"Area foto komplementer yang menarik untuk dokumentasi tamu undangan.","kategori":"Backdrop","decoration_id":10,"nama_dekorasi":"Backdrop Photobooth","jumlah_disarankan":1},{"harga":800000,"alasan":"Pencahayaan tirai lampu yang memperkuat nuansa hangat dan estetis bernuansa minimalis.","kategori":"Lighting","decoration_id":11,"nama_dekorasi":"Fairy Light Curtain","jumlah_disarankan":4}]}, "2026-11-03T15:16:08.000Z", "2026-11-03T15:16:08.000Z", 2, 20),
(20, "premium", "2026-11-03T15:32:11.000Z", {"tema":"Rustic & Cottagecore","anggaran":500000000,"nama_venue":"Hotel apakah","jumlah_tamu":50,"lebar_venue":100,"nama_proyek":"Pernikahan Juan & Ella","panjang_venue":100}, {"ringkasan":"Rekomendasi difokuskan pada elemen dekorasi yang mengutamakan kenyamanan dan estetika hangat khas Rustic & Cottagecore, sangat sesuai dengan venue yang luas dan jumlah tamu yang intim.","rekomendasi":[{"harga":5000000,"alasan":"Desain minimalis sangat mendukung estetika tema Rustic & Cottagecore yang natural.","kategori":"Pelaminan","decoration_id":1,"nama_dekorasi":"Pelaminan Floral Minimal","jumlah_disarankan":1},{"harga":350000,"alasan":"Meja bundar kapasitas 10 orang efisien untuk 50 tamu, cocok untuk suasana akrab khas Cottagecore.","kategori":"Meja","decoration_id":3,"nama_dekorasi":"Meja Bundar 10 Orang","jumlah_disarankan":5},{"harga":15000,"alasan":"Kursi Tiffany putih memberikan kesan bersih dan rustic yang sesuai dengan tema.","kategori":"Kursi","decoration_id":6,"nama_dekorasi":"Kursi Tiffany Putih","jumlah_disarankan":50},{"harga":450000,"alasan":"Standing flower menambahkan elemen alami dan menyegarkan di area pelaminan atau lorong masuk.","kategori":"Bunga","decoration_id":8,"nama_dekorasi":"Standing Flower Peony","jumlah_disarankan":4},{"harga":150000,"alasan":"Buket meja mawar menambah detail manis di atas meja tamu sesuai tema Cottagecore.","kategori":"Bunga","decoration_id":9,"nama_dekorasi":"Buket Meja Mawar","jumlah_disarankan":5},{"harga":800000,"alasan":"Fairy light memberikan pencahayaan hangat yang esensial untuk menciptakan suasana magis dan intim.","kategori":"Lighting","decoration_id":11,"nama_dekorasi":"Fairy Light Curtain","jumlah_disarankan":3},{"harga":1200000,"alasan":"Backdrop photobooth memberikan area interaksi bagi tamu dengan estetika yang konsisten.","kategori":"Backdrop","decoration_id":10,"nama_dekorasi":"Backdrop Photobooth","jumlah_disarankan":1}]}, "2026-11-03T15:32:11.000Z", "2026-11-03T15:32:11.000Z", 2, 21),
(21, "premium", "2026-11-04T02:53:32.000Z", {"tema":"Rustic & Cottagecore","anggaran":500000000,"nama_venue":"Hotel apakah","jumlah_tamu":50,"lebar_venue":100,"nama_proyek":"Pernikahan Juan & Ella","panjang_venue":100}, {"ringkasan":"Rekomendasi dekorasi disesuaikan dengan tema Rustic & Cottagecore untuk 50 tamu undangan dengan mengutamakan aksen floral, pencahayaan hangat, dan kenyamanan penataan area venue.","rekomendasi":[{"harga":5000000,"alasan":"Pelaminan bernuansa floral sangat sesuai dengan tema Rustic & Cottagecore yang diusung.","kategori":"Pelaminan","decoration_id":1,"nama_dekorasi":"Pelaminan Floral Minimal","jumlah_disarankan":1},{"harga":350000,"alasan":"Dibutuhkan 5 meja bundar untuk mengakomodasi 50 tamu undangan (1 meja untuk 10 orang).","kategori":"Meja","decoration_id":3,"nama_dekorasi":"Meja Bundar 10 Orang","jumlah_disarankan":5},{"harga":15000,"alasan":"Kursi Tiffany Putih sangat pas mendampingi tema alami cottagecore untuk 50 tamu undangan.","kategori":"Kursi","decoration_id":6,"nama_dekorasi":"Kursi Tiffany Putih","jumlah_disarankan":50},{"harga":600000,"alasan":"Meja prasmanan panjang digunakan untuk penyajian area katering tamu.","kategori":"Meja","decoration_id":5,"nama_dekorasi":"Meja Prasmanan Panjang","jumlah_disarankan":2},{"harga":150000,"alasan":"Buket bunga meja diletakkan di setiap meja tamu untuk mempercantik suasana makan.","kategori":"Bunga","decoration_id":9,"nama_dekorasi":"Buket Meja Mawar","jumlah_disarankan":5},{"harga":450000,"alasan":"Standing flower penambah estetik di sepanjang jalan masuk (aisle) dan panggung pelaminan.","kategori":"Bunga","decoration_id":8,"nama_dekorasi":"Standing Flower Peony","jumlah_disarankan":4},{"harga":1200000,"alasan":"Backdrop photobooth disediakan sebagai area foto bernuansa rustic bagi para tamu.","kategori":"Backdrop","decoration_id":10,"nama_dekorasi":"Backdrop Photobooth","jumlah_disarankan":1},{"harga":800000,"alasan":"Tirai lampu fairy light memberikan pencahayaan hangat dan suasana hangat romantis khas cottagecore.","kategori":"Lighting","decoration_id":11,"nama_dekorasi":"Fairy Light Curtain","jumlah_disarankan":4}]}, "2026-11-04T02:53:32.000Z", "2026-11-04T02:53:32.000Z", 2, 21),
(22, "premium", "2026-11-04T04:28:12.000Z", {"tema":"Rustic Elegan","anggaran":900000000,"nama_venue":"Jeruk Bali","jumlah_tamu":100000,"lebar_venue":100,"nama_proyek":"Pernikahan Pasya dan Liz","panjang_venue":100}, {"ringkasan":"Rekomendasi dekorasi ini disesuaikan dengan tema Rustic Elegan untuk venue skala besar Jeruk Bali, memadukan elemen pencahayaan hangat, dekorasi bunga, serta area tempat duduk yang anggun untuk mendukung kenyamanan tamu dan keindahan visual acara.","rekomendasi":[{"harga":5000000,"alasan":"Pelaminan utama yang minimalis dan elegan, sangat cocok dengan tema Rustic Elegan untuk menjadi titik fokus venue.","kategori":"Pelaminan","decoration_id":1,"nama_dekorasi":"Pelaminan Floral Minimal","jumlah_disarankan":1},{"harga":25000,"alasan":"Kursi Chiavari Emas memberikan sentuhan elegan yang mewah dan sesuai untuk menyambut tamu dalam jumlah besar.","kategori":"Kursi","decoration_id":7,"nama_dekorasi":"Kursi Chiavari Emas","jumlah_disarankan":500},{"harga":350000,"alasan":"Meja bundar untuk menampung tamu secara elegan dan mempermudah alur interaksi di area venue yang luas.","kategori":"Meja","decoration_id":3,"nama_dekorasi":"Meja Bundar 10 Orang","jumlah_disarankan":50},{"harga":600000,"alasan":"Dibutuhkan untuk area katering prasmanan guna melayani kapasitas tamu yang sangat banyak.","kategori":"Meja","decoration_id":5,"nama_dekorasi":"Meja Prasmanan Panjang","jumlah_disarankan":10},{"harga":450000,"alasan":"Standing flower penambah nuansa hangat dan dekoratif pada lorong atau sekitar pelaminan sesuai tema rustic.","kategori":"Bunga","decoration_id":8,"nama_dekorasi":"Standing Flower Peony","jumlah_disarankan":12},{"harga":1200000,"alasan":"Sebagai spot foto tamu yang estetik dan selaras dengan dekorasi acara.","kategori":"Backdrop","decoration_id":10,"nama_dekorasi":"Backdrop Photobooth","jumlah_disarankan":2},{"harga":800000,"alasan":"Fairy light curtain memberikan efek pencahayaan hangat khas tema rustic di venue seluas 100x100 meter.","kategori":"Lighting","decoration_id":11,"nama_dekorasi":"Fairy Light Curtain","jumlah_disarankan":15},{"harga":2500000,"alasan":"Lampu gantung kristal memperkuat kesan elegan di dalam venue.","kategori":"Lighting","decoration_id":12,"nama_dekorasi":"Lampu Gantung Kristal","jumlah_disarankan":8}]}, "2026-11-04T04:28:12.000Z", "2026-11-04T04:28:12.000Z", 2, 22),
(23, "premium", "2026-11-04T05:14:18.000Z", {"tema":"Rustic Elegan","anggaran":900000000,"nama_venue":"Jeruk Bali","jumlah_tamu":100000,"lebar_venue":100,"nama_proyek":"Pernikahan Pasya dan Liz","panjang_venue":10002}, {"ringkasan":"Rekomendasi pilihan dekorasi yang disesuaikan dengan tema Rustic Elegan untuk menciptakan suasana pernikahan yang hangat, menawan, dan memuat kapasitas area venue secara maksimal.","rekomendasi":[{"harga":5000000,"alasan":"Pelaminan utama bernuansa floral yang sangat cocok disesuaikan dengan konsep Rustic Elegan.","kategori":"Pelaminan","decoration_id":1,"nama_dekorasi":"Pelaminan Floral Minimal","jumlah_disarankan":1},{"harga":800000,"alasan":"Tirai lampu hangat yang sangat menguatkan nuansa romantis dan estetik khas tema Rustic Elegan.","kategori":"Lighting","decoration_id":11,"nama_dekorasi":"Fairy Light Curtain","jumlah_disarankan":10},{"harga":25000,"alasan":"Kursi Chiavari Emas memberikan sentuhan elegan yang mewah pada penataan tempat duduk tamu.","kategori":"Kursi","decoration_id":7,"nama_dekorasi":"Kursi Chiavari Emas","jumlah_disarankan":500},{"harga":350000,"alasan":"Meja bundar yang fleksibel untuk menciptakan penataan area santap yang rapi dan elegan.","kategori":"Meja","decoration_id":3,"nama_dekorasi":"Meja Bundar 10 Orang","jumlah_disarankan":50},{"harga":1200000,"alasan":"Area foto bagi para tamu undangan untuk mengabadikan momen pernikahan.","kategori":"Backdrop","decoration_id":10,"nama_dekorasi":"Backdrop Photobooth","jumlah_disarankan":2},{"harga":450000,"alasan":"Standing flower untuk mempercantik area jalan karpet merah menuju pelaminan.","kategori":"Bunga","decoration_id":8,"nama_dekorasi":"Standing Flower Peony","jumlah_disarankan":10}]}, "2026-11-04T05:14:18.000Z", "2026-11-04T05:14:18.000Z", 2, 22),
(24, "premium", "2026-11-18T06:06:15.000Z", {"tema":"Rustic Elegan","anggaran":900000000,"nama_venue":"Jeruk Bali","jumlah_tamu":100000,"lebar_venue":100,"nama_proyek":"Pernikahan Pasya dan Liz","panjang_venue":10002}, {"ringkasan":"Rekomendasi dekorasi dipilih khusus untuk mendukung tema Rustic Elegan dengan menggabungkan elemen pencahayaan hangat, sentuhan floral, serta furnitur berkesan mewah yang sesuai dengan kapasitas dan anggaran proyek.","rekomendasi":[{"harga":5000000,"alasan":"Pelaminan floral minimal sangat cocok sebagai titik fokus utama yang memperkuat tema Rustic Elegan pada venue.","kategori":"Pelaminan","decoration_id":1,"nama_dekorasi":"Pelaminan Floral Minimal","jumlah_disarankan":1},{"harga":800000,"alasan":"Tirai lampu hangat memberikan sentuhan khas nuansa rustic dan suasana yang romantis di dalam venue.","kategori":"Lighting","decoration_id":11,"nama_dekorasi":"Fairy Light Curtain","jumlah_disarankan":10},{"harga":25000,"alasan":"Kursi Chiavari berwarna emas memberikan kesan mewah dan elegan untuk kenyamanan para tamu.","kategori":"Kursi","decoration_id":7,"nama_dekorasi":"Kursi Chiavari Emas","jumlah_disarankan":100},{"harga":350000,"alasan":"Meja bundar sangat ideal dipadukan dengan kursi elegan untuk tempat berkumpul tamu undangan.","kategori":"Meja","decoration_id":3,"nama_dekorasi":"Meja Bundar 10 Orang","jumlah_disarankan":10},{"harga":450000,"alasan":"Standing flower dapat ditempatkan di sepanjang jalan lorong menuju pelaminan untuk mempercantik dekorasi.","kategori":"Bunga","decoration_id":8,"nama_dekorasi":"Standing Flower Peony","jumlah_disarankan":6},{"harga":1200000,"alasan":"Menyediakan area dokumentasi foto yang estetis dan selaras dengan tema acara bagi para tamu.","kategori":"Backdrop","decoration_id":10,"nama_dekorasi":"Backdrop Photobooth","jumlah_disarankan":1}]}, "2026-11-18T06:06:15.000Z", "2026-11-18T06:06:15.000Z", 2, 22),
(25, "premium", "2026-11-18T12:32:26.000Z", {"tema":"Rustic Elegan","anggaran":900000000,"nama_venue":"Jeruk Bali","jumlah_tamu":100000,"lebar_venue":100,"nama_proyek":"Pernikahan Pasya dan Liz","panjang_venue":10002}, {"ringkasan":"Rekomendasi dekorasi ini disesuaikan dengan tema Rustic Elegan untuk pernikahan Pasya dan Liz, memaksimalkan estetika venue dan kenyamanan tamu sesuai dengan kapasitas anggaran yang tersedia.","rekomendasi":[{"harga":5000000,"alasan":"Sangat cocok sebagai pusat perhatian pelaminan dengan konsep floral yang mendukung tema Rustic Elegan.","kategori":"Pelaminan","decoration_id":1,"nama_dekorasi":"Pelaminan Floral Minimal","jumlah_disarankan":1},{"harga":350000,"alasan":"Meja bundar memberikan kesan rapi dan elegan untuk menampung tamu undangan.","kategori":"Meja","decoration_id":3,"nama_dekorasi":"Meja Bundar 10 Orang","jumlah_disarankan":50},{"harga":600000,"alasan":"Meja prasmanan panjang untuk kebutuhan penyajian katering di area venue yang luas.","kategori":"Meja","decoration_id":5,"nama_dekorasi":"Meja Prasmanan Panjang","jumlah_disarankan":10},{"harga":25000,"alasan":"Kursi Chiavari berwarna emas memberikan sentuhan elegan yang kuat dan cocok dengan tema pernikahan.","kategori":"Kursi","decoration_id":7,"nama_dekorasi":"Kursi Chiavari Emas","jumlah_disarankan":500},{"harga":450000,"alasan":"Standing flower peony menambah keindahan lorong menuju pelaminan dan sudut venue.","kategori":"Bunga","decoration_id":8,"nama_dekorasi":"Standing Flower Peony","jumlah_disarankan":12},{"harga":1200000,"alasan":"Backdrop photobooth sebagai area foto tamu dengan nuansa yang selaras.","kategori":"Backdrop","decoration_id":10,"nama_dekorasi":"Backdrop Photobooth","jumlah_disarankan":2},{"harga":800000,"alasan":"Tirai lampu fairy light memberikan nuansa hangat khas rustic di malam hari atau area indoor.","kategori":"Lighting","decoration_id":11,"nama_dekorasi":"Fairy Light Curtain","jumlah_disarankan":15},{"harga":2500000,"alasan":"Lampu gantung kristal menambah elemen kemewahan dan pencahayaan elegan di area utama.","kategori":"Lighting","decoration_id":12,"nama_dekorasi":"Lampu Gantung Kristal","jumlah_disarankan":6}]}, "2026-11-18T12:32:26.000Z", "2026-11-18T12:32:26.000Z", 2, 22),
(26, "premium", "2026-11-19T02:20:02.000Z", {"tema":"Rustic Elegan","anggaran":900000000,"nama_venue":"Jeruk Bali","jumlah_tamu":100000,"lebar_venue":100,"nama_proyek":"Pernikahan Pasya dan Liz","panjang_venue":10002}, {"ringkasan":"Rekomendasi dekorasi ini berfokus pada kemewahan dan efisiensi ruang untuk mengakomodasi 100.000 tamu di venue besar dengan tetap menjaga estetika tema Rustic Elegan.","rekomendasi":[{"harga":9000000,"alasan":"Pelaminan Klasik Emas memberikan sentuhan mewah dan elegan yang sangat sesuai dengan tema Rustic Elegan untuk acara skala besar.","kategori":"Pelaminan","decoration_id":2,"nama_dekorasi":"Pelaminan Klasik Emas","jumlah_disarankan":1},{"harga":350000,"alasan":"Meja bundar untuk 10 orang sangat efisien bagi jumlah tamu 100.000 orang dengan kapasitas venue yang luas.","kategori":"Meja","decoration_id":3,"nama_dekorasi":"Meja Bundar 10 Orang","jumlah_disarankan":10000},{"harga":25000,"alasan":"Kursi Chiavari Emas mendukung estetika tema Rustic Elegan agar terlihat lebih premium dibanding kursi standar.","kategori":"Kursi","decoration_id":7,"nama_dekorasi":"Kursi Chiavari Emas","jumlah_disarankan":100000},{"harga":800000,"alasan":"Fairy Light Curtain memberikan pencahayaan hangat yang sangat esensial untuk membangun suasana romantis pada pernikahan dengan tema rustic.","kategori":"Lighting","decoration_id":11,"nama_dekorasi":"Fairy Light Curtain","jumlah_disarankan":50},{"harga":450000,"alasan":"Standing Flower Peony akan mempercantik lorong dan area pelaminan agar terlihat lebih hidup dan estetik.","kategori":"Bunga","decoration_id":8,"nama_dekorasi":"Standing Flower Peony","jumlah_disarankan":100}]}, "2026-11-19T02:20:02.000Z", "2026-11-19T02:20:02.000Z", 2, 22),
(27, "premium", "2026-11-19T03:08:37.000Z", {"tema":"Rustic Elegan","anggaran":900000000,"nama_venue":"Jeruk Bali","jumlah_tamu":100000,"lebar_venue":100,"nama_proyek":"Pernikahan Pasya dan Liz","panjang_venue":10002}, {"ringkasan":"Rekomendasi dekorasi difokuskan pada pemenuhan kebutuhan kapasitas 100.000 tamu dengan sentuhan elegan dan rustic menggunakan kursi Chiavari, meja bundar, serta elemen pencahayaan yang hangat.","rekomendasi":[{"harga":9000000,"alasan":"Pelaminan Klasik Emas memberikan sentuhan mewah dan elegan yang sangat sesuai dengan tema Rustic Elegan untuk pernikahan skala besar.","kategori":"Pelaminan","decoration_id":2,"nama_dekorasi":"Pelaminan Klasik Emas","jumlah_disarankan":5},{"harga":350000,"alasan":"Meja bundar untuk 10 orang sangat efisien untuk mengakomodasi jumlah tamu yang sangat besar (100.000 tamu) di venue yang luas.","kategori":"Meja","decoration_id":3,"nama_dekorasi":"Meja Bundar 10 Orang","jumlah_disarankan":10000},{"harga":25000,"alasan":"Kursi Chiavari Emas melengkapi estetika tema elegan dan memberikan kenyamanan bagi tamu.","kategori":"Kursi","decoration_id":7,"nama_dekorasi":"Kursi Chiavari Emas","jumlah_disarankan":100000},{"harga":800000,"alasan":"Fairy Light Curtain memberikan atmosfer hangat dan rustic yang khas untuk venue berukuran luas.","kategori":"Lighting","decoration_id":11,"nama_dekorasi":"Fairy Light Curtain","jumlah_disarankan":200},{"harga":450000,"alasan":"Standing Flower Peony memberikan aksen dekoratif bunga yang memperkuat kesan rustic pada area utama.","kategori":"Bunga","decoration_id":8,"nama_dekorasi":"Standing Flower Peony","jumlah_disarankan":50}]}, "2026-11-19T03:08:37.000Z", "2026-11-19T03:08:37.000Z", 2, 22);

CREATE TABLE `subscriptions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `plan` enum('free','premium') NOT NULL DEFAULT 'free',
  `status` enum('active','expired','cancelled') NOT NULL DEFAULT 'active',
  `started_at` datetime DEFAULT NULL,
  `expires_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `user_id` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `subscriptions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO subscriptions VALUES
(2, "premium", "active", "2026-10-30T03:14:57.000Z", "2026-11-29T03:14:57.000Z", "2026-10-30T03:14:07.000Z", "2026-10-30T03:14:57.000Z", 2);

CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nama` varchar(255) NOT NULL,
  `username_email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('wo','admin') NOT NULL DEFAULT 'wo',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `foto_profil` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username_email` (`username_email`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO users VALUES
(1, "Admin WedSpace", "admin@wedspace.test", "$2b$10$s2B2j.d16V.kOLbd41RtYO7He3bLV8pr9Euep6/VzwDYjxwB9g3ZO", "admin", "2026-10-16T05:50:48.000Z", "2026-11-18T13:02:33.000Z", "/uploads/profil/1795006953362-500934635.png"),
(2, "Ella", "wo@wedspace.test", "$2b$10$s2B2j.d16V.kOLbd41RtYO7He3bLV8pr9Euep6/VzwDYjxwB9g3ZO", "wo", "2026-10-16T05:50:48.000Z", "2026-11-04T02:56:13.000Z", "/uploads/profil/1793760973835-629725069.jpg");

CREATE TABLE `venue_designs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nama_rancangan` varchar(255) NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `project_id` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `project_id` (`project_id`),
  CONSTRAINT `venue_designs_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `venue_projects` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO venue_designs VALUES
(1, "Rancangan 1", "2026-10-16T05:50:48.000Z", "2026-10-16T05:50:48.000Z", 1),
(20, "Rancangan 1", "2026-10-30T04:08:10.000Z", "2026-10-30T04:08:10.000Z", 20),
(21, "Rancangan 1", "2026-11-03T15:31:57.000Z", "2026-11-03T15:31:57.000Z", 21),
(22, "Rancangan 1", "2026-11-04T04:27:31.000Z", "2026-11-04T04:27:31.000Z", 22);

CREATE TABLE `venue_projects` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nama_proyek` varchar(255) NOT NULL,
  `nama_venue` varchar(255) NOT NULL,
  `panjang_venue` float NOT NULL,
  `lebar_venue` float NOT NULL,
  `jumlah_tamu` int DEFAULT NULL,
  `tema` varchar(255) DEFAULT NULL,
  `anggaran` int DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `user_id` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `venue_projects_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO venue_projects VALUES
(1, "Pernikahan Bila & Fitur", "Grand Ballroom Balikpapan", 20, 12, 300, "Rustic Elegan", 50000000, "2026-10-16T05:50:48.000Z", "2026-10-16T12:51:12.000Z", 2),
(20, "Pernikahan Manda dan Shinyu", "Grand Ballroom Balikpapan", 50, 50, 500000000, "Minimalis", 100000000, "2026-10-30T04:08:10.000Z", "2026-11-18T12:38:08.000Z", 2),
(21, "Pernikahan Juan & Ella", "Hotel apakah", 100, 100, 50, "Rustic & Cottagecore", 500000000, "2026-11-03T15:31:57.000Z", "2026-11-03T15:31:57.000Z", 2),
(22, "Pernikahan Pasya dan Liz", "Jeruk Bali", 10002, 100, 100000, "Rustic Elegan", 900000000, "2026-11-04T04:27:31.000Z", "2026-11-04T05:04:26.000Z", 2);

