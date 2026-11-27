
const { GoogleGenAI } = require('@google/genai');
const { Op } = require('sequelize');
const { Decoration } = require('../models');

const NAMA_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash';

// Google rutin menonaktifkan model lama (mis. gemini-2.0-flash sudah pensiun dan
// mengembalikan 404 "no longer available"). Daftar ini dipakai sebagai cadangan
// saat model utama tidak tersedia atau sedang sibuk.
const MODEL_CADANGAN = [
  'gemini-3.5-flash',
  'gemini-3.1-flash-lite',
  'gemini-flash-lite-latest',
  'gemini-3.5-flash-lite',
];

const SYSTEM_INSTRUCTION = `Kamu adalah AI assistant untuk rekomendasi dekorasi pernikahan pada aplikasi WedSpace.

Tugasmu adalah membantu Wedding Organizer (WO) dalam memilih dekorasi dari katalog dekorasi WedSpace berdasarkan informasi proyek pernikahannya.

Instruksi wajib:
1. Prioritaskan kesesuaian rekomendasi dengan tema pernikahan.
2. Pertimbangkan ukuran venue (panjang dan lebar) saat ini.
3. Pertimbangkan jumlah tamu saat ini.
4. Pertimbangkan anggaran proyek.
5. Gunakan HANYA dekorasi dari daftar katalog yang diberikan oleh backend. Jangan merekomendasikan dekorasi di luar katalog.
6. Jangan membuat nama atau ID dekorasi baru.
7. Jangan mengubah harga yang diberikan.
8. Jangan menghitung total biaya; backend WedSpace yang menangani perhitungan harga dan jumlah.
9. Setiap rekomendasi wajib disertai alasan mengapa dekorasi tersebut dipilih.

Format output HARUS berupa JSON valid dengan struktur:
{
  "rekomendasi": [
    {
      "decoration_id": 1,
      "alasan": "Sesuai dengan tema dan cocok digunakan sebagai elemen utama venue.",
      "jumlah_disarankan": 1
    }
  ],
  "ringkasan": "Ringkasan singkat rekomendasi."
}

Jangan mengembalikan field lain di luar format JSON tersebut.`;

let client = null;

function dapatkanClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    const err = new Error('GEMINI_API_KEY_TIDAK_ADA');
    err.kode = 'GEMINI_API_KEY_TIDAK_ADA';
    throw err;
  }
  if (!client) {
    client = new GoogleGenAI({ apiKey });
  }
  return client;
}

function errorKode(kode, pesan) {
  const err = new Error(pesan);
  err.kode = kode;
  return err;
}

function daftarModelYangDicoba() {
  return [...new Set([NAMA_MODEL, ...MODEL_CADANGAN].filter(Boolean))];
}

function galatModelBisaDicadangkan(err) {
  const status = err?.status ?? err?.code ?? err?.error?.code;
  if (status === 404 || status === 503) return true;
  const pesan = String(err?.message || '').toLowerCase();
  return /no longer available|not found|unavailable|high demand|overloaded/.test(pesan);
}

async function ambilKatalogUntukGemini(userId) {
  const where = {
    is_active: true,
  };
  if (userId) {
    where[Op.or] = [
      { created_by_user_id: userId },
      { visibility: 'public' },
    ];
  } else {
    where.visibility = 'public';
  }

  const katalog = await Decoration.findAll({ where, order: [['id', 'ASC']] });
  const daftarKatalog = katalog.map((d) => ({
    id: d.id,
    nama_dekorasi: d.nama_dekorasi,
    kategori: d.kategori,
    harga: Number(d.harga),
    panjang: d.panjang,
    lebar: d.lebar,
    tinggi: d.tinggi,
    deskripsi: d.deskripsi,
  }));
  return daftarKatalog;
}

function skemaRekomendasi() {
  return {
    type: 'object',
    properties: {
      rekomendasi: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            decoration_id: { type: 'integer', format: 'int32', description: 'ID dekorasi dari katalog yang diberikan ke AI.' },
            alasan: { type: 'string', description: 'Alasan rekomendasi dalam bahasa Indonesia.' },
            jumlah_disarankan: { type: 'integer', format: 'int32', description: 'Jumlah dekorasi yang disarankan (bilangan bulat positif).' },
          },
          required: ['decoration_id', 'alasan', 'jumlah_disarankan'],
          additionalProperties: false,
        },
      },
      ringkasan: { type: 'string', description: 'Ringkasan singkat rekomendasi dalam bahasa Indonesia.' },
    },
    required: ['rekomendasi', 'ringkasan'],
    additionalProperties: false,
  };
}

function kirimPermintaanKeGemini(clientAi, model, proyek, katalog) {
  return clientAi.models.generateContent({
    model,
    contents: {
      role: 'user',
      parts: [
        {
          text: `Buatkan rekomendasi dekorasi pernikahan berdasarkan data proyek dan katalog berikut:\n${JSON.stringify({ proyek, katalog })}\n\nBerikan rekomendasi dalam format JSON yang diminta.`,
        },
      ],
    },
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: 'application/json',
      responseSchema: skemaRekomendasi(),
    },
  });
}

async function mintaRekomendasiKeGemini(proyek, katalog) {
  const clientAi = dapatkanClient();
  const modelDicoba = daftarModelYangDicoba();

  let hasilGenerasi = null;
  let galatTerakhir = null;

  for (let i = 0; i < modelDicoba.length; i += 1) {
    const model = modelDicoba[i];
    try {
      hasilGenerasi = await kirimPermintaanKeGemini(clientAi, model, proyek, katalog);
      break;
    } catch (err) {
      galatTerakhir = err;
      const adaModelCadangan = i < modelDicoba.length - 1;
      if (!adaModelCadangan || !galatModelBisaDicadangkan(err)) break;
      console.warn(`[gemini] Model ${model} tidak dapat dipakai (${err?.message}). Mencoba ${modelDicoba[i + 1]}.`);
    }
  }

  if (!hasilGenerasi) {
    const alasan = galatTerakhir?.message ? `: ${galatTerakhir.message}` : '.';
    throw errorKode('GEMINI_ERROR', `Gemini gagal merespons${alasan}`);
  }

  const teks = hasilGenerasi?.text;
  if (!teks) {
    throw errorKode('GEMINI_RESPONSE_INVALID', 'Respons AI tidak valid.');
  }

  let data;
  try {
    data = JSON.parse(teks);
  } catch (err) {
    throw errorKode('GEMINI_RESPONSE_INVALID', 'Respons AI tidak valid.');
  }

  return data;
}

async function buatRekomendasiDekorasi(proyek, userId) {
  const katalog = await ambilKatalogUntukGemini(userId);
  const mapKatalog = new Map(katalog.map((d) => [d.id, d]));

  let data;
  try {
    data = await mintaRekomendasiKeGemini(proyek, katalog);
  } catch (err) {
    if (err?.kode) throw err;
    throw errorKode('GEMINI_ERROR', 'Gemini gagal merespons.');
  }

  if (!data || !Array.isArray(data.rekomendasi) || typeof data.ringkasan !== 'string') {
    throw errorKode('GEMINI_RESPONSE_INVALID', 'Respons AI tidak valid.');
  }

  const hasilValid = [];
  const sudahDiproses = new Set();

  for (const item of data.rekomendasi) {
    const decorationId = Number(item?.decoration_id);
    const jumlah = Number(item?.jumlah_disarankan);

    const dekorasi = Number.isInteger(decorationId) ? mapKatalog.get(decorationId) : null;
    if (!dekorasi) continue;

    if (!Number.isInteger(jumlah) || jumlah < 1) continue;

    if (sudahDiproses.has(decorationId)) continue;
    sudahDiproses.add(decorationId);

    hasilValid.push({
      decoration_id: dekorasi.id,
      nama_dekorasi: dekorasi.nama_dekorasi,
      kategori: dekorasi.kategori,
      harga: dekorasi.harga,
      alasan: item.alasan,
      jumlah_disarankan: jumlah,
    });
  }

  if (hasilValid.length === 0) {
    throw errorKode('REKOMENDASI_TIDAK_VALID', 'Tidak ada rekomendasi yang valid dari AI.');
  }

  return {
    rekomendasi: hasilValid,
    ringkasan: data.ringkasan,
  };
}

const WORKSPACE_AI_INSTRUCTION = `Kamu adalah AI Workspace Assistant untuk aplikasi desain venue pernikahan WedSpace (mendukung Workspace 2D dan 3D).

Tugasmu adalah menafsirkan permintaan bebas dari Wedding Organizer (WO) dan mengembalikan daftar aksi penempatan aset dekorasi dan/atau struktur ruangan (tembok, pintu, jendela) pada denah venue.

Aturan wajib:
1. Koordinat posisi_x dan posisi_y menggunakan centimeter fisik relatif terhadap sudut kiri atas venue (0,0) sampai (panjang_venue*100, lebar_venue*100).
2. Prioritaskan memilih dekorasi yang sudah tersedia di daftar \`katalog\` menggunakan aksi "add_existing" dengan \`decoration_id\` yang valid.
3. Jika WO meminta dekorasi spesifik yang belum ada di \`katalog\` dan \`allow_custom\` bernilai true, gunakan aksi "create_and_add" lengkap dengan \`nama_dekorasi\`, \`kategori\`, \`harga\` (Rupiah integer realistis), \`panjang\` (cm), \`lebar\` (cm), \`tinggi\` (cm), \`deskripsi\`.
4. Jika WO meminta menambahkan tembok, partisi, pintu, atau jendela ruangan, gunakan aksi "add_structure" dengan \`tipe\` ("wall" | "door" | "window"), \`label\`, \`panjang\` (cm), \`tinggi\` (cm), \`tebal\` (cm), \`posisi_x\`, \`posisi_y\`, \`rotasi\`.
5. Pastikan posisi tidak keluar dari batas venue.
6. Kembalikan JSON valid sesuai skema yang diberikan.`;

function skemaWorkspaceAi() {
  return {
    type: 'object',
    properties: {
      ringkasan: { type: 'string', description: 'Ringkasan singkat aksi yang dilakukan dalam bahasa Indonesia.' },
      aksi: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            jenis: { type: 'string', enum: ['add_existing', 'create_and_add', 'add_structure'] },
            decoration_id: { type: 'integer' },
            posisi_x: { type: 'number' },
            posisi_y: { type: 'number' },
            rotasi: { type: 'number' },
            jumlah: { type: 'integer' },
            alasan: { type: 'string' },
            custom_dekorasi: {
              type: 'object',
              properties: {
                nama_dekorasi: { type: 'string' },
                kategori: { type: 'string' },
                harga: { type: 'integer' },
                panjang: { type: 'number' },
                lebar: { type: 'number' },
                tinggi: { type: 'number' },
                deskripsi: { type: 'string' },
              },
            },
            struktur: {
              type: 'object',
              properties: {
                tipe: { type: 'string', enum: ['wall', 'door', 'window'] },
                label: { type: 'string' },
                panjang: { type: 'number' },
                tebal: { type: 'number' },
                tinggi: { type: 'number' },
                warna: { type: 'string' },
              },
            },
          },
          required: ['jenis'],
        },
      },
    },
    required: ['ringkasan', 'aksi'],
  };
}

/**
 * Fallback cerdas lokal jika GEMINI_API_KEY belum diset atau layanan Gemini sedang tidak dapat dijangkau.
 * Menafsirkan kata kunci permintaan WO terhadap katalog & kebutuhan tembok/pintu/custom asset.
 */
function fallbackAksiWorkspaceLokal(promptText, proyek, katalog, allowCustom = true) {
  const teks = String(promptText || '').trim();
  const lower = teks.toLowerCase();
  const venueW = Math.max(200, Number(proyek?.panjang_venue || 15) * 100);
  const venueH = Math.max(200, Number(proyek?.lebar_venue || 10) * 100);

  // Deteksi jumlah yang diminta (mis. "4 meja", "2 pintu")
  const matchQty = lower.match(/\b(\d+)\s+(?:unit|buah|set|pcs)?\s*[a-z]/i);
  const qty = matchQty ? Math.max(1, Math.min(50, parseInt(matchQty[1], 10))) : 1;

  // Posisi preferensi berdasarkan kata kunci lokasi
  let prefX = Math.round(venueW * 0.45);
  let prefY = Math.round(venueH * 0.45);
  if (/kiri/.test(lower)) prefX = Math.round(venueW * 0.15);
  if (/kanan/.test(lower)) prefX = Math.round(venueW * 0.72);
  if (/depan|atas|utara/.test(lower)) prefY = Math.round(venueH * 0.12);
  if (/belakang|bawah|selatan/.test(lower)) prefY = Math.round(venueH * 0.78);
  if (/tengah|pusat/.test(lower)) {
    prefX = Math.round(venueW * 0.45);
    prefY = Math.round(venueH * 0.45);
  }

  const aksi = [];

  // 1. Cek permintaan struktur (tembok / dinding / partisi / pintu / jendela)
  if (/(tembok|dinding|partisi|sekat|wall)/.test(lower)) {
    aksi.push({
      jenis: 'add_structure',
      posisi_x: Math.max(0, Math.min(prefX, venueW - 300)),
      posisi_y: Math.max(0, Math.min(prefY, venueH - 20)),
      rotasi: /vertikal|samping|kiri|kanan/.test(lower) ? 90 : 0,
      alasan: 'Menambahkan tembok ruangan sesuai permintaan WO.',
      struktur: {
        tipe: 'wall',
        label: 'Tembok Partisi',
        panjang: Math.min(400, Math.round(venueW * 0.35)),
        tebal: 15,
        tinggi: 300,
        warna: '#EFE7DD',
      },
    });
  }

  if (/(pintu|door|gerbang masuk|entrance)/.test(lower)) {
    aksi.push({
      jenis: 'add_structure',
      posisi_x: Math.max(0, Math.min(Math.round(venueW / 2 - 75), venueW - 150)),
      posisi_y: /belakang|bawah/.test(lower) ? Math.max(0, venueH - 20) : 0,
      rotasi: 0,
      alasan: 'Menambahkan pintu akses venue sesuai permintaan WO.',
      struktur: {
        tipe: 'door',
        label: /ganda|utama|besar/.test(lower) ? 'Pintu Utama Ganda' : 'Pintu Masuk',
        panjang: /ganda|utama|besar/.test(lower) ? 200 : 120,
        tebal: 18,
        tinggi: 220,
        warna: '#7F1125',
      },
    });
  }

  if (/(jendela|window)/.test(lower)) {
    aksi.push({
      jenis: 'add_structure',
      posisi_x: Math.max(0, Math.min(prefX, venueW - 180)),
      posisi_y: 0,
      rotasi: 0,
      alasan: 'Menambahkan jendela venue sesuai permintaan WO.',
      struktur: {
        tipe: 'window',
        label: 'Jendela Venue',
        panjang: 180,
        tebal: 15,
        tinggi: 160,
        warna: '#D4E4F7',
      },
    });
  }

  // 2. Cari kecocokan di katalog yang ada
  const stopWords = new Set(['tolong', 'tambahkan', 'tambah', 'buatkan', 'buat', 'taruh', 'letakkan', 'pasang', 'dengan', 'untuk', 'pada', 'yang', 'area', 'venue', 'pojok', 'tengah', 'depan', 'belakang', 'kiri', 'kanan', 'unit', 'buah', 'aset', 'dekorasi']);
  const tokens = lower
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !stopWords.has(w) && !/^\d+$/.test(w));

  let bestMatch = null;
  let bestScore = 0;
  for (const item of katalog) {
    const hay = `${item.nama_dekorasi} ${item.kategori} ${item.deskripsi || ''}`.toLowerCase();
    let score = 0;
    for (const tok of tokens) {
      if (hay.includes(tok)) score += 2;
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = item;
    }
  }

  if (bestMatch && bestScore >= 2) {
    const posX = Math.max(0, Math.min(prefX, venueW - Number(bestMatch.panjang || 100)));
    const posY = Math.max(0, Math.min(prefY, venueH - Number(bestMatch.lebar || 100)));
    aksi.push({
      jenis: 'add_existing',
      decoration_id: bestMatch.id,
      posisi_x: Math.round(posX),
      posisi_y: Math.round(posY),
      rotasi: 0,
      jumlah: qty,
      alasan: `Dipilih dari katalog WedSpace karena paling cocok dengan permintaan "${teks}".`,
    });
  } else if (aksi.length === 0 && allowCustom) {
    // 3. Buat item dekorasi custom baru ke Katalog Saya jika belum ada di katalog
    let kategori = 'Aksesoris';
    let panjang = 150;
    let lebar = 100;
    let tinggi = 150;
    let harga = 1200000;

    if (/pelaminan|backdrop|panggung/.test(lower)) {
      kategori = 'Pelaminan'; panjang = 400; lebar = 180; tinggi = 280; harga = 5500000;
    } else if (/photobooth|foto/.test(lower)) {
      kategori = 'Photobooth'; panjang = 250; lebar = 100; tinggi = 240; harga = 2500000;
    } else if (/meja|buffet|prasmanan|table/.test(lower)) {
      kategori = 'Meja'; panjang = 180; lebar = 120; tinggi = 80; harga = 450000;
    } else if (/kursi|chair/.test(lower)) {
      kategori = 'Kursi'; panjang = 50; lebar = 50; tinggi = 90; harga = 45000;
    } else if (/bunga|flower|vas|arch|gapura/.test(lower)) {
      kategori = 'Bunga'; panjang = 120; lebar = 80; tinggi = 180; harga = 900000;
    } else if (/lampu|lighting|chandelier/.test(lower)) {
      kategori = 'Lighting'; panjang = 100; lebar = 100; tinggi = 240; harga = 1500000;
    } else if (/sofa/.test(lower)) {
      kategori = 'Sofa'; panjang = 200; lebar = 90; tinggi = 95; harga = 1800000;
    } else if (/karpet|aisle/.test(lower)) {
      kategori = 'Karpet'; panjang = 500; lebar = 160; tinggi = 3; harga = 1100000;
    } else if (/welcome|sign|papan/.test(lower)) {
      kategori = 'Welcome Sign'; panjang = 80; lebar = 60; tinggi = 160; harga = 450000;
    }

    const namaBersih = teks
      .replace(/^(tolong\s+)?(tambahkan|tambah|buatkan|buat|pasang|letakkan)\s+(\d+\s+)?/i, '')
      .trim();
    const namaDekorasi = (namaBersih ? namaBersih.charAt(0).toUpperCase() + namaBersih.slice(1) : `Dekorasi ${kategori}`).slice(0, 80);

    aksi.push({
      jenis: 'create_and_add',
      posisi_x: Math.max(0, Math.min(prefX, venueW - panjang)),
      posisi_y: Math.max(0, Math.min(prefY, venueH - lebar)),
      rotasi: 0,
      jumlah: qty,
      alasan: `Aset belum tersedia di katalog, dibuat otomatis ke Katalog Saya dan ditempatkan di venue.`,
      custom_dekorasi: {
        nama_dekorasi: namaDekorasi,
        kategori,
        harga,
        panjang,
        lebar,
        tinggi,
        deskripsi: `Aset custom dibuat melalui AI Workspace berdasarkan permintaan: "${teks}".`,
      },
    });
  }

  return {
    sumber: 'fallback_lokal',
    ringkasan:
      aksi.length > 0
        ? `Berhasil memproses permintaan "${teks}" dengan ${aksi.length} aksi penempatan pada workspace.`
        : `Tidak ditemukan aksi yang cocok untuk "${teks}".`,
    aksi,
  };
}

/**
 * Menghasilkan aksi penempatan aset / pembuatan custom asset / struktur ruangan untuk Workspace 2D & 3D.
 */
async function buatAksiAiWorkspace({ prompt, proyek, katalog, existingItems = [], allowCustom = true }) {
  try {
    const clientAi = dapatkanClient();
    const modelDicoba = daftarModelYangDicoba().slice(0, 2);
    let hasilGenerasi = null;

    for (let i = 0; i < modelDicoba.length; i += 1) {
      const model = modelDicoba[i];
      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('GEMINI_TIMEOUT')), 10000)
        );
        hasilGenerasi = await Promise.race([
          clientAi.models.generateContent({
            model,
            contents: {
              role: 'user',
              parts: [
                {
                  text: `Permintaan WO: "${prompt}"\nData Workspace:\n${JSON.stringify({
                    proyek: {
                      nama_proyek: proyek.nama_proyek,
                      nama_venue: proyek.nama_venue,
                      panjang_venue_m: proyek.panjang_venue,
                      lebar_venue_m: proyek.lebar_venue,
                      tema: proyek.tema,
                      jumlah_tamu: proyek.jumlah_tamu,
                    },
                    allow_custom: allowCustom,
                    jumlah_item_saat_ini: existingItems.length,
                    katalog: katalog.slice(0, 60),
                  })}\nKembalikan daftar aksi JSON yang paling akurat.`,
                },
              ],
            },
            config: {
              systemInstruction: WORKSPACE_AI_INSTRUCTION,
              responseMimeType: 'application/json',
              responseSchema: skemaWorkspaceAi(),
            },
          }),
          timeoutPromise,
        ]);
        break;
      } catch (err) {
        const adaCadangan = i < modelDicoba.length - 1;
        if (!adaCadangan || !galatModelBisaDicadangkan(err)) throw err;
      }
    }

    if (hasilGenerasi?.text) {
      const parsed = JSON.parse(hasilGenerasi.text);
      if (parsed && Array.isArray(parsed.aksi) && parsed.aksi.length > 0) {
        return {
          sumber: 'gemini',
          ringkasan: parsed.ringkasan || 'Aksi AI Workspace berhasil dibuat.',
          aksi: parsed.aksi,
        };
      }
    }
  } catch (err) {
    console.warn('[gemini-workspace] Fallback ke parser lokal:', err?.message);
  }

  return fallbackAksiWorkspaceLokal(prompt, proyek, katalog, allowCustom);
}

module.exports = {
  NAMA_MODEL,
  SYSTEM_INSTRUCTION,
  buatRekomendasiDekorasi,
  ambilKatalogUntukGemini,
  buatAksiAiWorkspace,
};
