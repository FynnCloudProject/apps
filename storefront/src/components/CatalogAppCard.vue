<script setup lang="ts">
import { computed } from 'vue'
import type { CatalogApp, InstalledAppInfo } from '../types'
import { isCompatible as checkCompatible } from '../utils/compatibility'
import AppVectorIcon from './AppVectorIcon.vue'
import AppButton from './AppButton.vue'
import AppIcon from './AppIcon.vue'

interface Props {
  app: CatalogApp
  installedInfo: InstalledAppInfo | null
  isInstalling: boolean
  hostVersion?: string | null
  hostApiVersion?: string | null
  isEmbedded: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'select'): void
  (e: 'install', app: CatalogApp): void
  (e: 'open', app: CatalogApp): void
}>()

const isInstalled = computed(() => props.installedInfo !== null)

const hasUpdate = computed(() => {
  if (!props.installedInfo || !props.app.version) return false
  return props.installedInfo.version !== props.app.version
})

const hasWebUi = computed(() => {
  const ui = props.app?.manifest?.ui
  if (ui === false) return false
  if (typeof ui === 'object' && ui !== null && ui.launcher === false) return false
  return true
})

const appTypeLabel = computed(() => {
  const ui = props.app?.manifest?.ui
  if (ui === false) return 'Background service'
  if (typeof ui === 'object' && ui !== null && ui.launcher === false) return 'File editor'
  return 'Web application'
})

const currentHostVersion = computed(() => props.hostVersion || props.hostApiVersion || null)
const fynncloudRange = computed(() => props.app.manifest?.compatibility?.fynncloud || null)

const isCompatible = computed<boolean | null>(() => {
  if (!props.isEmbedded || !currentHostVersion.value) return null
  return checkCompatible(fynncloudRange.value, currentHostVersion.value)
})

const handleCardLinkClick = (e: MouseEvent) => {
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
    return
  }
  e.preventDefault()
  emit('select')
}
</script>

<template>
  <article
    :data-app-id="app.id"
    :data-transition-key="app.id"
    class="group relative flex flex-col rounded-2xl p-5 overflow-clip cursor-pointer select-none
           border border-gray-200/90 hover:border-gray-300
           dark:border-zinc-800/90 dark:hover:border-zinc-700/90
           bg-linear-to-b from-white via-white to-gray-50/75
           dark:from-zinc-900/95 dark:via-zinc-900/90 dark:to-zinc-950/95
           has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary-500/60
           shadow-[inset_0_1px_2px_rgba(255,255,255,0.65),0_2px_8px_-2px_rgba(0,0,0,0.05)]
           hover:shadow-[inset_0_1px_2px_rgba(255,255,255,0.75),0_10px_24px_-6px_rgba(0,0,0,0.08)]
           dark:shadow-[inset_0_1px_2px_rgba(255,255,255,0.04),0_8px_20px_-8px_rgba(0,0,0,0.45)]
           dark:hover:shadow-[inset_0_1px_2px_rgba(255,255,255,0.06),0_14px_30px_-10px_rgba(0,0,0,0.65)]
           hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99]
           transition-all duration-200 ease-out"
    @click="emit('select')"
  >
    <!-- Ambient watermark silhouette -->
    <div
      class="pointer-events-none select-none absolute -right-4 -bottom-6 text-primary-600/[0.04] dark:text-primary-400/[0.05] group-hover:text-primary-600/[0.07] dark:group-hover:text-primary-400/[0.08] -rotate-12 transition-all duration-300 group-hover:scale-105"
      aria-hidden="true"
    >
      <AppVectorIcon :icon-url="app.icon_url" :app-id="app.id" size="w-28 h-28" />
    </div>

    <!-- Header Row: Icon + Identity + Action/Affordance -->
    <div class="flex items-center justify-between gap-3 min-w-0">
      <div class="flex items-center gap-3.5 min-w-0 flex-1">
        <!-- 3D Specular App Icon Tile -->
        <div
          class="w-12 h-12 rounded-xl shrink-0 flex items-center justify-center
                 bg-linear-to-b from-white to-primary-200/85 dark:from-neutral-800 dark:to-primary-950
                 border-[0.5px] border-primary-200/70 dark:border-white/[0.06]
                 shadow-[inset_0_2px_3px_rgba(255,255,255,0.9),0_6px_14px_-2px_rgba(0,0,0,0.12)]
                 dark:shadow-[inset_0_1px_2px_rgba(255,255,255,0.14),0_6px_14px_-2px_rgba(0,0,0,0.45)]
                 text-primary-600 dark:text-white transition-transform duration-200 group-hover:scale-[1.03]"
        >
          <AppVectorIcon :icon-url="app.icon_url" :app-id="app.id" size="w-6 h-6" />
        </div>

        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-1.5 min-w-0">
            <h3 class="text-[15px] font-medium tracking-tight text-gray-900 dark:text-zinc-100 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors truncate">
              <a
                :href="`/app/${app.id}`"
                class="focus:outline-none after:absolute after:inset-0"
                @click.stop="handleCardLinkClick"
              >
                {{ app.name }}
              </a>
            </h3>
            <span
              v-if="isInstalled && isEmbedded && (hasUpdate || hasWebUi)"
              title="Installed"
              class="relative z-10 inline-flex shrink-0 text-emerald-500 dark:text-emerald-400"
            >
              <AppIcon name="heroicons:check-circle-20-solid" size="w-4 h-4" />
            </span>
          </div>
          <p class="mt-0.5 text-xs text-gray-400 dark:text-zinc-400 truncate">
            <span class="capitalize">{{ app.category }}</span>
            <span class="mx-1 text-gray-300 dark:text-zinc-700">·</span>
            <span>{{ appTypeLabel }}</span>
          </p>
        </div>
      </div>

      <div class="relative z-20 flex items-center gap-2 shrink-0">
        <template v-if="isInstalled">
          <AppButton
            v-if="hasUpdate && isEmbedded"
            variant="primary"
            size="sm"
            rounded="rounded-lg"
            icon="heroicons:arrow-up-circle-20-solid"
            label="Update"
            :loading="isInstalling"
            @click.stop="emit('install', app)"
          />
          <AppButton
            v-else-if="isEmbedded && hasWebUi"
            variant="secondary"
            size="sm"
            rounded="rounded-lg"
            label="Open"
            @click.stop="emit('open', app)"
          />
          <span
            v-else
            class="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400"
          >
            <AppIcon name="heroicons:check-20-solid" size="w-4 h-4" />
            <span>Installed</span>
          </span>
        </template>

        <AppButton
          v-else-if="isEmbedded"
          variant="primary"
          size="sm"
          rounded="rounded-lg"
          icon="heroicons:arrow-down-tray-20-solid"
          label="Install"
          :loading="isInstalling"
          :disabled="isCompatible === false"
          @click.stop="emit('install', app)"
        />

        <AppIcon
          v-else
          name="heroicons:chevron-right-20-solid"
          size="w-4 h-4"
          class="text-gray-300 group-hover:text-primary-500 dark:text-zinc-600 dark:group-hover:text-primary-400 transition-all duration-150 group-hover:translate-x-0.5 shrink-0"
        />
      </div>
    </div>

    <!-- Concise Summary -->
    <p class="relative z-10 mt-3.5 text-[13px] text-gray-600 dark:text-zinc-300 line-clamp-2 leading-relaxed min-h-[2.625rem]">
      {{ app.description }}
    </p>

    <p
      v-if="isCompatible === false && !isInstalled"
      class="relative z-10 mt-2.5 text-xs font-medium text-red-600 dark:text-red-400 truncate"
      :title="`Requires FynnCloud ${fynncloudRange} (current instance: v${currentHostVersion})`"
    >
      Requires FynnCloud {{ fynncloudRange }}
    </p>
  </article>
</template>
