
const { GoogleGenAI } = require('@google/genai');
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

async function ambilKatalogUntukGemini() {
  const katalog = await Decoration.findAll({ where: { is_active: true }, order: [['id', 'ASC']] });
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

async function buatRekomendasiDekorasi(proyek) {
  const katalog = await ambilKatalogUntukGemini();
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

module.exports = {
  NAMA_MODEL,
  SYSTEM_INSTRUCTION,
  buatRekomendasiDekorasi,
};
