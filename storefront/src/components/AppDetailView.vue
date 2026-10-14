<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import type { CatalogApp, InstalledAppInfo } from '../types'
import { getCachedReadmeHtml, fetchReadmeHtml } from '../composables/useCatalog'
import { isApiCompatible } from '../utils/compatibility'
import AppVectorIcon from './AppVectorIcon.vue'
import AppButton from './AppButton.vue'
import AppIcon from './AppIcon.vue'
import AppCard from './AppCard.vue'
import ScreenshotLightbox from './ScreenshotLightbox.vue'

const props = defineProps<{
  app: CatalogApp
  installedInfo: InstalledAppInfo | null
  isInstalling: boolean
  hostApiVersion: string | null
  isEmbedded: boolean
}>()

defineEmits<{
  (e: 'back'): void
  (e: 'selectCategory', category: string): void
  (e: 'install', app: CatalogApp): void
  (e: 'open', app: CatalogApp): void
}>()

const readmeHtml = ref<string>(getCachedReadmeHtml(props.app?.readme_url) ?? '')
const loadingReadme = ref(false)

const activeImageIndex = ref(0)
const isLightboxOpen = ref(false)
const lightboxIndex = ref(0)

const allImages = computed<string[]>(() => {
  if (!props.app) return []
  const list: string[] = []
  if (props.app.hero_url) list.push(props.app.hero_url)
  if (Array.isArray(props.app.gallery)) {
    for (const g of props.app.gallery) {
      if (!list.includes(g)) list.push(g)
    }
  }
  return list
})

const openLightbox = (index: number) => {
  lightboxIndex.value = index
  isLightboxOpen.value = true
}

const loadReadme = async () => {
  if (!props.app?.readme_url) {
    readmeHtml.value = ''
    return
  }

  const cached = getCachedReadmeHtml(props.app.readme_url)
  if (cached !== null) {
    readmeHtml.value = cached
    loadingReadme.value = false
    return
  }

  loadingReadme.value = true
  try {
    readmeHtml.value = await fetchReadmeHtml(props.app.readme_url)
  } catch {
    readmeHtml.value = ''
  } finally {
    loadingReadme.value = false
  }
}

watch(
  () => props.app?.id,
  () => {
    activeImageIndex.value = 0
    loadReadme()
  }
)

onMounted(() => {
  if (props.app && !readmeHtml.value) loadReadme()
})

const isInstalled = computed(() => Boolean(props.installedInfo))
const hasUpdate = computed(() => {
  if (!props.installedInfo || !props.app) return false
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

const latestReleaseDate = computed(() => {
  const rel = props.app?.released_at || props.app?.versions?.[0]?.released_at
  if (!rel) return null
  try {
    return new Date(rel).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  } catch {
    return null
  }
})

const architecturesLabel = computed(() => {
  const archs = props.app?.manifest?.deploy?.architectures
  if (Array.isArray(archs) && archs.length > 0) {
    return archs.join(', ')
  }
  return null
})

const resourcesLabel = computed(() => {
  const res = props.app?.manifest?.deploy?.resources
  if (!res) return null
  const parts: string[] = []
  if (res.memory) parts.push(res.memory)
  if (res.cpu) parts.push(`${res.cpu} CPU`)
  return parts.length > 0 ? parts.join(' · ') : null
})

const apiCompatibility = computed<boolean | null>(() => {
  if (!props.isEmbedded || !props.hostApiVersion) return null
  return isApiCompatible(props.app.manifest?.compatibility?.api_version, props.hostApiVersion)
})

const infoRows = computed(() => {
  const rows: {
    label: string
    value: string
    mono?: boolean
    capitalize?: boolean
    status?: 'compatible' | 'incompatible' | null
  }[] = [
    { label: 'Developer', value: props.app.author || 'FynnCloud' },
    { label: 'Category', value: props.app.category || 'general', capitalize: true },
    { label: 'Version', value: `v${props.app.version}`, mono: true },
    { label: 'Type', value: appTypeLabel.value }
  ]
  if (latestReleaseDate.value) {
    rows.push({ label: 'Released', value: latestReleaseDate.value })
  }
  if (props.app.manifest?.compatibility?.api_version) {
    rows.push({
      label: 'App API',
      value: props.app.manifest.compatibility.api_version,
      mono: true,
      status:
        apiCompatibility.value === true
          ? 'compatible'
          : apiCompatibility.value === false
            ? 'incompatible'
            : null
    })
  }
  if (architecturesLabel.value) {
    rows.push({ label: 'Architectures', value: architecturesLabel.value, mono: true })
  }
  if (resourcesLabel.value) {
    rows.push({ label: 'Resources', value: resourcesLabel.value, mono: true })
  }
  return rows
})

const permissionDescriptions: Record<string, { label: string; detail: string }> = {
  'files:all:read': {
    label: 'Read all files',
    detail: 'Browse and read files across your FynnCloud storage'
  },
  'files:all:write': {
    label: 'Modify all files',
    detail: 'Create, update, and write files in your FynnCloud storage'
  },
  'files:selected:read': {
    label: 'Read selected files',
    detail: 'Read only the specific files you open with this app'
  },
  'files:selected:write': {
    label: 'Modify selected files',
    detail: 'Save changes back to files you open or create with this app'
  },
  'user:read': {
    label: 'User profile',
    detail: 'Read your display name, username, and basic profile info'
  },
  'notifications:send': {
    label: 'Notifications',
    detail: 'Display status notifications and alerts in FynnCloud'
  }
}

const formattedPermissions = computed(() => {
  const perms: string[] = props.app?.manifest?.permissions || props.app?.permissions || []
  return perms.map((scope) => {
    const info = permissionDescriptions[scope]
    return {
      scope,
      label: info?.label || scope,
      detail: info?.detail || 'Requested capability scope'
    }
  })
})

const fileActions = computed(() => props.app?.manifest?.hooks?.file_actions || [])
const newFileHooks = computed(() => props.app?.manifest?.hooks?.new_file || [])
const sidebarItems = computed(() => {
  const ui = props.app?.manifest?.ui
  if (typeof ui === 'object' && ui !== null && Array.isArray(ui.sidebar)) {
    return ui.sidebar
  }
  return []
})

const hasIntegrationDetails = computed(() => {
  return fileActions.value.length > 0 || newFileHooks.value.length > 0 || sidebarItems.value.length > 0
})

const containerImage = computed(() => props.app?.manifest?.deploy?.image || props.app?.image || null)
const imageCopyFeedback = ref(false)
const copyImage = () => {
  if (!containerImage.value) return
  navigator.clipboard.writeText(containerImage.value)
  imageCopyFeedback.value = true
  setTimeout(() => {
    imageCopyFeedback.value = false
  }, 2000)
}
</script>

<template>
  <div class="space-y-5">
    <!-- Top Breadcrumb & App Page Header (Replaces the catalog's large title) -->
    <div class="space-y-3">
      <!-- Breadcrumb Navigation -->
      <nav class="flex items-center gap-1.5 text-xs text-gray-500 dark:text-neutral-400">
        <button
          type="button"
          class="inline-flex items-center gap-1 font-medium text-gray-600 hover:text-gray-900 dark:text-neutral-400 dark:hover:text-neutral-100 transition-colors cursor-pointer"
          @click="$emit('back')"
        >
          <AppIcon name="heroicons:arrow-left-20-solid" size="w-3.5 h-3.5" />
          <span>Apps</span>
        </button>
        <span class="text-gray-300 dark:text-neutral-700">/</span>
        <button
          type="button"
          class="capitalize hover:text-gray-900 dark:hover:text-neutral-100 transition-colors cursor-pointer"
          @click="$emit('selectCategory', app.category)"
        >
          {{ app.category }}
        </button>
        <span class="text-gray-300 dark:text-neutral-700">/</span>
        <span class="text-gray-900 dark:text-neutral-200 font-medium truncate">{{ app.name }}</span>
      </nav>

      <!-- Large App Title Header matching FynnCloud page headers -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div class="flex items-start sm:items-center gap-4 min-w-0">
          <div
            class="w-14 h-14 rounded-xl bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 flex items-center justify-center shrink-0 text-primary-600 dark:text-primary-400 shadow-xs"
          >
            <AppVectorIcon :icon-url="app.icon_url" :app-id="app.id" size="w-8 h-8" />
          </div>

          <div class="min-w-0">
            <div class="flex items-baseline gap-2.5 flex-wrap">
              <h1 class="text-3xl sm:text-4xl font-medium text-gray-900 dark:text-gray-100 tracking-tight">
                {{ app.name }}
              </h1>
              <span class="text-sm font-mono text-gray-400 dark:text-neutral-500">
                v{{ app.version }}
              </span>
            </div>
            <p class="mt-1 text-xs sm:text-sm text-gray-500 dark:text-neutral-400 max-w-3xl leading-relaxed">
              {{ app.description }}
            </p>
          </div>
        </div>

        <!-- Primary Action Area (embedded host only) -->
        <div v-if="isEmbedded" class="flex items-center gap-2 shrink-0">
          <AppButton
            v-if="hasUpdate"
            variant="primary"
            size="md"
            rounded="rounded-xl"
            :label="`Update to v${app.version}`"
            :loading="isInstalling"
            @click="$emit('install', app)"
          />
          <AppButton
            v-else-if="isInstalled && hasWebUi"
            variant="secondary"
            size="md"
            rounded="rounded-xl"
            icon="heroicons:arrow-top-right-on-square-20-solid"
            label="Open app"
            @click="$emit('open', app)"
          />
          <span
            v-else-if="isInstalled"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/70 dark:border-emerald-900/50"
          >
            <AppIcon name="heroicons:check-20-solid" size="w-4 h-4" />
            <span>Installed</span>
          </span>
          <AppButton
            v-else
            variant="primary"
            size="md"
            rounded="rounded-xl"
            icon="heroicons:arrow-down-tray-20-solid"
            label="Install app"
            :loading="isInstalling"
            :disabled="apiCompatibility === false"
            @click="$emit('install', app)"
          />
        </div>
      </div>
    </div>

    <!-- Main 12-Column Grid matching FynnCloud admin layout -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
      <!-- Left Column: Previews & Documentation (8 of 12 columns) -->
      <div class="lg:col-span-8 space-y-4 min-w-0">
        <!-- 16:9 Screenshot Stage (only when the app actually has screenshots) -->
        <AppCard v-if="allImages.length > 0" as="section">
          <div
            class="relative aspect-video w-full bg-neutral-950 overflow-hidden group cursor-pointer"
            @click="openLightbox(activeImageIndex)"
          >
            <img
              :src="allImages[activeImageIndex]"
              :alt="`${app.name} screenshot ${activeImageIndex + 1}`"
              class="w-full h-full object-cover"
            />
            <button
              type="button"
              aria-label="Fullscreen preview"
              class="absolute bottom-3 right-3 w-8 h-8 rounded-lg bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-opacity opacity-0 group-hover:opacity-100 cursor-pointer border border-white/10"
              @click.stop="openLightbox(activeImageIndex)"
            >
              <AppIcon name="heroicons:arrows-pointing-out-20-solid" size="w-4 h-4" />
            </button>
          </div>

          <!-- Thumbnail Strip (when multiple screenshots exist) -->
          <div
            v-if="allImages.length > 1"
            class="p-2.5 border-t border-gray-100 dark:border-neutral-800 bg-gray-50/50 dark:bg-neutral-900/50 flex items-center gap-2 overflow-x-auto"
          >
            <button
              v-for="(img, idx) in allImages"
              :key="img"
              type="button"
              class="relative h-14 w-24 shrink-0 rounded-lg overflow-hidden border transition-all cursor-pointer"
              :class="
                activeImageIndex === idx
                  ? 'border-primary-500 ring-2 ring-primary-500/25'
                  : 'border-gray-200 dark:border-neutral-700 opacity-70 hover:opacity-100'
              "
              @click="activeImageIndex = idx"
            >
              <img :src="img" :alt="`${app.name} thumbnail ${idx + 1}`" class="w-full h-full object-cover" loading="lazy" />
            </button>
          </div>
        </AppCard>

        <!-- Documentation & Integration Card -->
        <AppCard as="section">
          <div class="p-5 space-y-6">
            <div
              v-if="loadingReadme"
              class="py-8 flex items-center justify-center text-gray-400 gap-2 text-xs"
            >
              <AppIcon name="heroicons:arrow-path-20-solid" size="w-4 h-4 animate-spin" />
              <span>Loading documentation...</span>
            </div>

            <div
              v-else-if="readmeHtml"
              class="markdown-prose"
              v-html="readmeHtml"
            />

            <!-- Fallback description when an app does not provide a README.md -->
            <p
              v-else
              class="text-xs sm:text-sm text-gray-600 dark:text-neutral-300 leading-relaxed"
            >
              {{ app.description }}
            </p>

            <!-- System Integration Details (from manifest hooks & UI config) -->
            <div
              v-if="hasIntegrationDetails"
              class="space-y-3"
              :class="readmeHtml ? 'pt-5 border-t border-gray-100 dark:border-neutral-800' : ''"
            >
              <h3 class="text-base font-light text-gray-900 dark:text-neutral-100">
                FynnCloud integration
              </h3>

              <div class="divide-y divide-gray-100 dark:divide-neutral-800 rounded-xl border border-gray-200/80 dark:border-neutral-800 overflow-hidden">
                <!-- File Actions -->
                <div
                  v-for="action in fileActions"
                  :key="action.id"
                  class="px-3.5 py-2.5 flex items-center justify-between gap-4 text-xs bg-white dark:bg-neutral-900"
                >
                  <div class="min-w-0">
                    <div class="font-medium text-gray-900 dark:text-neutral-100">
                      {{ action.label }}
                    </div>
                    <div class="text-gray-500 dark:text-neutral-400 mt-0.5">
                      {{ action.role === 'open' ? 'Opens files directly' : 'File context menu action' }}
                      <span v-if="action.mode" class="text-gray-400 dark:text-neutral-500">({{ action.mode }})</span>
                    </div>
                  </div>
                  <div v-if="Array.isArray(action.extensions)" class="flex items-center gap-1 flex-wrap justify-end shrink-0">
                    <code
                      v-for="ext in action.extensions"
                      :key="ext"
                      class="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-neutral-800 text-[11px] font-mono text-gray-700 dark:text-neutral-300"
                    >
                      {{ ext === '*' ? 'All files' : `.${ext}` }}
                    </code>
                  </div>
                </div>

                <!-- New File Menu Entries -->
                <div
                  v-for="nf in newFileHooks"
                  :key="nf.id"
                  class="px-3.5 py-2.5 flex items-center justify-between gap-4 text-xs bg-white dark:bg-neutral-900"
                >
                  <div class="min-w-0">
                    <div class="font-medium text-gray-900 dark:text-neutral-100">
                      New {{ nf.label }}
                    </div>
                    <div class="text-gray-500 dark:text-neutral-400 mt-0.5">
                      Adds option to the "New" file creation menu
                    </div>
                  </div>
                  <code
                    v-if="nf.extension"
                    class="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-neutral-800 text-[11px] font-mono text-gray-700 dark:text-neutral-300 shrink-0"
                  >
                    .{{ nf.extension }}
                  </code>
                </div>

                <!-- Sidebar Navigation Items -->
                <div
                  v-if="sidebarItems.length > 0"
                  class="px-3.5 py-2.5 flex items-center justify-between gap-4 text-xs bg-white dark:bg-neutral-900"
                >
                  <div>
                    <div class="font-medium text-gray-900 dark:text-neutral-100">
                      Host sidebar navigation
                    </div>
                    <div class="text-gray-500 dark:text-neutral-400 mt-0.5">
                      {{ sidebarItems.map((s: any) => s.label).join(' · ') }}
                    </div>
                  </div>
                  <span class="text-[11px] font-mono text-gray-500 dark:text-neutral-400 shrink-0">
                    {{ sidebarItems.length }} {{ sidebarItems.length === 1 ? 'link' : 'links' }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </AppCard>
      </div>

      <!-- Right Column: Structured Metadata & Permissions Sidebar (4 of 12 columns) -->
      <div class="lg:col-span-4 space-y-4 min-w-0">
        <!-- App Information Card (matches admin/index.vue System Info card) -->
        <AppCard as="section">
          <h2 class="px-4 pb-1 pt-3 text-lg font-light text-gray-900 dark:text-neutral-100">
            Information
          </h2>

          <dl class="divide-y divide-gray-100 dark:divide-neutral-800 mt-1">
            <div
              v-for="row in infoRows"
              :key="row.label"
              class="flex items-center justify-between gap-4 px-4 py-2.5"
            >
              <dt class="text-xs text-gray-500 dark:text-neutral-400">
                {{ row.label }}
              </dt>
              <dd
                class="inline-flex items-center gap-1.5 text-xs font-medium text-right"
                :class="[
                  row.mono ? 'font-mono tabular-nums' : '',
                  row.capitalize ? 'capitalize' : '',
                  row.status === 'compatible'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : row.status === 'incompatible'
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-gray-900 dark:text-neutral-100'
                ]"
              >
                <span
                  v-if="row.status"
                  class="w-1.5 h-1.5 rounded-full shrink-0"
                  :class="row.status === 'compatible' ? 'bg-emerald-500' : 'bg-red-500'"
                />
                <span>{{ row.value }}</span>
              </dd>
            </div>
          </dl>
        </AppCard>

        <!-- Permissions Card -->
        <AppCard as="section">
          <div class="px-4 pb-1 pt-3 flex items-baseline justify-between">
            <h2 class="text-lg font-light text-gray-900 dark:text-neutral-100">
              Permissions
            </h2>
            <span class="text-xs font-mono text-gray-400 dark:text-neutral-500">
              {{ formattedPermissions.length }}
            </span>
          </div>

          <div
            v-if="formattedPermissions.length > 0"
            class="divide-y divide-gray-100 dark:divide-neutral-800 mt-1"
          >
            <div
              v-for="perm in formattedPermissions"
              :key="perm.scope"
              class="px-4 py-2.5 space-y-0.5"
            >
              <div class="flex items-center justify-between gap-2">
                <span class="text-xs font-medium text-gray-900 dark:text-neutral-100">
                  {{ perm.label }}
                </span>
                <code class="text-[11px] font-mono text-gray-400 dark:text-neutral-500">
                  {{ perm.scope }}
                </code>
              </div>
              <p class="text-[11px] text-gray-500 dark:text-neutral-400 leading-snug">
                {{ perm.detail }}
              </p>
            </div>
          </div>

          <p v-else class="px-4 py-3 text-xs text-gray-500 dark:text-neutral-400">
            No special permissions required.
          </p>
        </AppCard>

        <!-- Container image Card -->
        <AppCard v-if="containerImage" as="section">
          <div class="px-4 pb-1 pt-3 flex items-center justify-between">
            <h2 class="text-lg font-light text-gray-900 dark:text-neutral-100">
              Container image
            </h2>
            <button
              type="button"
              class="text-xs text-gray-500 hover:text-gray-900 dark:text-neutral-400 dark:hover:text-neutral-100 transition-colors cursor-pointer"
              @click="copyImage"
            >
              {{ imageCopyFeedback ? 'Copied' : 'Copy' }}
            </button>
          </div>
          <div class="px-4 pb-3 pt-1">
            <code class="block text-[11px] font-mono text-gray-600 dark:text-neutral-400 break-all leading-relaxed">
              {{ containerImage }}
            </code>
          </div>
        </AppCard>
      </div>
    </div>

    <!-- Screenshot Lightbox -->
    <ScreenshotLightbox
      :is-open="isLightboxOpen"
      :images="allImages"
      :current-index="lightboxIndex"
      @update:current-index="lightboxIndex = $event"
      @close="isLightboxOpen = false"
    />
  </div>
</template>
