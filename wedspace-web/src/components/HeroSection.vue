<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import VintageOrnament from './VintageOrnament.vue'

const slides = [
  {
    src: '/picture/outdoor%20wedding%20venue.png',
    alt: 'Outdoor wedding venue dengan dekorasi meja bundar, kursi tamu, lentera gantung, dan pelaminan bunga di taman',
    title: 'Outdoor Wedding Venue',
    position: 'object-[center_65%]',
  },
  {
    src: '/picture/indoor%20wedding.png',
    alt: 'Indoor wedding venue dengan dekorasi elegan, pencahayaan hangat, dan pelaminan megah di ballroom',
    title: 'Indoor Wedding',
    position: 'object-[center_40%]',
  },
  {
    src: '/picture/outdoor%20wedding%20prambanan.png',
    alt: 'Outdoor wedding venue dengan latar belakang Candi Prambanan yang megah dan dekorasi floral romantis',
    title: 'Outdoor Wedding Prambanan',
    position: 'object-center',
  },
  {
    src: '/picture/outdoor%20wedding%20rumah%20joglo.png',
    alt: 'Outdoor wedding venue dengan arsitektur rumah Joglo tradisional bernuansa Jawa yang klasik dan hangat',
    title: 'Outdoor Wedding Rumah Joglo',
    position: 'object-center',
  },
]

const currentIndex = ref(0)
const isHovered = ref(false)
const isFocused = ref(false)
const prefersReducedMotion = ref(false)

let timer = null
let mediaQuery = null
let touchStartX = 0
let touchStartY = 0

const startAutoSlide = () => {
  stopAutoSlide()
  if (isHovered.value || isFocused.value || prefersReducedMotion.value) {
    return
  }
  timer = setInterval(() => {
    nextSlide()
  }, 4500)
}

const stopAutoSlide = () => {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

const nextSlide = () => {
  currentIndex.value = (currentIndex.value + 1) % slides.length
}

const prevSlide = () => {
  currentIndex.value = (currentIndex.value - 1 + slides.length) % slides.length
}

const goToSlide = (index) => {
  currentIndex.value = index
  resetTimer()
}

const resetTimer = () => {
  stopAutoSlide()
  if (!isHovered.value && !isFocused.value && !prefersReducedMotion.value) {
    startAutoSlide()
  }
}

const onMouseEnter = () => {
  isHovered.value = true
  stopAutoSlide()
}

const onMouseLeave = () => {
  isHovered.value = false
  if (!isFocused.value) {
    startAutoSlide()
  }
}

const onFocusIn = () => {
  isFocused.value = true
  stopAutoSlide()
}

const onFocusOut = (e) => {
  if (!e.currentTarget.contains(e.relatedTarget)) {
    isFocused.value = false
    if (!isHovered.value) {
      startAutoSlide()
    }
  }
}

const handleTouchStart = (e) => {
  if (e.touches && e.touches.length > 0) {
    touchStartX = e.touches[0].clientX
    touchStartY = e.touches[0].clientY
  }
}

const handleTouchEnd = (e) => {
  if (!e.changedTouches || e.changedTouches.length === 0) return
  const touchEndX = e.changedTouches[0].clientX
  const touchEndY = e.changedTouches[0].clientY
  const diffX = touchEndX - touchStartX
  const diffY = touchEndY - touchStartY

  if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 40) {
    if (diffX < 0) {
      nextSlide()
    } else {
      prevSlide()
    }
    resetTimer()
  }
}

const handleMotionPreference = (e) => {
  prefersReducedMotion.value = e.matches
  if (e.matches) {
    stopAutoSlide()
  } else if (!isHovered.value && !isFocused.value) {
    startAutoSlide()
  }
}

onMounted(() => {
  if (typeof window !== 'undefined' && window.matchMedia) {
    mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    prefersReducedMotion.value = mediaQuery.matches
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleMotionPreference)
    } else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleMotionPreference)
    }
  }

  if (!prefersReducedMotion.value) {
    startAutoSlide()
  }
})

onUnmounted(() => {
  stopAutoSlide()
  if (mediaQuery) {
    if (mediaQuery.removeEventListener) {
      mediaQuery.removeEventListener('change', handleMotionPreference)
    } else if (mediaQuery.removeListener) {
      mediaQuery.removeListener(handleMotionPreference)
    }
  }
})
</script>

<template>
  <section class="bg-grid-paper relative overflow-hidden border-b-2 border-licorice">
    <!-- Floating decorative wedding doodles (non-intrusive) -->
    <VintageOrnament
      variant="flower"
      warna="cherry"
      class="pointer-events-none absolute right-8 top-8 hidden h-10 w-10 rotate-12 xl:block"
    />
    <VintageOrnament
      variant="sparkle"
      warna="apple"
      class="pointer-events-none absolute bottom-10 left-10 hidden h-8 w-8 -rotate-12 xl:block"
    />

    <div class="mx-auto grid max-w-7xl items-center gap-10 px-4 py-12 md:px-12 md:py-16 lg:grid-cols-12 lg:gap-12 lg:py-20">
      <!-- Left Editorial Column -->
      <div class="text-center lg:col-span-6 lg:text-left">
        <p class="ws-eyebrow mb-3 inline-block rounded-full border border-licorice bg-strawberry px-3.5 py-1 shadow-[2px_2px_0px_#7F1125]">
          WORKSPACE UNTUK WEDDING ORGANIZER
        </p>

        <h1 class="font-heading text-4xl font-bold leading-[1.02] text-licorice sm:text-5xl md:text-[62px]">
          Rancang Venue Pernikahan Lebih Mudah dengan WedSpace
        </h1>

        <p class="mx-auto mt-5 max-w-lg text-base leading-relaxed text-muted lg:mx-0">
          Rancang layout venue dalam 2D, visualisasikan hasilnya dalam 3D, dan dapatkan estimasi biaya dekorasi dalam satu workspace.
        </p>


      </div>

      <!-- Right Visual Column: Separated cleanly from heading & text -->
      <div class="mx-auto flex w-full max-w-[580px] flex-col gap-4 lg:col-span-6 lg:mx-0 lg:ml-auto">

        <!-- Paper-style Frame with Outdoor Wedding Venue Carousel -->
        <div
          class="ws-paper-card relative overflow-visible bg-marshmallow p-4"
          role="region"
          aria-roledescription="carousel"
          aria-label="Inspirasi Venue Slideshow"
          @mouseenter="onMouseEnter"
          @mouseleave="onMouseLeave"
          @focusin="onFocusIn"
          @focusout="onFocusOut"
        >
          <!-- Canopy Awning Header (Checkerboard + Strawberry Bar) -->
          <div class="mb-3 overflow-hidden rounded-xl border-2 border-licorice">
            <div class="checkerboard-canopy h-5 w-full border-b-2 border-licorice"></div>
            <div class="flex flex-wrap items-center justify-between gap-2 bg-strawberry px-3.5 py-2">
              <p class="text-xs font-bold tracking-wide text-licorice">
                Inspirasi Venue · Garden &amp; Outdoor Reception
              </p>
              <span class="rounded-full border border-licorice bg-peach px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-licorice">
                WedSpace Studio
              </span>
            </div>
          </div>

          <!-- Main Carousel Photo Area: 4-image auto slider with horizontal slide effect -->
          <div
            class="relative aspect-[4/3] w-full overflow-hidden rounded-xl border-2 border-licorice bg-paper"
            @touchstart.passive="handleTouchStart"
            @touchend.passive="handleTouchEnd"
          >
            <div
              class="flex h-full w-full transition-transform duration-500 ease-out"
              :style="{
                transform: `translateX(-${currentIndex * 100}%)`,
                transitionDuration: prefersReducedMotion ? '0ms' : '500ms',
              }"
            >
              <div
                v-for="(slide, index) in slides"
                :key="slide.src"
                :id="`venue-slide-${index}`"
                role="group"
                aria-roledescription="slide"
                :aria-label="`Slide ${index + 1} dari ${slides.length}: ${slide.title}`"
                :aria-hidden="currentIndex !== index"
                class="h-full w-full flex-shrink-0"
              >
                <img
                  :src="slide.src"
                  :alt="slide.alt"
                  class="h-full w-full object-cover"
                  :class="slide.position"
                  loading="eager"
                />
              </div>
            </div>
          </div>

          <!-- 4 Indicator Dots (Instagram Style in Maroon / Licorice) -->
          <div class="mt-3 flex items-center justify-center">
            <div
              class="flex items-center gap-1.5 sm:gap-2"
              role="tablist"
              aria-label="Pilih gambar inspirasi venue"
            >
              <button
                v-for="(slide, index) in slides"
                :key="slide.src"
                type="button"
                role="tab"
                :id="`venue-indicator-${index}`"
                :aria-selected="currentIndex === index"
                :aria-controls="`venue-slide-${index}`"
                :aria-label="`Pilih slide ${index + 1}: ${slide.title}`"
                @click="goToSlide(index)"
                class="group flex h-7 w-7 items-center justify-center rounded-full cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-licorice"
              >
                <span
                  class="block rounded-full transition-all duration-300 ease-out"
                  :class="[
                    currentIndex === index
                      ? 'h-2.5 w-2.5 bg-licorice ring-2 ring-licorice/30 ring-offset-1 scale-110 shadow-sm'
                      : 'h-2 w-2 bg-licorice/35 group-hover:bg-licorice/65 group-hover:scale-105',
                  ]"
                ></span>
              </button>
            </div>
          </div>

          <!-- Screen Reader Live Status -->
          <span class="sr-only" aria-live="polite">
            Slide {{ currentIndex + 1 }} dari {{ slides.length }}: {{ slides[currentIndex].title }}
          </span>
        </div>
      </div>
    </div>
  </section>
</template>
