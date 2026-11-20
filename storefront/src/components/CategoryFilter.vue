<script setup lang="ts">
import { computed } from 'vue'
import type { CatalogApp, InstalledAppInfo } from '../types'
import AppSegmentedControl, { type SegmentOption } from './AppSegmentedControl.vue'

interface Props {
  categories: string[]
  selectedCategory: string
  apps: CatalogApp[]
  installedMap: Map<string, InstalledAppInfo>
  isEmbedded: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'selectCategory', cat: string): void
}>()

const categoryLabels: Record<string, string> = {
  all: 'All',
  productivity: 'Productivity',
  collaboration: 'Collaboration',
  office: 'Office',
  media: 'Media',
  ai: 'AI',
  utilities: 'Utilities',
  security: 'Security',
  system: 'System',
  developer: 'Developer'
}

const categoryCounts = computed(() => {
  const counts = new Map<string, number>()
  for (const app of props.apps) {
    const key = app.category?.toLowerCase()
    if (key) {
      counts.set(key, (counts.get(key) || 0) + 1)
    }
  }
  return counts
})

const options = computed<SegmentOption[]>(() => {
  const list: SegmentOption[] = [
    {
      label: 'All',
      value: 'all',
      count: props.apps.length
    }
  ]

  if (props.isEmbedded) {
    const installedCount = props.apps.filter((app) => props.installedMap.has(app.id)).length
    if (installedCount > 0 || props.selectedCategory === 'installed') {
      list.push({
        label: 'Installed',
        value: 'installed',
        count: installedCount
      })
    }
  }

  for (const cat of props.categories) {
    const lower = cat.toLowerCase()
    if (lower === 'all') continue
    const count = categoryCounts.value.get(lower) || 0
    if (count === 0 && props.selectedCategory !== cat) continue
    list.push({
      label: categoryLabels[lower] || cat.charAt(0).toUpperCase() + cat.slice(1),
      value: cat,
      count
    })
  }

  return list
})
</script>

<template>
  <div class="flex items-center justify-between gap-4 max-w-full">
    <AppSegmentedControl
      :model-value="selectedCategory"
      :options="options"
      size="sm"
      rounded="rounded-xl"
      aria-label="Filter applications by category"
      @update:model-value="emit('selectCategory', $event)"
    />
  </div>
</template>
