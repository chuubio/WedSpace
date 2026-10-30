
const PAKET = {
  FREE: 'free',
  PREMIUM: 'premium',
  ADMIN: 'admin',
};

const STATUS_LANGGANAN = {
  ACTIVE: 'active',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled',
};

function angka(nilai, cadangan) {
  const n = Number(nilai);
  return Number.isFinite(n) && n > 0 ? n : cadangan;
}

const BATAS_PAKET = {
  [PAKET.FREE]: {
    maks_proyek_aktif: angka(process.env.FREE_MAX_ACTIVE_PROJECTS, 2),
    kuota_rekomendasi_per_minggu: angka(process.env.FREE_AI_RECOMMENDATIONS_PER_WEEK, 3),
    ekspor_pdf: false,
  },
  [PAKET.PREMIUM]: {
    maks_proyek_aktif: angka(process.env.PREMIUM_MAX_ACTIVE_PROJECTS, null),
    kuota_rekomendasi_per_minggu: angka(process.env.PREMIUM_AI_RECOMMENDATIONS_PER_WEEK, 30),
    ekspor_pdf: true,
  },
  [PAKET.ADMIN]: {
    maks_proyek_aktif: null,
    kuota_rekomendasi_per_minggu: null,
    ekspor_pdf: true,
  },
};

const DURASI_PREMIUM_HARI = angka(process.env.PREMIUM_DURATION_DAYS, 30);

const JENDELA_KUOTA_REKOMENDASI_HARI = 7;

function batasPaket(plan) {
  return BATAS_PAKET[plan] || BATAS_PAKET[PAKET.FREE];
}

function pesanBatasProyek(maks) {
  return `Anda telah mencapai batas ${maks} proyek aktif pada paket Free. Upgrade ke Premium untuk membuat lebih banyak proyek.`;
}

function pesanKuotaRekomendasi(kuota, plan) {
  const label = plan === PAKET.FREE ? 'Free' : 'Premium';
  return `Kuota rekomendasi AI paket ${label} sudah habis (${kuota} rekomendasi per minggu untuk setiap proyek). Upgrade ke Premium untuk kuota lebih besar.`;
}

module.exports = {
  PAKET,
  STATUS_LANGGANAN,
  BATAS_PAKET,
  DURASI_PREMIUM_HARI,
  JENDELA_KUOTA_REKOMENDASI_HARI,
  batasPaket,
  pesanBatasProyek,
  pesanKuotaRekomendasi,
};
