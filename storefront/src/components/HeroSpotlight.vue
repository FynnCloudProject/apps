<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { CatalogApp, InstalledAppInfo } from '../types'
import AppVectorIcon from './AppVectorIcon.vue'
import AppButton from './AppButton.vue'
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
let timer: ReturnType<typeof setInterval> | null = null

const currentApp = computed<CatalogApp | null>(() => {
  if (!props.apps.length) return null
  return props.apps[currentIndex.value % props.apps.length] || props.apps[0]
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

const next = () => {
  if (props.apps.length > 1) {
    currentIndex.value = (currentIndex.value + 1) % props.apps.length
  }
}

const prev = () => {
  if (props.apps.length > 1) {
    currentIndex.value = (currentIndex.value - 1 + props.apps.length) % props.apps.length
  }
}

const startTimer = () => {
  if (props.apps.length > 1 && !timer) {
    timer = setInterval(next, 7000)
  }
}

const pauseTimer = () => {
  if (timer) {
    clearInterval(timer)
    timer = null
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
  <div
    v-if="currentApp"
    class="hero-carousel-container group relative w-full rounded-2xl overflow-hidden border border-gray-200/90 dark:border-neutral-800 shadow-xs cursor-pointer select-none bg-neutral-950"
    @click="emit('selectApp', currentApp.id)"
    @mouseenter="pauseTimer"
    @mouseleave="startTimer"
  >
    <img
      v-if="heroImage"
      :src="heroImage"
      :alt="currentApp.name"
      class="absolute inset-0 w-full h-full object-cover object-top sm:object-center transition-transform duration-700 ease-out group-hover:scale-[1.01]"
    />
    <div
      v-else
      class="absolute inset-0 w-full h-full bg-gradient-to-br from-neutral-900 via-neutral-950 to-neutral-900 flex items-center justify-center"
    >
      <AppVectorIcon :icon-url="currentApp.icon_url" :app-id="currentApp.id" size="w-24 h-24" class="opacity-10 text-white" />
    </div>

    <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent pointer-events-none" />
    <div class="absolute inset-0 bg-gradient-to-r from-black/70 via-black/20 to-transparent pointer-events-none" />
    <div class="absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-transparent pointer-events-none" />

    <div v-if="apps.length > 1" class="absolute top-4 right-4 sm:top-5 sm:right-6 flex items-center justify-end z-10" @click.stop>
      <div class="flex items-center gap-1 bg-black/40 backdrop-blur-md border border-white/15 rounded-lg p-0.5">
        <button
          type="button"
          class="p-1 rounded-md text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          title="Previous app"
          @click="prev"
        >
          <AppIcon name="heroicons:chevron-left-20-solid" size="w-4 h-4" />
        </button>
        <span class="text-xs font-mono text-white/70 px-1">
          {{ currentIndex + 1 }}/{{ apps.length }}
        </span>
        <button
          type="button"
          class="p-1 rounded-md text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          title="Next app"
          @click="next"
        >
          <AppIcon name="heroicons:chevron-right-20-solid" size="w-4 h-4" />
        </button>
      </div>
    </div>

    <div class="absolute bottom-0 left-0 right-0 p-5 sm:p-7 flex flex-col justify-end z-10 pointer-events-none">
      <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div class="space-y-2 max-w-2xl pointer-events-auto">
          <div class="flex items-center gap-3">
            <div
              class="w-12 h-12 rounded-xl bg-black/50 backdrop-blur-md border border-white/20 p-2 flex items-center justify-center text-white shrink-0"
            >
              <AppVectorIcon :icon-url="currentApp.icon_url" :app-id="currentApp.id" size="w-7 h-7" />
            </div>
            <div class="min-w-0">
              <div class="flex items-baseline gap-2.5 flex-wrap">
                <h2 class="text-xl sm:text-2xl md:text-3xl font-light text-white tracking-tight leading-tight">
                  {{ currentApp.name }}
                </h2>
                <span class="text-xs font-mono text-white/70">
                  v{{ currentApp.version }}
                </span>
              </div>
              <p class="text-xs text-white/70 mt-0.5">
                <span>by {{ currentApp.author }}</span>
                <span v-if="currentApp.category" class="mx-1 text-white/40">·</span>
                <span v-if="currentApp.category" class="capitalize">{{ currentApp.category }}</span>
              </p>
            </div>
          </div>

          <p class="text-xs sm:text-sm text-white/85 line-clamp-2 leading-relaxed">
            {{ currentApp.description }}
          </p>
        </div>

        <div v-if="isEmbedded || installedInfo" class="flex flex-col sm:items-end gap-3 shrink-0 pointer-events-auto" @click.stop>
          <div class="flex items-center gap-2">
            <AppButton
              v-if="isEmbedded && !installedInfo"
              variant="primary"
              size="sm"
              icon="heroicons:arrow-down-tray-20-solid"
              label="Install app"
              @click="emit('installApp', currentApp)"
            />

            <span
              v-else-if="installedInfo"
              class="inline-flex items-center gap-1 text-xs font-medium text-emerald-300 px-2 py-1"
            >
              <AppIcon name="heroicons:check-20-solid" size="w-3.5 h-3.5" />
              <span>Installed</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.hero-carousel-container {
  aspect-ratio: 21 / 9;
  min-height: 280px;
  max-height: 420px;
}

@media (max-width: 640px) {
  .hero-carousel-container {
    aspect-ratio: 16 / 10;
    min-height: 260px;
  }
}
</style>
