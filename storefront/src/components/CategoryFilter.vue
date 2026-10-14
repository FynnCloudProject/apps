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

const options = computed<SegmentOption[]>(() => {
  const list: SegmentOption[] = [
    {
      label: 'All',
      value: 'all'
    }
  ]

  for (const cat of props.categories) {
    if (cat.toLowerCase() === 'all') continue
    list.push({
      label: categoryLabels[cat.toLowerCase()] || cat.charAt(0).toUpperCase() + cat.slice(1),
      value: cat
    })
  }

  return list
})
</script>

<template>
  <div class="flex items-center justify-between gap-4 overflow-x-auto pb-1">
    <AppSegmentedControl
      :model-value="selectedCategory"
      :options="options"
      size="sm"
      @update:model-value="emit('selectCategory', $event)"
    />
  </div>
</template>
