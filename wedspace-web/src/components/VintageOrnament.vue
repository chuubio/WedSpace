<script setup>
defineProps({
  variant: {
    type: String,
    default: 'flower',
    // variants: 'flower' | 'bow' | 'loop-arrow' | 'sparkle' | 'oval-sticker' | 'scallop-stamp' | 'ticket-stamp'
  },
  label: { type: String, default: '' },
  sublabel: { type: String, default: '' },
  warna: { type: String, default: 'peach' }, // 'peach' | 'licorice' | 'strawberry' | 'violet' | 'cherry' | 'apple'
})
</script>

<template>
  <!-- 1. Hand-drawn Looping Arrow (like Nectar Hero arrow) -->
  <svg
    v-if="variant === 'loop-arrow'"
    viewBox="0 0 140 70"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    class="inline-block select-none"
    aria-hidden="true"
  >
    <path
      d="M8 22C28 24 56 20 54 8C52 -2 34 4 36 18C38 35 64 54 126 46"
      stroke="#7F1125"
      stroke-width="2.2"
      stroke-linecap="round"
    />
    <path
      d="M115 37L128 45.5L117 55"
      stroke="#7F1125"
      stroke-width="2.2"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>

  <!-- 2. Hand-drawn Ribbon / Bow (Lavender or Pink) -->
  <svg
    v-else-if="variant === 'bow'"
    viewBox="0 0 84 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    class="inline-block select-none"
    aria-hidden="true"
  >
    <path
      d="M42 26C30 10 10 8 8 22C6 34 26 36 42 26Z"
      :fill="warna === 'strawberry' ? '#FFCFDA' : '#C2C6FF'"
      stroke="#7F1125"
      stroke-width="2"
      stroke-linejoin="round"
    />
    <path
      d="M42 26C54 10 74 8 76 22C78 34 58 36 42 26Z"
      :fill="warna === 'strawberry' ? '#FFCFDA' : '#C2C6FF'"
      stroke="#7F1125"
      stroke-width="2"
      stroke-linejoin="round"
    />
    <path
      d="M38 28C32 42 22 52 16 58M46 28C52 42 62 52 68 58"
      stroke="#7F1125"
      stroke-width="2.2"
      stroke-linecap="round"
    />
    <circle cx="42" cy="26" r="5" fill="#FF7EC0" stroke="#7F1125" stroke-width="2" />
  </svg>

  <!-- 3. Vintage Floral Blossom Sticker (Cherry + Green Apple + Peach) -->
  <svg
    v-else-if="variant === 'flower'"
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    class="inline-block select-none"
    aria-hidden="true"
  >
    <path
      d="M24 14C26 6 34 4 38 8"
      stroke="#433C01"
      stroke-width="2"
      stroke-linecap="round"
    />
    <path
      d="M30 8C34 4 42 6 38 13C34 15 29 12 30 8Z"
      fill="#D5D242"
      stroke="#7F1125"
      stroke-width="1.6"
    />
    <circle cx="24" cy="15" r="7" :fill="warna === 'cherry' ? '#CF2C2F' : '#FF7EC0'" stroke="#7F1125" stroke-width="1.8" />
    <circle cx="32" cy="22" r="7" :fill="warna === 'cherry' ? '#CF2C2F' : '#FF7EC0'" stroke="#7F1125" stroke-width="1.8" />
    <circle cx="29" cy="32" r="7" :fill="warna === 'cherry' ? '#CF2C2F' : '#FF7EC0'" stroke="#7F1125" stroke-width="1.8" />
    <circle cx="19" cy="32" r="7" :fill="warna === 'cherry' ? '#CF2C2F' : '#FF7EC0'" stroke="#7F1125" stroke-width="1.8" />
    <circle cx="16" cy="22" r="7" :fill="warna === 'cherry' ? '#CF2C2F' : '#FF7EC0'" stroke="#7F1125" stroke-width="1.8" />
    <circle cx="24" cy="24" r="5.5" fill="#FFA57D" stroke="#7F1125" stroke-width="1.8" />
  </svg>

  <!-- 4. Sparkle / Vintage Starburst -->
  <svg
    v-else-if="variant === 'sparkle'"
    viewBox="0 0 36 36"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    class="inline-block select-none"
    aria-hidden="true"
  >
    <path
      d="M18 3C19.5 12.5 23.5 16.5 33 18C23.5 19.5 19.5 23.5 18 33C16.5 23.5 12.5 19.5 3 18C12.5 16.5 16.5 12.5 18 3Z"
      :fill="warna === 'apple' ? '#D5D242' : warna === 'violet' ? '#C2C6FF' : '#FFA57D'"
      stroke="#7F1125"
      stroke-width="1.8"
      stroke-linejoin="round"
    />
    <circle cx="18" cy="18" r="2.2" fill="#7F1125" />
  </svg>

  <!-- 5. Tilted Oval Editorial Stamp Sticker (like Nectar "designed to delight!") -->
  <div
    v-else-if="variant === 'oval-sticker'"
    :class="[
      'inline-flex flex-col items-center justify-center rounded-[999px] border-2 border-licorice px-5 py-2 text-center shadow-[3px_3px_0px_#7F1125] select-none',
      warna === 'peach' ? 'bg-peach text-licorice' : '',
      warna === 'cherry' ? 'bg-cherry text-marshmallow' : '',
      warna === 'violet' ? 'bg-violet text-licorice' : '',
      warna === 'strawberry' ? 'bg-strawberry text-licorice' : '',
      warna === 'licorice' ? 'bg-licorice text-marshmallow' : '',
    ]"
  >
    <span class="rounded-[999px] border border-current/40 px-3 py-0.5 font-heading text-base font-bold italic leading-tight">
      {{ label || 'curated to delight!' }}
    </span>
    <span v-if="sublabel" class="mt-0.5 text-[9px] font-bold uppercase tracking-widest opacity-85">
      {{ sublabel }}
    </span>
  </div>

  <!-- 6. Scalloped Flower Stamp Badge (like Nectar $399 / $8 / $99 badges) -->
  <div
    v-else-if="variant === 'scallop-stamp'"
    class="relative inline-flex h-28 w-28 flex-col items-center justify-center text-center select-none"
  >
    <svg viewBox="0 0 120 120" class="absolute inset-0 h-full w-full drop-shadow-[2px_3px_0px_rgba(127,17,37,0.3)]">
      <path
        d="M60 4 C66 4,70 11,76 10 C82 9,88 3,93 7 C98 11,96 19,101 23 C106 27,114 26,116 32 C118 38,111 43,112 49 C113 55,120 60,118 66 C116 72,108 73,106 79 C104 85,109 92,104 97 C99 102,92 98,87 102 C82 106,82 114,76 116 C70 118,65 111,60 111 C55 111,50 118,44 116 C38 114,38 106,33 102 C28 98,21 102,16 97 C11 92,16 85,14 79 C12 73,4 72,2 66 C0 60,7 55,8 49 C9 43,2 38,4 32 C6 26,14 27,19 23 C24 19,22 11,27 7 C32 3,38 9,44 10 C50 11,54 4,60 4 Z"
        :fill="
          warna === 'licorice'
            ? '#7F1125'
            : warna === 'strawberry'
              ? '#FFCFDA'
              : warna === 'violet'
                ? '#C2C6FF'
                : warna === 'cherry'
                  ? '#CF2C2F'
                  : '#FFA57D'
        "
        stroke="#7F1125"
        stroke-width="2"
      />
    </svg>
    <div
      :class="[
        'relative z-10 px-2',
        warna === 'licorice' || warna === 'cherry' ? 'text-marshmallow' : 'text-licorice',
      ]"
    >
      <div class="font-heading text-2xl font-bold leading-none">{{ label }}</div>
      <div class="mt-1 text-[9px] font-bold uppercase tracking-wider leading-tight opacity-90">{{ sublabel }}</div>
    </div>
  </div>

  <!-- 7. Ticket / Club Emblem Stamp (like Nectar Candy Club small stamp) -->
  <div
    v-else-if="variant === 'ticket-stamp'"
    class="inline-flex items-center gap-2 rounded-lg border-2 border-licorice bg-strawberry px-3 py-1 shadow-[2px_2px_0px_#7F1125]"
  >
    <span class="h-2 w-2 rounded-full border border-licorice bg-marshmallow"></span>
    <span class="font-heading text-sm font-bold italic tracking-wide text-licorice">{{ label || 'WedSpace Studio' }}</span>
    <span class="h-2 w-2 rounded-full border border-licorice bg-marshmallow"></span>
  </div>
</template>
