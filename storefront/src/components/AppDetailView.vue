<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import type { CatalogApp, InstalledAppInfo } from '../types'
import { getCachedReadmeHtml, fetchReadmeHtml } from '../composables/useCatalog'
import { isCompatible as checkCompatible } from '../utils/compatibility'
import AppVectorIcon from './AppVectorIcon.vue'
import AppButton from './AppButton.vue'
import AppIcon from './AppIcon.vue'
import ScreenshotLightbox from './ScreenshotLightbox.vue'

const props = defineProps<{
  app: CatalogApp
  installedInfo: InstalledAppInfo | null
  isInstalling: boolean
  hostVersion?: string | null
  hostApiVersion?: string | null
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
const showAllPermissions = ref(false)

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

const prevImage = () => {
  if (allImages.value.length > 1) {
    activeImageIndex.value = (activeImageIndex.value - 1 + allImages.value.length) % allImages.value.length
  }
}

const nextImage = () => {
  if (allImages.value.length > 1) {
    activeImageIndex.value = (activeImageIndex.value + 1) % allImages.value.length
  }
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
    showAllPermissions.value = false
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

const storageLabel = computed(() => {
  const hasDb = Boolean(props.app?.manifest?.database)
  const hasStorage = Boolean(props.app?.manifest?.storage)
  if (hasDb && hasStorage) return 'PostgreSQL · Volume'
  if (hasDb) return 'PostgreSQL'
  if (hasStorage) return 'Persistent volume'
  return null
})

const currentHostVersion = computed(() => props.hostVersion || props.hostApiVersion || null)
const fynncloudRange = computed(() => props.app?.manifest?.compatibility?.fynncloud || null)

const isCompatible = computed<boolean | null>(() => {
  if (!props.isEmbedded || !currentHostVersion.value) return null
  return checkCompatible(fynncloudRange.value, currentHostVersion.value)
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
const companionApps = computed(() => {
  const list = props.app?.manifest?.compatibility?.apps
  return Array.isArray(list) ? list : []
})
const publicPaths = computed<string[]>(() => {
  const list = props.app?.manifest?.gateway?.public_paths
  return Array.isArray(list) ? list.filter((p: unknown): p is string => typeof p === 'string' && p.length > 0) : []
})

const describeFileAction = (action: { role?: string; mode?: string; destination?: string }): string => {
  if (action.role === 'open' && action.mode === 'modal') {
    return 'Opens files in an overlay editor'
  }
  if (action.role === 'open') {
    return 'Opens files directly from the file browser'
  }
  if (action.mode === 'background' && action.destination === 'folder') {
    return 'Runs in background · Prompts for destination folder'
  }
  if (action.mode === 'background') {
    return 'Runs in background from the file context menu'
  }
  return 'Available in the file context menu'
}

const formatAppId = (id: string): string => {
  return id
    .split('-')
    .map((part) => (part ? part.charAt(0).toUpperCase() + part.slice(1) : ''))
    .join(' ')
}

const integrationItems = computed(() => {
  const items: { key: string; title: string; description: string; tags: string[] }[] = []

  for (const action of fileActions.value) {
    items.push({
      key: `fa-${action.id}`,
      title: action.label,
      description: describeFileAction(action),
      tags: Array.isArray(action.extensions)
        ? action.extensions.map((ext: string) => (ext === '*' ? 'All files' : `.${ext}`))
        : []
    })
  }

  for (const nf of newFileHooks.value) {
    items.push({
      key: `nf-${nf.id}`,
      title: `New ${nf.label}`,
      description: 'Adds creation shortcut to the "New" menu',
      tags: nf.extension ? [`.${nf.extension}`] : []
    })
  }

  if (sidebarItems.value.length > 0) {
    items.push({
      key: 'sidebar-nav',
      title: 'Sidebar navigation',
      description: sidebarItems.value.map((s: any) => s.label).join(' · '),
      tags: [`${sidebarItems.value.length} ${sidebarItems.value.length === 1 ? 'item' : 'items'}`]
    })
  }

  for (const comp of companionApps.value) {
    items.push({
      key: `comp-${comp.id}`,
      title: `Connects with ${formatAppId(comp.id)}`,
      description: `${comp.optional === false ? 'Required' : 'Optional'} · ${comp.access === 'write' ? 'Read & write' : 'Read'}`,
      tags: [comp.version]
    })
  }

  if (publicPaths.value.length > 0) {
    items.push({
      key: 'gateway-paths',
      title: 'Public gateway',
      description: "Forwards requests under exposed paths to the app's own authentication",
      tags: publicPaths.value
    })
  }

  return items
})

const hasIntegrationDetails = computed(() => integrationItems.value.length > 0)

const stripLocalDevSection = (html: string): string => {
  if (!html) return ''
  if (typeof DOMParser === 'undefined') {
    return html.replace(/<h2[^>]*>\s*Local [Dd]evelopment\s*<\/h2>[\s\S]*?(?=<h2\b|$)/gi, '').trim()
  }
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const headings = Array.from(doc.body.querySelectorAll('h2'))
  for (const h2 of headings) {
    if (/^local development$/i.test((h2.textContent || '').trim())) {
      let cursor: ChildNode | null = h2.nextSibling
      h2.remove()
      while (cursor) {
        const nextNode = cursor.nextSibling
        if (cursor.nodeType === Node.ELEMENT_NODE && (cursor as Element).tagName === 'H2') {
          break
        }
        cursor.parentNode?.removeChild(cursor)
        cursor = nextNode
      }
    }
  }
  return doc.body.innerHTML.trim()
}

const processedReadmeHtml = computed(() => {
  if (!readmeHtml.value) return ''
  if (props.app?.category?.toLowerCase() === 'developer') return readmeHtml.value
  return stripLocalDevSection(readmeHtml.value)
})

const hasMeaningfulReadme = computed<boolean>(() => {
  const html = processedReadmeHtml.value
  if (!html) return false
  const plainText = html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!plainText) return false

  const hasStructure = /<(h[1-4]|ul|ol|pre|code|table|blockquote)\b/i.test(html)
  if (hasIntegrationDetails.value && !hasStructure && plainText.length < 180) {
    return false
  }
  return true
})

const primaryInfoRows = computed(() => {
  const rows: {
    label: string
    value: string
    mono?: boolean
    capitalize?: boolean
    action?: 'category'
    status?: 'compatible' | 'incompatible' | null
  }[] = [
    { label: 'Version', value: `v${props.app.version}`, mono: true },
    { label: 'Category', value: props.app.category || 'general', capitalize: true, action: 'category' },
    { label: 'Type', value: appTypeLabel.value }
  ]
  if (latestReleaseDate.value) {
    rows.push({ label: 'Released', value: latestReleaseDate.value })
  }
  if (fynncloudRange.value) {
    rows.push({
      label: 'FynnCloud',
      value: fynncloudRange.value,
      mono: true,
      status:
        isCompatible.value === true
          ? 'compatible'
          : isCompatible.value === false
            ? 'incompatible'
            : null
    })
  }
  return rows
})

const technicalRows = computed(() => {
  const rows: { label: string; value: string; mono?: boolean }[] = []
  if (architecturesLabel.value) {
    rows.push({ label: 'Architectures', value: architecturesLabel.value, mono: true })
  }
  if (resourcesLabel.value) {
    rows.push({ label: 'Resources', value: resourcesLabel.value, mono: true })
  }
  if (storageLabel.value) {
    rows.push({ label: 'Data', value: storageLabel.value })
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
  'groups:read': {
    label: 'Group memberships',
    detail: 'Read groups and their members in FynnCloud'
  },
  'users:events': {
    label: 'User & group events',
    detail: 'Receive updates when users or groups change in FynnCloud'
  },
  'notifications:send': {
    label: 'Notifications',
    detail: 'Display status notifications and alerts in FynnCloud'
  },
  'realtime:push': {
    label: 'Real-time updates',
    detail: 'Push live updates and status events to open app views'
  },
  'media:capture': {
    label: 'Camera, microphone & screen',
    detail: 'Request audio, video, or screen capture when you join a call'
  },
  'rtc:rooms': {
    label: 'Real-time call rooms',
    detail: 'Create and manage isolated audio/video call rooms'
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

const visiblePermissions = computed(() => {
  if (showAllPermissions.value) return formattedPermissions.value
  return formattedPermissions.value.slice(0, 4)
})

const containerImage = computed(() => props.app?.manifest?.deploy?.image || props.app?.image || null)

const parsedImage = computed(() => {
  const raw = containerImage.value
  if (!raw) return null
  const atIndex = raw.indexOf('@')
  if (atIndex === -1) {
    return { reference: raw, digest: null as string | null, shortDigest: null as string | null }
  }
  const reference = raw.slice(0, atIndex)
  const digest = raw.slice(atIndex + 1)
  let shortDigest = digest
  if (digest.startsWith('sha256:') && digest.length > 24) {
    const hex = digest.slice(7)
    shortDigest = `sha256:${hex.slice(0, 12)}…${hex.slice(-8)}`
  }
  return { reference, digest, shortDigest }
})

const hasTechnicalDetails = computed(() => {
  return (
    technicalRows.value.length > 0 ||
    Boolean(parsedImage.value) ||
    formattedPermissions.value.length > 0
  )
})

const copyState = ref<'idle' | 'copied' | 'failed'>('idle')
const copyStatusText = ref('')
let copyTimer: ReturnType<typeof setTimeout> | null = null
let lastAnnouncedCopyMessage = ''

const legacyCopy = (text: string): boolean => {
  const field = Object.assign(document.createElement('textarea'), { value: text })
  field.setAttribute('readonly', '')
  field.style.cssText = 'position:fixed;inset-block-start:0;opacity:0'
  document.body.append(field)
  field.select()
  try {
    return document.execCommand('copy')
  } finally {
    field.remove()
  }
}

const reportCopy = (ok: boolean) => {
  if (copyTimer) clearTimeout(copyTimer)
  copyState.value = ok ? 'copied' : 'failed'
  let message = ok ? 'Copied' : 'Copy failed'
  if (message === lastAnnouncedCopyMessage) {
    message += '\u00A0'
  }
  lastAnnouncedCopyMessage = message
  copyStatusText.value = ''
  requestAnimationFrame(() => {
    copyStatusText.value = message
  })
  copyTimer = setTimeout(() => {
    copyState.value = 'idle'
    copyStatusText.value = ''
    copyTimer = null
  }, 2000)
}

const copyImage = async () => {
  const text = containerImage.value
  if (!text) return
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
    } else if (!legacyCopy(text)) {
      throw new Error('Copy failed')
    }
    reportCopy(true)
  } catch {
    try {
      if (legacyCopy(text)) {
        reportCopy(true)
      } else {
        reportCopy(false)
      }
    } catch {
      reportCopy(false)
    }
  }
}

onUnmounted(() => {
  if (copyTimer) clearTimeout(copyTimer)
})
</script>

<template>
  <div class="space-y-6">
    <!-- Compact Top Navigation + Atmospheric Hero Showcase -->
    <div class="space-y-3">
      <nav aria-label="Breadcrumb" class="flex items-center gap-1 text-xs text-gray-500 dark:text-zinc-400">
        <button
          type="button"
          class="group inline-flex items-center gap-1 font-medium text-gray-600 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 px-1.5 py-0.5 -ml-1.5 rounded-md hover:bg-gray-200/60 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
          @click="$emit('back')"
        >
          <AppIcon name="heroicons:arrow-left-20-solid" size="w-3.5 h-3.5" class="transition-transform duration-150 group-hover:-translate-x-0.5" />
          <span>Apps</span>
        </button>
        <AppIcon name="heroicons:chevron-right-20-solid" size="w-3.5 h-3.5" class="text-gray-300 dark:text-zinc-700" />
        <button
          type="button"
          class="capitalize hover:text-gray-900 dark:hover:text-zinc-100 px-1.5 py-0.5 rounded-md hover:bg-gray-200/60 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
          @click="$emit('selectCategory', app.category)"
        >
          {{ app.category }}
        </button>
        <AppIcon name="heroicons:chevron-right-20-solid" size="w-3.5 h-3.5" class="text-gray-300 dark:text-zinc-700" />
        <span class="text-gray-900 dark:text-zinc-200 font-medium truncate px-1">{{ app.name }}</span>
      </nav>

      <!-- Atmospheric Hero Showcase Stage -->
      <section
        class="relative overflow-clip rounded-2xl px-5 py-5 sm:px-7 sm:py-6
               border border-gray-200/90 dark:border-zinc-800/90
               bg-linear-to-br from-white via-white to-primary-50/70
               dark:from-zinc-900/95 dark:via-zinc-900/90 dark:to-primary-950/35
               shadow-[inset_0_1px_2px_rgba(255,255,255,0.7),0_4px_16px_-4px_rgba(0,0,0,0.06)]
               dark:shadow-[inset_0_1px_2px_rgba(255,255,255,0.05),0_18px_40px_-14px_rgba(0,0,0,0.6)]"
      >
        <div
          class="pointer-events-none absolute -top-20 -left-16 w-72 h-72 rounded-full bg-primary-500/12 dark:bg-primary-500/18 blur-3xl"
          aria-hidden="true"
        />
        <div
          class="pointer-events-none select-none absolute -right-6 -bottom-10 text-primary-600/[0.05] dark:text-primary-400/[0.06] -rotate-12"
          aria-hidden="true"
        >
          <AppVectorIcon :icon-url="app.icon_url" :app-id="app.id" size="w-44 h-44" />
        </div>

        <div class="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div class="flex items-start sm:items-center gap-4 sm:gap-5 min-w-0">
            <!-- 3D Specular App Icon Tile -->
            <div
              class="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl shrink-0 flex items-center justify-center
                     bg-linear-to-b from-white to-primary-200/85 dark:from-neutral-800 dark:to-primary-950
                     border-[0.5px] border-primary-200/70 dark:border-white/[0.06]
                     shadow-[inset_0_2px_3px_rgba(255,255,255,0.9),0_8px_20px_-4px_rgba(0,0,0,0.12)]
                     dark:shadow-[inset_0_1px_2px_rgba(255,255,255,0.15),0_10px_24px_-4px_rgba(0,0,0,0.55)]
                     text-primary-600 dark:text-white"
            >
              <AppVectorIcon :icon-url="app.icon_url" :app-id="app.id" size="w-8 h-8 sm:w-9 sm:h-9" />
            </div>

            <div class="min-w-0">
              <h1 class="text-2xl sm:text-3xl font-light tracking-tight text-gray-900 dark:text-white leading-tight">
                {{ app.name }}
              </h1>
              <p class="mt-0.5 text-xs text-gray-400 dark:text-neutral-400">
                by {{ app.author || 'FynnCloud' }}
              </p>
              <p class="mt-2 text-xs sm:text-sm text-gray-600 dark:text-neutral-300 max-w-2xl leading-relaxed">
                {{ app.description }}
              </p>
            </div>
          </div>

          <!-- Primary Action Area (embedded host only) -->
          <div v-if="isEmbedded" class="relative z-10 flex flex-col sm:items-end gap-1.5 shrink-0">
            <div class="flex items-center gap-2.5 flex-wrap">
              <template v-if="isInstalled">
                <span class="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  <AppIcon name="heroicons:check-20-solid" size="w-4 h-4" />
                  <span>Installed</span>
                </span>
                <AppButton
                  v-if="hasUpdate"
                  variant="primary"
                  size="md"
                  rounded="rounded-lg"
                  icon="heroicons:arrow-up-circle-20-solid"
                  :label="`Update to v${app.version}`"
                  :loading="isInstalling"
                  @click="$emit('install', app)"
                />
                <AppButton
                  v-else-if="hasWebUi"
                  variant="secondary"
                  size="md"
                  rounded="rounded-lg"
                  icon="heroicons:arrow-top-right-on-square-20-solid"
                  label="Open"
                  @click="$emit('open', app)"
                />
              </template>

              <AppButton
                v-else
                variant="primary"
                size="md"
                rounded="rounded-lg"
                icon="heroicons:arrow-down-tray-20-solid"
                label="Install"
                :loading="isInstalling"
                :disabled="isCompatible === false"
                @click="$emit('install', app)"
              />
            </div>

            <span
              v-if="isCompatible === false && !isInstalled"
              class="text-[11px] text-red-600 dark:text-red-400 sm:text-right"
            >
              Requires FynnCloud {{ fynncloudRange }} (current: v{{ currentHostVersion }})
            </span>
          </div>
        </div>
      </section>
    </div>

    <!-- Main 12-Column Grid: Open Editorial Left + Single Quiet Inspector Right -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
      <!-- Left Column: Cinema Stage + Editorial Docs + Bento Capabilities (8 of 12 columns) -->
      <div class="lg:col-span-8 space-y-7 min-w-0">
        <!-- Cinema Screenshot Gallery (only when screenshots exist) -->
        <section
          v-if="allImages.length > 0"
          class="rounded-2xl overflow-clip ring-1 ring-gray-200/90 dark:ring-white/[0.09] bg-linear-to-b from-gray-200/65 to-gray-100/40 dark:from-neutral-900 dark:to-neutral-950 shadow-sm dark:shadow-[0_16px_36px_-12px_rgba(0,0,0,0.6)]"
        >
          <div class="relative p-2.5 sm:p-3 select-none group">
            <div
              class="relative overflow-clip rounded-lg ring-1 ring-black/[0.08] dark:ring-white/[0.08] shadow-xs bg-neutral-950 flex items-center justify-center cursor-zoom-in"
              @click="openLightbox(activeImageIndex)"
            >
              <Transition name="detail-screenshot" mode="out-in">
                <img
                  :key="activeImageIndex"
                  :src="allImages[activeImageIndex]"
                  :alt="`${app.name} screenshot ${activeImageIndex + 1}`"
                  :fetchpriority="activeImageIndex === 0 ? 'high' : undefined"
                  :width="activeImageIndex === 0 && app.hero_dimensions ? app.hero_dimensions.width : undefined"
                  :height="activeImageIndex === 0 && app.hero_dimensions ? app.hero_dimensions.height : undefined"
                  class="w-full h-auto max-h-[560px] object-contain block"
                />
              </Transition>
            </div>

            <button
              v-if="allImages.length > 1"
              type="button"
              aria-label="Previous screenshot"
              class="absolute left-5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-black/55 hover:bg-black/75 backdrop-blur-md text-white flex items-center justify-center transition-opacity opacity-0 group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100 cursor-pointer border border-white/15"
              @click.stop="prevImage"
            >
              <AppIcon name="heroicons:chevron-left-20-solid" size="w-4 h-4" />
            </button>

            <button
              v-if="allImages.length > 1"
              type="button"
              aria-label="Next screenshot"
              class="absolute right-5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-black/55 hover:bg-black/75 backdrop-blur-md text-white flex items-center justify-center transition-opacity opacity-0 group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100 cursor-pointer border border-white/15"
              @click.stop="nextImage"
            >
              <AppIcon name="heroicons:chevron-right-20-solid" size="w-4 h-4" />
            </button>

            <button
              type="button"
              aria-label="Expand screenshot"
              class="absolute bottom-5 right-5 w-8 h-8 rounded-lg bg-black/55 hover:bg-black/75 backdrop-blur-md text-white flex items-center justify-center transition-opacity opacity-0 group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100 cursor-pointer border border-white/15"
              @click.stop="openLightbox(activeImageIndex)"
            >
              <AppIcon name="heroicons:arrows-pointing-out-20-solid" size="w-4 h-4" />
            </button>
          </div>

          <!-- Filmstrip Thumbnails (uncropped) -->
          <div
            v-if="allImages.length > 1"
            class="px-3 py-2.5 border-t border-gray-200/70 dark:border-white/[0.06] bg-white/40 dark:bg-black/25 flex items-center justify-between gap-3"
          >
            <div class="flex items-center gap-2 overflow-x-auto scrollbar-hide py-0.5 px-0.5">
              <button
                v-for="(img, idx) in allImages"
                :key="img"
                type="button"
                class="relative h-12 aspect-[16/9] shrink-0 rounded-md overflow-clip transition-all duration-150 cursor-pointer bg-neutral-950"
                :class="
                  activeImageIndex === idx
                    ? 'ring-2 ring-primary-500 dark:ring-primary-400 opacity-100'
                    : 'ring-1 ring-gray-300/80 dark:ring-white/10 opacity-55 hover:opacity-90'
                "
                :aria-label="`Show screenshot ${idx + 1}`"
                @click="activeImageIndex = idx"
              >
                <img :src="img" :alt="`${app.name} thumbnail ${idx + 1}`" class="w-full h-full object-contain block" loading="lazy" />
              </button>
            </div>
            <span class="text-[11px] font-mono tabular-nums text-gray-500 dark:text-zinc-400 shrink-0">
              {{ activeImageIndex + 1 }} / {{ allImages.length }}
            </span>
          </div>
        </section>

        <!-- Open Editorial Documentation -->
        <section v-if="loadingReadme || hasMeaningfulReadme || !hasIntegrationDetails" class="space-y-4">
          <Transition name="fade-quick" mode="out-in">
            <div
              v-if="loadingReadme"
              key="loading"
              class="py-8 flex items-center justify-center text-gray-400 dark:text-zinc-500 gap-2 text-xs"
            >
              <AppIcon name="heroicons:arrow-path-20-solid" size="w-4 h-4 animate-spin" />
              <span>Loading documentation...</span>
            </div>

            <div
              v-else-if="hasMeaningfulReadme"
              key="html"
              class="markdown-prose detail-prose"
              v-html="processedReadmeHtml"
            />

            <p
              v-else
              key="fallback"
              class="text-sm text-gray-600 dark:text-zinc-300 leading-relaxed"
            >
              {{ app.description }}
            </p>
          </Transition>
        </section>

        <!-- Translucent Bento Integration Tiles -->
        <section v-if="hasIntegrationDetails" class="space-y-3">
          <h2 class="text-lg font-normal tracking-tight text-gray-900 dark:text-zinc-100">
            Works with FynnCloud
          </h2>

          <div
            :class="integrationItems.length > 1 ? 'grid grid-cols-1 sm:grid-cols-2 gap-3' : 'grid grid-cols-1 gap-3'"
          >
            <div
              v-for="item in integrationItems"
              :key="item.key"
              class="rounded-xl p-4 flex flex-col justify-between gap-3
                     border border-gray-200/85 dark:border-zinc-800/90
                     bg-white dark:bg-zinc-900/70
                     shadow-2xs"
            >
              <div>
                <div class="text-[13px] font-medium text-gray-900 dark:text-zinc-100">
                  {{ item.title }}
                </div>
                <div class="text-xs text-gray-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                  {{ item.description }}
                </div>
              </div>

              <div v-if="item.tags.length > 0" class="flex flex-wrap gap-1.5">
                <code
                  v-for="tag in item.tags"
                  :key="tag"
                  class="px-2 py-0.5 rounded-md bg-gray-100/90 dark:bg-white/[0.06] text-[11px] font-mono text-gray-600 dark:text-zinc-300"
                >
                  {{ tag }}
                </code>
              </div>
            </div>
          </div>
        </section>
      </div>

      <!-- Right Column: Single Quiet Translucent Inspector (4 of 12 columns) -->
      <aside
        class="lg:col-span-4 min-w-0 rounded-2xl overflow-clip
               border border-gray-200/85 dark:border-zinc-800/90
               bg-white dark:bg-zinc-900/70
               shadow-2xs"
      >
        <!-- Compact Store Facts -->
        <dl class="p-4 space-y-2.5 text-xs">
          <div
            v-for="row in primaryInfoRows"
            :key="row.label"
            class="flex items-center justify-between gap-4"
          >
            <dt class="text-gray-500 dark:text-zinc-400">
              {{ row.label }}
            </dt>
            <dd
              class="inline-flex items-center gap-1.5 font-medium text-right"
              :class="[
                row.mono ? 'font-mono tabular-nums' : '',
                row.capitalize ? 'capitalize' : '',
                row.status === 'compatible'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : row.status === 'incompatible'
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-gray-900 dark:text-zinc-100'
              ]"
            >
              <span
                v-if="row.status"
                class="w-1.5 h-1.5 rounded-full shrink-0"
                :class="row.status === 'compatible' ? 'bg-emerald-500' : 'bg-red-500'"
              />
              <button
                v-if="row.action === 'category'"
                type="button"
                class="capitalize text-primary-600 dark:text-primary-400 hover:underline cursor-pointer"
                @click="$emit('selectCategory', app.category)"
              >
                {{ row.value }}
              </button>
              <span v-else>{{ row.value }}</span>
            </dd>
          </div>
        </dl>

        <!-- Human-English Access & Privacy -->
        <div class="px-4 py-4 border-t border-gray-200/60 dark:border-white/[0.06]">
          <div class="text-xs font-medium text-gray-400 dark:text-zinc-500 mb-2.5">
            Access &amp; privacy
          </div>

          <template v-if="formattedPermissions.length > 0">
            <div class="space-y-2.5">
              <div
                v-for="perm in visiblePermissions"
                :key="perm.scope"
                class="space-y-0.5"
              >
                <div class="text-xs font-medium text-gray-800 dark:text-zinc-200" :title="perm.scope">
                  {{ perm.label }}
                </div>
                <p class="text-[11px] text-gray-500 dark:text-zinc-400 leading-snug">
                  {{ perm.detail }}
                </p>
              </div>
            </div>

            <button
              v-if="formattedPermissions.length > 4"
              type="button"
              class="mt-2.5 text-xs font-medium text-primary-600 dark:text-primary-400 hover:underline cursor-pointer"
              @click="showAllPermissions = !showAllPermissions"
            >
              {{ showAllPermissions ? 'Show fewer' : `Show all ${formattedPermissions.length} permissions` }}
            </button>
          </template>

          <p v-else class="text-xs text-gray-500 dark:text-zinc-400 leading-relaxed">
            Runs in an isolated sandbox with no host permissions.
          </p>
        </div>

        <!-- On-Demand Technical Details Disclosure -->
        <details
          v-if="hasTechnicalDetails"
          class="tech-details border-t border-gray-200/60 dark:border-white/[0.06]"
        >
          <summary
            class="tech-summary px-4 py-3 text-xs font-medium text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors select-none"
          >
            Technical details
          </summary>

          <div class="px-4 pb-4 pt-1 space-y-3.5 text-xs">
            <dl v-if="technicalRows.length > 0" class="space-y-2">
              <div
                v-for="row in technicalRows"
                :key="row.label"
                class="flex items-center justify-between gap-4"
              >
                <dt class="text-gray-500 dark:text-zinc-400">
                  {{ row.label }}
                </dt>
                <dd
                  class="font-medium text-gray-800 dark:text-zinc-200 text-right"
                  :class="row.mono ? 'font-mono tabular-nums' : ''"
                >
                  {{ row.value }}
                </dd>
              </div>
            </dl>

            <div v-if="parsedImage" class="space-y-1.5 pt-2 border-t border-gray-200/50 dark:border-white/[0.05]">
              <div class="flex items-center justify-between gap-2">
                <span class="text-gray-500 dark:text-zinc-400">Container image</span>
                <div class="flex items-center shrink-0">
                  <button
                    type="button"
                    class="min-w-6 min-h-6 px-1.5 py-0.5 rounded-md text-xs font-medium transition-colors cursor-pointer"
                    :class="
                      copyState === 'copied'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : copyState === 'failed'
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-gray-100 dark:hover:bg-white/[0.06]'
                    "
                    @click="copyImage"
                  >
                    {{ copyState === 'copied' ? 'Copied' : copyState === 'failed' ? 'Copy failed' : 'Copy' }}
                  </button>
                  <span role="status" class="sr-only">{{ copyStatusText }}</span>
                </div>
              </div>
              <code class="block text-[11px] font-mono text-gray-700 dark:text-zinc-300 break-all leading-relaxed select-all">
                {{ parsedImage.reference }}
              </code>
              <code
                v-if="parsedImage.shortDigest"
                :title="parsedImage.digest || undefined"
                class="block text-[11px] font-mono text-gray-400 dark:text-zinc-500 truncate select-all"
              >
                {{ parsedImage.shortDigest }}
              </code>
            </div>

            <div v-if="formattedPermissions.length > 0" class="space-y-1.5 pt-2 border-t border-gray-200/50 dark:border-white/[0.05]">
              <div class="text-gray-500 dark:text-zinc-400">
                Permission scopes
              </div>
              <div class="flex flex-wrap gap-1.5">
                <code
                  v-for="perm in formattedPermissions"
                  :key="perm.scope"
                  class="px-1.5 py-0.5 rounded-md bg-gray-100/90 dark:bg-white/[0.06] text-[10px] font-mono text-gray-600 dark:text-zinc-300"
                >
                  {{ perm.scope }}
                </code>
              </div>
            </div>
          </div>
        </details>
      </aside>
    </div>

    <!-- Native Modal Lightbox -->
    <ScreenshotLightbox
      :is-open="isLightboxOpen"
      :images="allImages"
      :current-index="lightboxIndex"
      @update:current-index="lightboxIndex = $event"
      @close="isLightboxOpen = false"
    />
  </div>
</template>

<style scoped>
.detail-prose {
  font-size: 0.875rem;
  line-height: 1.7;
  color: var(--color-gray-600);
}

:global(.dark) .detail-prose {
  color: var(--color-zinc-300);
}

.detail-prose :deep(h2) {
  font-size: 1.125rem;
  font-weight: 400;
  letter-spacing: -0.015em;
  line-height: 1.4;
  color: var(--color-gray-900);
  margin-top: 1.75rem;
  margin-bottom: 0.75rem;
}

:global(.dark) .detail-prose :deep(h2) {
  color: var(--color-zinc-100);
}

.detail-prose :deep(h2:first-child) {
  margin-top: 0;
}

.detail-prose :deep(h3) {
  font-size: 0.9375rem;
  font-weight: 500;
  margin-top: 1.25rem;
  margin-bottom: 0.5rem;
}

.detail-prose :deep(strong) {
  font-weight: 500;
  color: var(--color-gray-900);
}

:global(.dark) .detail-prose :deep(strong) {
  color: #ffffff;
}

.detail-prose :deep(ul) {
  list-style: none;
  padding-left: 0;
  margin-top: 0.5rem;
  margin-bottom: 0.75rem;
  display: grid;
  gap: 0.5rem;
}

.detail-prose :deep(ul > li) {
  position: relative;
  padding-left: 1.125rem;
  margin: 0;
}

.detail-prose :deep(ul > li::before) {
  content: "";
  position: absolute;
  top: 0.62em;
  left: 0.15rem;
  width: 5px;
  height: 5px;
  border-radius: 9999px;
  background-color: var(--color-primary-500);
}

.detail-prose :deep(ul ul) {
  margin-top: 0.375rem;
  margin-bottom: 0.25rem;
  gap: 0.35rem;
}

.detail-prose :deep(ul ul > li::before) {
  opacity: 0.55;
}

.detail-prose :deep(ol > li::marker) {
  color: var(--color-gray-400);
  font-weight: 500;
}

:global(.dark) .detail-prose :deep(ol > li::marker) {
  color: var(--color-zinc-500);
}

.tech-summary {
  list-style: none;
  display: flex;
  align-items: center;
  gap: 0.45rem;
  cursor: pointer;
}

.tech-summary::-webkit-details-marker {
  display: none;
}

.tech-summary::before {
  content: "";
  inline-size: 0.9em;
  block-size: 0.9em;
  flex-shrink: 0;
  background-color: currentColor;
  mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='currentColor'%3E%3Cpath fill-rule='evenodd' d='M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z' clip-rule='evenodd'/%3E%3C/svg%3E") no-repeat center / contain;
  rotate: -90deg;
}

.tech-summary:dir(rtl)::before {
  rotate: 90deg;
}

details.tech-details[open] > .tech-summary::before {
  rotate: 0deg;
}

details.tech-details::details-content {
  interpolate-size: allow-keywords;
  overflow: clip;
  contain: layout;
}

details.tech-details:not([open])::details-content {
  block-size: 0;
}

@media (prefers-reduced-motion: no-preference) {
  .tech-summary::before {
    transition: rotate 0.2s ease-out;
  }

  details.tech-details::details-content {
    transition-property: block-size, content-visibility, display;
    transition-duration: 220ms;
    transition-timing-function: ease-out;
    transition-behavior: allow-discrete;
  }
}
</style>
