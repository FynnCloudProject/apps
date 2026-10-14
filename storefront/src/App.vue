<script setup lang="ts">
import { computed, watch } from 'vue'
import { useCatalog } from './composables/useCatalog'
import { useHostBridge } from './composables/useHostBridge'
import StoreHeader from './components/StoreHeader.vue'
import HeroSpotlight from './components/HeroSpotlight.vue'
import CategoryFilter from './components/CategoryFilter.vue'
import CatalogAppCard from './components/CatalogAppCard.vue'
import AppDetailView from './components/AppDetailView.vue'
import AppButton from './components/AppButton.vue'
import AppIcon from './components/AppIcon.vue'
import { fetchAppIconSvg } from './components/AppVectorIcon.vue'
import type { CatalogApp } from './types'

const {
  loading,
  error,
  allApps,
  categories,
  featuredApps,
  searchQuery,
  selectedCategory,
  selectedAppId,
  selectedApp,
  selectApp,
  getFilteredApps,
  refresh
} = useCatalog()

const {
  isEmbedded,
  hostApiVersion,
  activeTheme,
  installedAppsMap,
  isInstalling,
  requestInstall,
  requestUpdate,
  requestOpenApp,
  notifyNavigation,
  applyTheme
} = useHostBridge()

watch(selectedAppId, (appId) => {
  notifyNavigation(appId)
})

const displayedApps = computed(() => getFilteredApps(installedAppsMap.value))

const handleInstall = async (app: CatalogApp) => {
  const iconSvg = await fetchAppIconSvg(app.icon_url, app.id)
  if (installedAppsMap.value.has(app.id)) {
    requestUpdate(app.id, app.manifest, iconSvg)
  } else {
    requestInstall(app.id, app.manifest, iconSvg)
  }
}

const handleOpen = (app: CatalogApp) => {
  requestOpenApp(app.id)
}

const toggleTheme = () => {
  applyTheme(activeTheme.value === 'dark' ? 'light' : 'dark', true)
}

watch(searchQuery, (newVal) => {
  if (newVal && selectedAppId.value) {
    selectApp(null)
  }
})
</script>

<template>
  <div class="min-h-screen flex flex-col bg-gray-100 dark:bg-zinc-950 text-gray-900 dark:text-zinc-100 font-sans transition-colors duration-200">
    <StoreHeader
      :search-query="searchQuery"
      :is-embedded="isEmbedded"
      :active-theme="activeTheme"
      @update:search-query="searchQuery = $event"
      @toggle-theme="toggleTheme"
      @home="selectApp(null); searchQuery = ''; selectedCategory = 'all'"
    />

    <main
      class="flex-1 w-full mx-auto"
      :class="isEmbedded ? 'pb-6' : 'max-w-7xl px-4 sm:px-6 py-6'"
    >
      <div v-if="loading" class="space-y-4 animate-pulse">
        <div class="h-10 w-48 rounded-lg bg-gray-200/60 dark:bg-neutral-800/50" />
        <div class="h-64 w-full rounded-xl bg-gray-200/60 dark:bg-neutral-800/50" />
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          <div v-for="i in 6" :key="i" class="h-40 rounded-xl bg-gray-200/60 dark:bg-neutral-800/50" />
        </div>
      </div>

      <div v-else-if="error" class="py-16 flex flex-col items-center text-center max-w-md mx-auto">
        <AppIcon name="heroicons:exclamation-triangle-20-solid" size="w-7 h-7" class="text-red-500 mb-2" />
        <h3 class="text-sm font-medium text-gray-900 dark:text-gray-100">Unable to load catalog</h3>
        <p class="mt-0.5 text-xs text-gray-500 dark:text-neutral-400 mb-3">{{ error }}</p>
        <AppButton variant="primary" size="sm" rounded="rounded-lg" label="Retry" @click="refresh" />
      </div>

      <AppDetailView
        v-else-if="selectedApp"
        :app="selectedApp"
        :installed-info="installedAppsMap.get(selectedApp.id) || null"
        :is-installing="isInstalling(selectedApp.id)"
        :host-api-version="hostApiVersion"
        :is-embedded="isEmbedded"
        @back="selectApp(null)"
        @select-category="selectedCategory = $event; selectApp(null)"
        @install="handleInstall"
        @open="handleOpen"
      />

      <div v-else class="space-y-4">
        <div
          v-if="!isEmbedded"
          class="flex flex-col lg:flex-row lg:items-end justify-between gap-4"
        >
          <div>
            <h1 class="text-4xl font-medium text-gray-900 dark:text-gray-100">
              Apps
            </h1>
            <p class="mt-1 text-xs text-gray-500 dark:text-neutral-400">
              Browse and install apps for FynnCloud
            </p>
          </div>

          <CategoryFilter
            :categories="categories"
            :selected-category="selectedCategory"
            :apps="allApps"
            :installed-map="installedAppsMap"
            :is-embedded="isEmbedded"
            @select-category="selectedCategory = $event"
          />
        </div>

        <div
          v-else
          class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3"
        >
          <CategoryFilter
            :categories="categories"
            :selected-category="selectedCategory"
            :apps="allApps"
            :installed-map="installedAppsMap"
            :is-embedded="isEmbedded"
            @select-category="selectedCategory = $event"
          />

          <div class="w-full sm:w-72 shrink-0">
            <div
              class="group relative w-full h-9 flex items-center justify-between rounded-xl border transition-all duration-200
                     border-gray-200/80 dark:border-white/10 bg-gray-100/80 hover:bg-gray-200/60 dark:bg-zinc-800/60 dark:hover:bg-zinc-800/90
                     focus-within:border-primary-500/50 dark:focus-within:border-primary-400/50 focus-within:ring-2 focus-within:ring-primary-500/30 dark:focus-within:ring-primary-400/30 focus-within:bg-white dark:focus-within:bg-zinc-800"
            >
              <div class="flex items-center pl-3 shrink-0 pointer-events-none text-zinc-400 dark:text-zinc-500 group-focus-within:text-primary-600 dark:group-focus-within:text-primary-400 transition-colors">
                <AppIcon name="heroicons:magnifying-glass-20-solid" size="w-4 h-4" />
              </div>
              <input
                v-model="searchQuery"
                type="text"
                placeholder="Search apps..."
                class="w-full h-full bg-transparent px-2.5 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none"
              />
              <div v-if="searchQuery" class="pr-2">
                <button
                  type="button"
                  class="p-1 rounded-md text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                  title="Clear"
                  @click="searchQuery = ''"
                >
                  <AppIcon name="heroicons:x-mark-20-solid" size="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <HeroSpotlight
          v-if="!searchQuery && selectedCategory === 'all' && featuredApps.length > 0"
          :apps="featuredApps"
          :installed-map="installedAppsMap"
          :is-embedded="isEmbedded"
          @select-app="selectApp"
          @install-app="handleInstall"
          @open-app="handleOpen"
        />

        <div v-if="displayedApps.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          <CatalogAppCard
            v-for="app in displayedApps"
            :key="app.id"
            :app="app"
            :installed-info="installedAppsMap.get(app.id) || null"
            :is-installing="isInstalling(app.id)"
            :host-api-version="hostApiVersion"
            :is-embedded="isEmbedded"
            @select="selectApp(app.id)"
            @install="handleInstall"
            @open="handleOpen"
          />
        </div>

        <div v-else class="py-16 flex flex-col items-center text-center rounded-xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-8 shadow-xs">
          <AppIcon name="heroicons:magnifying-glass-20-solid" size="w-7 h-7" class="text-gray-300 dark:text-neutral-600 mb-2" />
          <h3 class="text-sm font-medium text-gray-900 dark:text-gray-100">No apps found</h3>
          <p class="mt-0.5 mb-3 text-xs text-gray-500 dark:text-neutral-400 max-w-sm">
            No apps match your filter criteria.
          </p>
          <AppButton
            variant="secondary"
            size="sm"
            rounded="rounded-lg"
            label="Clear filters"
            @click="searchQuery = ''; selectedCategory = 'all'"
          />
        </div>
      </div>
    </main>
  </div>
</template>
