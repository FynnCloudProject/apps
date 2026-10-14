<script setup lang="ts">
import { computed } from 'vue'
import type { CatalogApp, InstalledAppInfo } from '../types'
import { isApiCompatible } from '../utils/compatibility'
import AppVectorIcon from './AppVectorIcon.vue'
import AppButton from './AppButton.vue'
import AppIcon from './AppIcon.vue'

interface Props {
  app: CatalogApp
  installedInfo: InstalledAppInfo | null
  isInstalling: boolean
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

const heroImage = computed<string | null>(() => {
  if (props.app.hero_url) return props.app.hero_url
  if (props.app.gallery && props.app.gallery.length > 0) {
    return props.app.gallery[0]
  }
  return null
})

const hasWebUi = computed(() => {
  const ui = props.app?.manifest?.ui
  if (ui === false) return false
  if (typeof ui === 'object' && ui !== null && ui.launcher === false) return false
  return true
})

const apiRange = computed(() => props.app.manifest?.compatibility?.api_version || null)

const apiCompatibility = computed<boolean | null>(() => {
  if (!props.isEmbedded || !props.hostApiVersion) return null
  return isApiCompatible(apiRange.value, props.hostApiVersion)
})
</script>

<template>
  <div
    :data-app-id="app.id"
    :data-transition-key="app.id"
    class="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-gray-200/90 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs hover:border-gray-300 dark:hover:border-neutral-700 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] transition-all duration-200 ease-out cursor-pointer"
    @click="emit('select')"
  >
    <div>
      <div
        v-if="heroImage"
        class="relative w-full h-36 bg-gray-100 dark:bg-neutral-800 overflow-hidden border-b border-gray-100 dark:border-neutral-800/60"
      >
        <img
          :src="heroImage"
          :alt="app.name"
          class="w-full h-full object-cover object-top transition-transform duration-300 ease-out group-hover:scale-[1.03]"
          loading="lazy"
        />
      </div>

      <div
        v-else
        class="relative w-full h-36 bg-linear-to-br from-primary-500/10 via-primary-500/5 to-transparent dark:from-primary-500/20 dark:via-primary-500/5 dark:to-transparent flex items-center justify-center overflow-hidden border-b border-gray-100 dark:border-neutral-800/60"
      >
        <AppVectorIcon
          :icon-url="app.icon_url"
          :app-id="app.id"
          size="w-20 h-20"
          class="opacity-10 text-primary-600 dark:text-primary-400 transition-transform duration-300 ease-out group-hover:scale-110"
        />
      </div>

      <div class="p-3.5">
        <div class="flex items-start gap-3">
          <div
            class="w-11 h-11 -mt-6 relative z-10 rounded-xl bg-white dark:bg-neutral-800 border border-gray-200/80 dark:border-neutral-700/80 shadow-xs flex items-center justify-center shrink-0 p-2 text-primary-600 dark:text-primary-400 transition-all duration-200 ease-out group-hover:scale-105 group-hover:shadow-sm"
          >
            <AppVectorIcon :icon-url="app.icon_url" :app-id="app.id" size="w-5.5 h-5.5" />
          </div>

          <div class="min-w-0 flex-1">
            <div class="flex items-baseline justify-between gap-2">
              <h3 class="font-medium text-sm text-gray-900 dark:text-neutral-100 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors duration-150 truncate">
                {{ app.name }}
              </h3>
              <span class="text-[11px] font-mono text-gray-400 dark:text-neutral-500 shrink-0">
                v{{ app.version }}
              </span>
            </div>
            <p class="text-xs text-gray-500 dark:text-neutral-400 truncate mt-0.5">
              <span>by {{ app.author }}</span>
              <span v-if="app.category" class="mx-1 text-gray-300 dark:text-neutral-700">·</span>
              <span v-if="app.category" class="capitalize">{{ app.category }}</span>
            </p>
          </div>
        </div>

        <p class="mt-2.5 text-xs text-gray-600 dark:text-neutral-400 line-clamp-2 leading-relaxed min-h-[2rem]">
          {{ app.description }}
        </p>
      </div>
    </div>

    <div
      class="border-t border-gray-100 dark:border-neutral-800/80 px-3.5 py-2 bg-gray-50/50 dark:bg-neutral-900/50 flex items-center justify-between gap-2"
    >
      <span
        class="inline-flex items-center gap-1.5 font-mono text-[10px] truncate"
        :class="
          apiCompatibility === true
            ? 'text-emerald-600 dark:text-emerald-400'
            : apiCompatibility === false
              ? 'text-red-600 dark:text-red-400'
              : 'text-gray-400 dark:text-neutral-500'
        "
        :title="
          apiCompatibility === true
            ? `Compatible with this FynnCloud instance (API v${hostApiVersion})`
            : apiCompatibility === false
              ? `Requires API ${apiRange} (current instance: v${hostApiVersion})`
              : undefined
        "
      >
        <span
          v-if="apiCompatibility !== null"
          class="w-1.5 h-1.5 rounded-full shrink-0"
          :class="apiCompatibility ? 'bg-emerald-500' : 'bg-red-500'"
        />
        <span>API {{ apiRange || '*' }}</span>
      </span>

      <div v-if="isEmbedded || isInstalled" class="flex items-center gap-1.5">
        <template v-if="isInstalled">
          <span class="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            <AppIcon name="heroicons:check-20-solid" size="w-3.5 h-3.5" />
            <span>Installed</span>
          </span>
          <AppButton
            v-if="hasUpdate && isEmbedded"
            variant="primary"
            size="xs"
            rounded="rounded-lg"
            label="Update"
            :loading="isInstalling"
            @click.stop="emit('install', app)"
          />
          <AppButton
            v-else-if="isEmbedded && hasWebUi"
            variant="secondary"
            size="xs"
            rounded="rounded-lg"
            label="Open"
            @click.stop="emit('open', app)"
          />
        </template>

        <AppButton
          v-else-if="isEmbedded"
          variant="primary"
          size="xs"
          rounded="rounded-lg"
          icon="heroicons:arrow-down-tray-20-solid"
          label="Install"
          :loading="isInstalling"
          :disabled="apiCompatibility === false"
          @click.stop="emit('install', app)"
        />
      </div>
    </div>
  </div>
</template>
