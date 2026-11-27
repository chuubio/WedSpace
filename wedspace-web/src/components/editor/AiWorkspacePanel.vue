<script setup>
import { ref } from 'vue'
import { useAuthStore } from '../../stores/auth'

const props = defineProps({
  designId: { type: [String, Number], required: true },
  mode: { type: String, default: '2d' }, // '2d' | '3d'
})

const emit = defineEmits(['applied', 'tutup'])

const auth = useAuthStore()
const API = 'http://localhost:3000/api'

const promptText = ref('')
const allowCustom = ref(true)
const sibuk = ref(false)
const error = ref('')
const riwayat = ref([])

const contohPrompt = [
  'Tambahkan photobooth floral di pojok kanan depan',
  'Tambahkan 4 meja bundar tamu di area tengah',
  'Buatkan pintu masuk utama di bagian depan',
  'Tambahkan tembok partisi di sisi kiri ruangan',
  'Tambahkan welcome sign kayu di dekat pintu masuk',
]

async function kirimPrompt(teksOpsional = null) {
  const prompt = (teksOpsional ?? promptText.value).trim()
  if (!prompt) {
    error.value = 'Tuliskan permintaan aset untuk AI terlebih dahulu.'
    return
  }

  sibuk.value = true
  error.value = ''
  try {
    const res = await fetch(`${API}/rancangan/${props.designId}/ai-asset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...auth.authHeader() },
      body: JSON.stringify({
        prompt,
        allow_custom: allowCustom.value,
      }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(body.pesan || 'AI gagal memproses permintaan.')

    riwayat.value.unshift({
      id: Date.now(),
      prompt,
      ringkasan: body.data?.ringkasan || 'Permintaan berhasil diterapkan.',
      aksi: body.data?.aksi_diterapkan || [],
      sumber: body.data?.sumber_ai || 'ai',
    })
    promptText.value = ''
    emit('applied', body.data?.rancangan)
  } catch (err) {
    error.value = err.message
  } finally {
    sibuk.value = false
  }
}
</script>

<template>
  <aside class="ws-paper-card flex h-full flex-col overflow-hidden border-2 border-licorice bg-paper shadow-md">
    <div class="bg-stripes-pink flex items-center justify-between border-b-2 border-licorice px-4 py-2.5">
      <div class="flex items-center gap-2">
        <i class="fa-solid fa-wand-magic-sparkles text-cherry text-xs"></i>
        <span class="ws-eyebrow">AI Workspace {{ mode.toUpperCase() }}</span>
      </div>
      <button
        type="button"
        class="flex h-6 w-6 items-center justify-center rounded-md border border-licorice/40 bg-marshmallow text-xs"
        title="Tutup AI Assistant"
        @click="$emit('tutup')"
      >
        <i class="fa-solid fa-xmark"></i>
      </button>
    </div>

    <div class="flex-1 overflow-y-auto p-3.5 space-y-4 text-xs">
      <div class="rounded-xl border border-licorice/30 bg-violet/20 p-3 text-xs leading-relaxed text-licorice">
        <strong class="text-cherry">AI Penambah Aset & Struktur:</strong> Ketik kebutuhan dekorasi, tembok, atau pintu. AI akan memilih dari katalog WedSpace atau membuat aset custom baru ke <em>Katalog Saya</em> lalu menempatkannya ke denah.
      </div>

      <form class="space-y-2.5" @submit.prevent="kirimPrompt()">
        <p v-if="error" class="rounded-lg border border-cherry bg-strawberry/70 px-2.5 py-1.5 text-xs font-semibold text-cherry">
          {{ error }}
        </p>

        <textarea
          v-model="promptText"
          rows="3"
          placeholder="Contoh: Tambahkan 2 meja prasmanan di sisi kanan dan 1 photobooth bunga rustic..."
          class="ws-input text-xs"
          :disabled="sibuk"
        ></textarea>

        <label class="flex items-center gap-2 text-xs font-semibold text-licorice cursor-pointer">
          <input v-model="allowCustom" type="checkbox" class="accent-cherry" />
          <span>Izinkan AI membuat aset custom ke Katalog Saya jika belum ada</span>
        </label>

        <button
          type="submit"
          :disabled="sibuk"
          class="ws-btn-cherry w-full py-2 text-xs font-bold uppercase tracking-wider disabled:opacity-60"
        >
          <i v-if="sibuk" class="fa-solid fa-circle-notch fa-spin mr-1.5"></i>
          <i v-else class="fa-solid fa-sparkles mr-1.5"></i>
          <span>{{ sibuk ? 'AI Sedang Menata…' : 'Tambahkan dengan AI' }}</span>
        </button>
      </form>

      <!-- Prompt Cepat -->
      <div class="space-y-1.5">
        <p class="text-[0.6875rem] font-bold uppercase tracking-wider text-muted">Contoh Perintah Cepat</p>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="c in contohPrompt"
            :key="c"
            type="button"
            :disabled="sibuk"
            class="rounded-lg border border-licorice/40 bg-marshmallow px-2 py-1 text-left text-[0.6875rem] font-semibold text-licorice hover:bg-strawberry/60 transition-colors disabled:opacity-50"
            @click="kirimPrompt(c)"
          >
            {{ c }}
          </button>
        </div>
      </div>

      <!-- Riwayat Aksi AI -->
      <div v-if="riwayat.length > 0" class="space-y-2 border-t border-dashed border-licorice/30 pt-3">
        <p class="text-[0.6875rem] font-bold uppercase tracking-wider text-muted">Aksi AI Terbaru</p>
        <div
          v-for="r in riwayat"
          :key="r.id"
          class="rounded-xl border-2 border-licorice bg-marshmallow p-3 shadow-[2px_2px_0px_#7F1125] space-y-1.5"
        >
          <p class="font-bold text-licorice">“{{ r.prompt }}”</p>
          <p class="text-xs text-muted">{{ r.ringkasan }}</p>
          <ul v-if="r.aksi.length" class="space-y-1 pt-1">
            <li
              v-for="(a, idx) in r.aksi"
              :key="idx"
              class="rounded bg-paper px-2 py-1 border border-licorice/20 text-[0.6875rem]"
            >
              <span class="font-bold text-cherry">
                {{
                  a.jenis === 'create_and_add'
                    ? '[Custom Baru]'
                    : a.jenis === 'add_structure'
                    ? '[Struktur]'
                    : '[Katalog]'
                }}
              </span>
              <span class="font-bold text-licorice ml-1">{{ a.nama }}</span>
              <span v-if="a.jumlah > 1" class="text-muted"> (×{{ a.jumlah }})</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </aside>
</template>
