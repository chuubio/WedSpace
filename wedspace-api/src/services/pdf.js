
const LEBAR_A4 = 595.28;
const TINGGI_A4 = 841.89;
const MARGIN = 50;
const LEBAR_KARAKTER = 0.52;

function asciiAman(teks) {
  return String(teks ?? '')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u00D7/g, 'x')
    .replace(/\u2022/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/[^\x20-\x7E]/g, '');
}

function escapePdf(teks) {
  return asciiAman(teks).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function angka(n) {
  return Number(n).toFixed(2);
}

function lebarTeks(teks, ukuran) {
  return asciiAman(teks).length * ukuran * LEBAR_KARAKTER;
}

function potongTeks(teks, ukuran, lebarMaks) {
  let hasil = asciiAman(teks);
  if (lebarTeks(hasil, ukuran) <= lebarMaks) return hasil;
  while (hasil.length > 1 && lebarTeks(`${hasil}...`, ukuran) > lebarMaks) {
    hasil = hasil.slice(0, -1);
  }
  return `${hasil}...`;
}

function perintahTeks({ x, y, ukuran, tebal, teks }) {
  const font = tebal ? '/F2' : '/F1';
  return `BT ${font} ${ukuran} Tf ${angka(x)} ${angka(y)} Td (${escapePdf(teks)}) Tj ET`;
}

function perintahGaris(y) {
  const lebar = LEBAR_A4 - MARGIN * 2;
  return `0.85 0.78 0.81 rg ${angka(MARGIN)} ${angka(y)} ${angka(lebar)} 0.8 re f`;
}

function susunHalaman(daftarBaris) {
  const halaman = [];
  let isi = [];
  let y = TINGGI_A4 - MARGIN;

  for (const baris of daftarBaris) {
    const ukuranBaris = baris.ukuran || 10;
    const jarak = baris.jarak || Math.round(ukuranBaris * 1.7);

    if (y - jarak < MARGIN) {
      halaman.push(isi);
      isi = [];
      y = TINGGI_A4 - MARGIN;
    }
    y -= jarak;

    if (baris.garis) {
      isi.push(perintahGaris(y + jarak / 2));
      continue;
    }

    const sel = baris.sel || [baris];
    for (const s of sel) {
      const ukuran = s.ukuran || ukuranBaris;
      const teks = s.teks == null ? '' : String(s.teks);
      const x = s.kanan != null ? s.kanan - lebarTeks(teks, ukuran) : (s.x ?? MARGIN);
      isi.push(perintahTeks({ x, y, ukuran, tebal: s.tebal ?? baris.tebal, teks }));
    }
  }

  halaman.push(isi);
  return halaman.filter((h) => h.length > 0).map((h) => h.join('\n'));
}

function rangkaiPdf(daftarStream) {
  const objek = [];
  function tambah(isi) {
    objek.push(isi);
    return objek.length;
  }

  tambah('<< /Type /Catalog /Pages 2 0 R >>');
  tambah(''); // diisi setelah semua halaman diketahui
  tambah('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  tambah('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');

  const kids = [];
  for (const stream of daftarStream) {
    const noHalaman = tambah(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${angka(LEBAR_A4)} ${angka(TINGGI_A4)}] `
      + `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${objek.length + 2} 0 R >>`,
    );
    tambah(`<< /Length ${Buffer.byteLength(stream, 'latin1')} >>\nstream\n${stream}\nendstream`);
    kids.push(noHalaman);
  }

  objek[1] = `<< /Type /Pages /Kids [${kids.map((n) => `${n} 0 R`).join(' ')}] /Count ${kids.length} >>`;

  let pdf = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
  const offset = [];
  for (let i = 0; i < objek.length; i += 1) {
    offset.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${objek[i]}\nendobj\n`;
  }

  const posisiXref = pdf.length;
  pdf += `xref\n0 ${objek.length + 1}\n0000000000 65535 f \n`;
  for (const off of offset) {
    pdf += `${String(off).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objek.length + 1} /Root 1 0 R >>\nstartxref\n${posisiXref}\n%%EOF\n`;

  return Buffer.from(pdf, 'latin1');
}

function rupiah(nilai) {
  return `Rp ${Number(nilai || 0).toLocaleString('id-ID')}`;
}

function tanggal(t) {
  return new Date(t).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

const KOLOM = {
  nama: MARGIN,
  kategori: 250,
  harga: 425,
  jumlah: 462,
  subtotal: LEBAR_A4 - MARGIN,
};

function buatPdfRancangan(rancangan) {
  const polos = typeof rancangan.toJSON === 'function' ? rancangan.toJSON() : rancangan;
  const proyek = polos.Project || {};
  const items = polos.DesignItems || [];

  const baris = [
    { teks: 'WedSpace', ukuran: 10, jarak: 20 },
    { teks: 'Ringkasan Rancangan Venue Pernikahan', ukuran: 18, tebal: true, jarak: 26 },
    { garis: true, jarak: 14 },
    { teks: proyek.nama_proyek || 'Proyek tanpa nama', ukuran: 14, tebal: true, jarak: 22 },
    { teks: `Rancangan: ${polos.nama_rancangan || '-'}`, ukuran: 10 },
    { teks: `Venue: ${proyek.nama_venue || '-'}`, ukuran: 10 },
    { teks: `Ukuran venue: ${proyek.panjang_venue ?? '-'} m x ${proyek.lebar_venue ?? '-'} m`, ukuran: 10 },
    { teks: `Tema: ${proyek.tema || '-'}`, ukuran: 10 },
    { teks: `Jumlah tamu: ${proyek.jumlah_tamu ?? '-'}`, ukuran: 10 },
    { teks: `Anggaran: ${proyek.anggaran ? rupiah(proyek.anggaran) : '-'}`, ukuran: 10 },
    { teks: `Dicetak: ${tanggal(new Date())}`, ukuran: 10, jarak: 26 },
    { teks: 'Daftar Dekorasi', ukuran: 12, tebal: true, jarak: 22 },
    {
      jarak: 16,
      sel: [
        { teks: 'Dekorasi', ukuran: 9, tebal: true, x: KOLOM.nama },
        { teks: 'Kategori', ukuran: 9, tebal: true, x: KOLOM.kategori },
        { teks: 'Harga', ukuran: 9, tebal: true, kanan: KOLOM.harga },
        { teks: 'Jml', ukuran: 9, tebal: true, kanan: KOLOM.jumlah },
        { teks: 'Subtotal', ukuran: 9, tebal: true, kanan: KOLOM.subtotal },
      ],
    },
    { garis: true, jarak: 10 },
  ];

  const total = items.reduce(
    (s, i) => s + Number(i.Decoration?.harga || 0) * Number(i.jumlah || 1),
    0,
  );

  if (items.length === 0) {
    baris.push({ teks: 'Belum ada dekorasi pada rancangan ini.', ukuran: 10, jarak: 20 });
  } else {
    for (const item of items) {
      const harga = Number(item.Decoration?.harga || 0);
      const jumlah = Number(item.jumlah || 1);
      baris.push({
        jarak: 16,
        sel: [
          { teks: potongTeks(item.Decoration?.nama_dekorasi || 'Dekorasi dihapus', 9, 190), ukuran: 9, x: KOLOM.nama },
          { teks: potongTeks(item.Decoration?.kategori || '-', 9, 80), ukuran: 9, x: KOLOM.kategori },
          { teks: rupiah(harga), ukuran: 9, kanan: KOLOM.harga },
          { teks: String(jumlah), ukuran: 9, kanan: KOLOM.jumlah },
          { teks: rupiah(harga * jumlah), ukuran: 9, kanan: KOLOM.subtotal },
        ],
      });
    }
  }

  baris.push(
    { garis: true, jarak: 12 },
    { teks: `Total estimasi: ${rupiah(total)}`, ukuran: 11, tebal: true, kanan: KOLOM.subtotal, jarak: 26 },
    { teks: 'Dokumen dibuat otomatis oleh WedSpace (paket Premium).', ukuran: 9, jarak: 14 },
  );

  return rangkaiPdf(susunHalaman(baris));
}

module.exports = { buatPdfRancangan };
