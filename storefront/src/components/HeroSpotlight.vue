<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { CatalogApp, InstalledAppInfo } from '../types'
import AppVectorIcon from './AppVectorIcon.vue'
import AppIcon from './AppIcon.vue'

interface Props {
  apps: CatalogApp[]
  installedMap: Map<string, InstalledAppInfo>
  isEmbedded: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'selectApp', appId: string): void
  (e: 'installApp', app: CatalogApp): void
  (e: 'openApp', app: CatalogApp): void
}>()

const currentIndex = ref(0)
const liveAnnouncement = ref('')
let timer: ReturnType<typeof setInterval> | null = null

const activeIndex = computed(() => {
  if (!props.apps.length) return 0
  return currentIndex.value % props.apps.length
})

const currentApp = computed<CatalogApp | null>(() => {
  if (!props.apps.length) return null
  return props.apps[activeIndex.value] || props.apps[0]
})

const installedInfo = computed<InstalledAppInfo | null>(() => {
  if (!currentApp.value) return null
  return props.installedMap.get(currentApp.value.id) || null
})

const heroImage = computed<string | null>(() => {
  if (!currentApp.value) return null
  if (currentApp.value.hero_url) return currentApp.value.hero_url
  if (currentApp.value.gallery && currentApp.value.gallery.length > 0) {
    return currentApp.value.gallery[0]
  }
  return null
})

const announceSlide = (idx: number) => {
  const item = props.apps[idx]
  if (!item || props.apps.length <= 1) return
  liveAnnouncement.value = `Slide ${idx + 1} of ${props.apps.length}: ${item.name}`
}

const next = (fromUser = true) => {
  if (props.apps.length > 1) {
    const target = (activeIndex.value + 1) % props.apps.length
    currentIndex.value = target
    if (fromUser) announceSlide(target)
  }
}

const prev = () => {
  if (props.apps.length > 1) {
    const target = (activeIndex.value - 1 + props.apps.length) % props.apps.length
    currentIndex.value = target
    announceSlide(target)
  }
}

const goTo = (idx: number) => {
  if (idx >= 0 && idx < props.apps.length && idx !== activeIndex.value) {
    currentIndex.value = idx
    announceSlide(idx)
  }
}

const prefersReducedMotion = (): boolean => {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

const startTimer = () => {
  if (props.apps.length > 1 && !timer && !prefersReducedMotion()) {
    timer = setInterval(() => next(false), 7000)
  }
}

const pauseTimer = () => {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

const handleLinkClick = (e: MouseEvent) => {
  if (!currentApp.value) return
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
    return
  }
  e.preventDefault()
  emit('selectApp', currentApp.value.id)
}

const handleCardClick = () => {
  if (currentApp.value) {
    emit('selectApp', currentApp.value.id)
  }
}

onMounted(() => {
  startTimer()
})

onUnmounted(() => {
  pauseTimer()
})
</script>

<template>
  <section
    v-if="currentApp"
    data-app-id="hero-spotlight"
    data-transition-key="hero-spotlight"
    :aria-roledescription="apps.length > 1 ? 'carousel' : undefined"
    aria-label="Featured application"
    class="group relative w-full rounded-2xl overflow-clip cursor-pointer select-none
           border border-gray-200/90 dark:border-zinc-800/90
           bg-linear-to-br from-white via-white to-primary-50/70
           dark:from-zinc-900/95 dark:via-zinc-900/90 dark:to-primary-950/35
           shadow-[inset_0_1px_2px_rgba(255,255,255,0.7),0_4px_16px_-4px_rgba(0,0,0,0.06)]
           dark:shadow-[inset_0_1px_2px_rgba(255,255,255,0.05),0_18px_40px_-14px_rgba(0,0,0,0.6)]
           hover:border-gray-300 dark:hover:border-zinc-700/90
           transition-[border-color,box-shadow] duration-300 ease-out"
    @click="handleCardClick"
    @mouseenter="pauseTimer"
    @mouseleave="startTimer"
    @focusin="pauseTimer"
    @focusout="startTimer"
  >
    <!-- Ambient corner light -->
    <div
      class="pointer-events-none absolute -top-24 -left-20 w-80 h-80 rounded-full bg-primary-500/12 dark:bg-primary-500/20 blur-3xl"
      aria-hidden="true"
    />

    <!-- Fallback oversized watermark silhouette when no preview screenshot exists -->
    <div
      v-if="!heroImage"
      class="pointer-events-none select-none absolute -right-6 -bottom-10 text-primary-600/[0.05] dark:text-primary-400/[0.07] -rotate-12 transition-transform duration-500 group-hover:scale-105"
      aria-hidden="true"
    >
      <AppVectorIcon :icon-url="currentApp.icon_url" :app-id="currentApp.id" size="w-52 h-52" />
    </div>

    <div class="relative z-10 grid grid-cols-1 lg:grid-cols-12 items-center gap-6 lg:gap-8 p-5 sm:p-7">
      <!-- Left Editorial Column -->
      <Transition name="hero-content" mode="out-in">
        <div
          :key="currentApp.id"
          class="flex flex-col justify-between gap-4 min-w-0"
          :class="heroImage ? 'lg:col-span-5' : 'lg:col-span-8'"
        >
          <div class="space-y-4">
            <!-- Top Eyebrow & Installed State -->
            <div class="flex items-center justify-between gap-3">
              <span class="text-[11px] font-medium tracking-wider uppercase text-primary-600 dark:text-primary-400">
                Featured
              </span>
              <span
                v-if="installedInfo"
                class="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400"
              >
                <AppIcon name="heroicons:check-20-solid" size="w-3.5 h-3.5" />
                <span>Installed</span>
              </span>
            </div>

            <!-- App Identity -->
            <div class="flex items-center gap-4 min-w-0">
              <div
                class="w-15 h-15 sm:w-16 sm:h-16 rounded-2xl shrink-0 flex items-center justify-center
                       bg-linear-to-b from-white to-primary-200/85 dark:from-neutral-800 dark:to-primary-950
                       border-[0.5px] border-primary-200/70 dark:border-white/[0.06]
                       shadow-[inset_0_2px_3px_rgba(255,255,255,0.9),0_8px_20px_-4px_rgba(0,0,0,0.12)]
                       dark:shadow-[inset_0_1px_2px_rgba(255,255,255,0.15),0_10px_24px_-4px_rgba(0,0,0,0.55)]
                       text-primary-600 dark:text-white"
              >
                <AppVectorIcon :icon-url="currentApp.icon_url" :app-id="currentApp.id" size="w-8 h-8" />
              </div>

              <div class="min-w-0">
                <h2 class="text-2xl sm:text-3xl font-light tracking-tight text-gray-900 dark:text-white leading-tight truncate">
                  <a
                    :href="`/app/${currentApp.id}`"
                    class="focus:outline-none focus-visible:underline"
                    @click.stop="handleLinkClick"
                  >
                    {{ currentApp.name }}
                  </a>
                </h2>
                <p class="mt-0.5 text-xs text-gray-400 dark:text-zinc-400 truncate">
                  <span>by {{ currentApp.author || 'FynnCloud' }}</span>
                  <span v-if="currentApp.category" class="mx-1 text-gray-300 dark:text-zinc-700">·</span>
                  <span v-if="currentApp.category" class="capitalize">{{ currentApp.category }}</span>
                </p>
              </div>
            </div>

            <!-- Concise Value Summary -->
            <p class="text-xs sm:text-sm text-gray-600 dark:text-zinc-300 leading-relaxed line-clamp-3">
              {{ currentApp.description }}
            </p>
          </div>

          <!-- CTA + Optional Multi-Slide Carousel Controls -->
          <div class="flex items-center justify-between gap-4 pt-1">
            <span class="inline-flex items-center gap-1 text-xs font-medium text-primary-600 dark:text-primary-400 group-hover:gap-1.5 transition-all duration-200">
              <span>Explore {{ currentApp.name }}</span>
              <AppIcon name="heroicons:chevron-right-20-solid" size="w-4 h-4" />
            </span>

            <div v-if="apps.length > 1" class="flex items-center gap-1.5" @click.stop>
              <button
                type="button"
                class="min-w-7 min-h-7 rounded-lg inline-flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-200/60 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-white/[0.08] active:scale-95 transition-all cursor-pointer"
                aria-label="Previous featured app"
                @click="prev"
              >
                <AppIcon name="heroicons:chevron-left-20-solid" size="w-4 h-4" />
              </button>

              <nav class="flex items-center gap-0.5" aria-label="Choose a featured app">
                <button
                  v-for="(item, idx) in apps"
                  :key="item.id"
                  type="button"
                  class="min-w-6 min-h-6 flex items-center justify-center rounded-full cursor-pointer focus-visible:outline-2 focus-visible:outline-primary-500"
                  :aria-label="`Show slide ${idx + 1}: ${item.name}`"
                  :aria-current="activeIndex === idx ? 'true' : undefined"
                  @click="goTo(idx)"
                >
                  <span
                    class="block h-1.5 rounded-full transition-all duration-200"
                    :class="
                      activeIndex === idx
                        ? 'w-5 bg-primary-600 dark:bg-primary-400'
                        : 'w-1.5 bg-gray-300 dark:bg-zinc-600 hover:bg-gray-400 dark:hover:bg-zinc-500'
                    "
                  />
                </button>
              </nav>

              <button
                type="button"
                class="min-w-7 min-h-7 rounded-lg inline-flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-200/60 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-white/[0.08] active:scale-95 transition-all cursor-pointer"
                aria-label="Next featured app"
                @click="next(true)"
              >
                <AppIcon name="heroicons:chevron-right-20-solid" size="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </Transition>

      <!-- Right Floating App Window Preview (uncropped natural aspect ratio) -->
      <div v-if="heroImage" class="lg:col-span-7 min-w-0 flex justify-center lg:justify-end">
        <div
          class="w-fit max-w-full p-1.5 sm:p-2 rounded-xl bg-gray-900/[0.04] dark:bg-black/40
                 ring-1 ring-black/[0.07] dark:ring-white/[0.09]
                 shadow-md dark:shadow-[0_18px_38px_-12px_rgba(0,0,0,0.75)]
                 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.01]"
        >
          <div class="overflow-clip rounded-lg ring-1 ring-black/[0.08] dark:ring-white/[0.08] bg-neutral-950">
            <Transition name="hero-fade" mode="out-in">
              <img
                :key="currentApp.id"
                :src="heroImage"
                :alt="`${currentApp.name} preview`"
                fetchpriority="high"
                :width="currentApp.hero_dimensions?.width"
                :height="currentApp.hero_dimensions?.height"
                class="w-auto h-auto max-w-full max-h-[280px] sm:max-h-[360px] block"
              />
            </Transition>
          </div>
        </div>
      </div>
    </div>

    <p class="sr-only" role="status" aria-live="polite">
      {{ liveAnnouncement }}
    </p>
  </section>
</template>
