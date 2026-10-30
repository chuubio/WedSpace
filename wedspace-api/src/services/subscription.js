
const { Op } = require('sequelize');
const { User, Subscription, Project, RecommendationUsage } = require('../models');
const {
  PAKET,
  STATUS_LANGGANAN,
  BATAS_PAKET,
  JENDELA_KUOTA_REKOMENDASI_HARI,
  batasPaket,
  pesanBatasProyek,
  pesanKuotaRekomendasi,
} = require('../config/subscription');

const SEHARI_MS = 24 * 60 * 60 * 1000;

async function tandaiKedaluwarsa(userId) {
  await Subscription.update(
    { status: STATUS_LANGGANAN.EXPIRED },
    {
      where: {
        user_id: userId,
        plan: PAKET.PREMIUM,
        status: STATUS_LANGGANAN.ACTIVE,
        expires_at: { [Op.lte]: new Date() },
      },
    },
  );
}

async function ambilLanggananPremiumAktif(userId) {
  return Subscription.findOne({
    where: {
      user_id: userId,
      plan: PAKET.PREMIUM,
      status: STATUS_LANGGANAN.ACTIVE,
      [Op.or]: [{ expires_at: null }, { expires_at: { [Op.gt]: new Date() } }],
    },
    order: [['expires_at', 'DESC'], ['id', 'DESC']],
  });
}

async function getUserPlan(userId) {
  const user = await User.findByPk(userId, { attributes: ['id', 'role'] });
  if (!user) return null;
  if (user.role === 'admin') return PAKET.ADMIN;

  await tandaiKedaluwarsa(userId);
  const langganan = await ambilLanggananPremiumAktif(userId);
  return langganan ? PAKET.PREMIUM : PAKET.FREE;
}

async function hitungProyekAktif(userId) {
  return Project.count({ where: { user_id: userId } });
}

async function cekBatasProyek(userId) {
  const plan = await getUserPlan(userId);
  if (!plan) return { boleh: false, plan: null, pesan: 'Akun tidak ditemukan.' };

  const batas = batasPaket(plan);
  const maks = batas.maks_proyek_aktif;
  const terpakai = await hitungProyekAktif(userId);
  const boleh = maks === null || terpakai < maks;

  return {
    boleh,
    plan,
    maks,
    terpakai,
    sisa: maks === null ? null : Math.max(maks - terpakai, 0),
    pesan: boleh ? null : pesanBatasProyek(maks),
  };
}

function awalMingguBerjalan() {
  const sekarang = new Date();
  const hariSejakSenin = (sekarang.getDay() + 6) % 7; // Senin = 0, Minggu = 6
  return new Date(sekarang.getFullYear(), sekarang.getMonth(), sekarang.getDate() - hariSejakSenin);
}

function batasWaktuMinggu() {
  const mulai = awalMingguBerjalan();
  const akhir = new Date(mulai.getFullYear(), mulai.getMonth(), mulai.getDate() + JENDELA_KUOTA_REKOMENDASI_HARI);
  return { mulai, akhir };
}

async function hitungPemakaianRekomendasi(projectId) {
  const { mulai, akhir } = batasWaktuMinggu();
  return RecommendationUsage.count({
    where: { project_id: projectId, createdAt: { [Op.gte]: mulai, [Op.lt]: akhir } },
  });
}

async function hitungPemakaianRekomendasiUser(userId) {
  const { mulai, akhir } = batasWaktuMinggu();
  return RecommendationUsage.count({
    where: { user_id: userId, createdAt: { [Op.gte]: mulai, [Op.lt]: akhir } },
  });
}

async function cekKuotaRekomendasi(userId, projectId) {
  const plan = await getUserPlan(userId);
  if (!plan) return { boleh: false, plan: null, pesan: 'Akun tidak ditemukan.' };

  const batas = batasPaket(plan);
  const kuota = batas.kuota_rekomendasi_per_minggu;
  const terpakai = await hitungPemakaianRekomendasi(projectId);
  const boleh = kuota === null || terpakai < kuota;

  return {
    boleh,
    plan,
    kuota,
    terpakai,
    sisa: kuota === null ? null : Math.max(kuota - terpakai, 0),
    per_minggu: JENDELA_KUOTA_REKOMENDASI_HARI,
    pesan: boleh ? null : pesanKuotaRekomendasi(kuota, plan),
  };
}

async function catatPemakaianRekomendasi(userId, projectId, plan, requestData = null, resultData = null) {
  return RecommendationUsage.create({
    user_id: userId,
    project_id: projectId,
    plan,
    dipakai_pada: new Date(),
    request_data: requestData,
    result_data: resultData,
  });
}

async function ringkasLangganan(userId) {
  const user = await User.findByPk(userId, { attributes: ['id', 'role'] });
  if (!user) return null;

  await tandaiKedaluwarsa(userId);

  const langgananAktif = user.role === 'admin' ? null : await ambilLanggananPremiumAktif(userId);
  const plan = user.role === 'admin'
    ? PAKET.ADMIN
    : langgananAktif
      ? PAKET.PREMIUM
      : PAKET.FREE;

  const batas = batasPaket(plan);
  const [proyekAktif, rekomendasiMingguIni, langgananTerakhir] = await Promise.all([
    hitungProyekAktif(userId),
    hitungPemakaianRekomendasiUser(userId),
    Subscription.findOne({ where: { user_id: userId }, order: [['id', 'DESC']] }),
  ]);

  const maks = batas.maks_proyek_aktif;

  return {
    plan,
    status: langgananAktif ? langgananAktif.status : STATUS_LANGGANAN.ACTIVE,
    started_at: langgananAktif ? langgananAktif.started_at : null,
    expires_at: langgananAktif ? langgananAktif.expires_at : null,
    role: user.role,
    batas: {
      maks_proyek_aktif: maks,
      kuota_rekomendasi_per_minggu: batas.kuota_rekomendasi_per_minggu,
      ekspor_pdf: batas.ekspor_pdf,
      jendela_kuota_hari: JENDELA_KUOTA_REKOMENDASI_HARI,
    },
    paket: {
      free: { ...BATAS_PAKET[PAKET.FREE] },
      premium: { ...BATAS_PAKET[PAKET.PREMIUM] },
    },
    pemakaian: {
      proyek_aktif: proyekAktif,
      proyek_tersisa: maks === null ? null : Math.max(maks - proyekAktif, 0),
      rekomendasi_minggu_ini: rekomendasiMingguIni,
    },
    langganan_terakhir: langgananTerakhir
      ? {
        plan: langgananTerakhir.plan,
        status: langgananTerakhir.status,
        started_at: langgananTerakhir.started_at,
        expires_at: langgananTerakhir.expires_at,
      }
      : null,
  };
}

async function aktifkanPremium(userId, hari) {
  const mulai = new Date();
  const selesai = new Date(mulai.getTime() + hari * SEHARI_MS);
  const data = {
    plan: PAKET.PREMIUM,
    status: STATUS_LANGGANAN.ACTIVE,
    started_at: mulai,
    expires_at: selesai,
  };

  const baris = await Subscription.findOne({ where: { user_id: userId }, order: [['id', 'DESC']] });
  if (baris) {
    await baris.update(data);
    return baris;
  }
  return Subscription.create({ user_id: userId, ...data });
}

async function batalkanPremium(userId) {
  const [jumlah] = await Subscription.update(
    { status: STATUS_LANGGANAN.CANCELLED },
    {
      where: {
        user_id: userId,
        plan: PAKET.PREMIUM,
        status: STATUS_LANGGANAN.ACTIVE,
      },
    },
  );
  return jumlah;
}

module.exports = {
  getUserPlan,
  ambilLanggananPremiumAktif,
  tandaiKedaluwarsa,
  hitungProyekAktif,
  cekBatasProyek,
  cekKuotaRekomendasi,
  catatPemakaianRekomendasi,
  hitungPemakaianRekomendasi,
  ringkasLangganan,
  aktifkanPremium,
  batalkanPremium,
};