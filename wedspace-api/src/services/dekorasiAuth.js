const { Op } = require('sequelize');

/**
 * Service otorisasi dekorasi berdasarkan konsep Hybrid Decoration Catalog.
 */

function adalahPemilik(user, dekorasi) {
  if (!user || !dekorasi) return false;
  if (user.role !== 'wo') return false;
  return Boolean(dekorasi.created_by_user_id && dekorasi.created_by_user_id === user.id);
}

function bisaMelihatDekorasi(user, dekorasi) {
  if (!dekorasi) return false;

  // Dekorasi publik dapat dilihat oleh semua pengguna (WO maupun Admin)
  if (dekorasi.visibility === 'public') {
    return true;
  }

  // Dekorasi privat HANYA dapat dilihat oleh WO pemiliknya
  if (dekorasi.visibility === 'private') {
    return adalahPemilik(user, dekorasi);
  }

  return false;
}

function bisaMengubahDekorasi(user, dekorasi) {
  // Hanya WO pemilik yang boleh mengubah dekorasi miliknya
  return adalahPemilik(user, dekorasi);
}

function bisaMenghapusDekorasi(user, dekorasi) {
  // Hanya WO pemilik yang boleh menghapus / menonaktifkan dekorasi
  return adalahPemilik(user, dekorasi);
}

function bisaMengubahVisibilitas(user, dekorasi) {
  // Hanya WO pemilik yang boleh mengubah visibilitas dekorasi
  return adalahPemilik(user, dekorasi);
}

function bisaMenggunakanDekorasi(user, dekorasi) {
  if (!user || !dekorasi) return false;
  // Penggunaan baru hanya boleh jika dekorasi aktif
  if (!dekorasi.is_active) return false;

  // Hanya WO yang dapat menggunakan dekorasi dalam rancangan
  if (user.role !== 'wo') return false;

  // Boleh jika milik WO sendiri (baik privat maupun publik)
  if (dekorasi.created_by_user_id === user.id) return true;

  // Boleh jika visibilitas publik (baik aset WedSpace maupun WO lain)
  if (dekorasi.visibility === 'public') return true;

  return false;
}

function namaKontributor(dekorasi) {
  if (!dekorasi) return 'WedSpace';
  if (!dekorasi.created_by_user_id) {
    return 'WedSpace';
  }
  if (dekorasi.User?.nama) {
    return dekorasi.User.nama;
  }
  return 'Kontributor Komunitas';
}

function formatDekorasiRespons(dekorasi, user) {
  const json = typeof dekorasi.toJSON === 'function' ? dekorasi.toJSON() : { ...dekorasi };
  const kontributor = namaKontributor(dekorasi);
  const is_owner = Boolean(user && user.role === 'wo' && json.created_by_user_id === user.id);

  return {
    ...json,
    kontributor,
    is_owner,
  };
}

function filterKatalogAkses(user) {
  const kondisiAkses = [];

  if (user && user.role === 'wo') {
    // WO dapat melihat dekorasi miliknya sendiri (private/public) ATAU dekorasi public (WedSpace/WO lain)
    kondisiAkses.push({
      [Op.or]: [
        { created_by_user_id: user.id },
        { visibility: 'public' },
      ],
    });
  } else {
    // Pengguna non-WO atau Admin HANYA dapat melihat dekorasi publik (tidak boleh mengakses dekorasi privat)
    kondisiAkses.push({
      visibility: 'public',
    });
  }

  return kondisiAkses;
}

module.exports = {
  adalahPemilik,
  bisaMelihatDekorasi,
  bisaMengubahDekorasi,
  bisaMenghapusDekorasi,
  bisaMengubahVisibilitas,
  bisaMenggunakanDekorasi,
  namaKontributor,
  formatDekorasiRespons,
  filterKatalogAkses,
};
