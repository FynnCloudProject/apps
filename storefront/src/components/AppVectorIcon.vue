<script lang="ts">
const svgCache = new Map<string, string>()
</script>

<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue'

const props = withDefaults(
  defineProps<{
    iconUrl?: string | null
    appId?: string
    icon?: string | null
    size?: string
  }>(),
  {
    iconUrl: null,
    appId: '',
    icon: null,
    size: 'w-6 h-6'
  }
)

const effectiveUrl = computed(() => {
  if (props.iconUrl) return props.iconUrl
  if (props.appId) return `/apps/${props.appId}/icon.svg`
  return null
})

const svgContent = ref<string | null>(
  effectiveUrl.value ? svgCache.get(effectiveUrl.value) ?? null : null
)
const loading = ref(false)
const error = ref(false)

const loadIcon = async () => {
  const url = effectiveUrl.value
  if (!url) {
    error.value = true
    return
  }

  const cached = svgCache.get(url)
  if (cached) {
    svgContent.value = cached
    error.value = false
    loading.value = false
    return
  }

  loading.value = true
  error.value = false

  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error('Icon fetch failed')
    const text = await res.text()

    if (text.includes('<svg')) {
      let cleaned = text.trim()
      cleaned = cleaned.replace(/<svg\b([^>]*)\bwidth=["'][^"']*["']/i, '<svg$1')
      cleaned = cleaned.replace(/<svg\b([^>]*)\bheight=["'][^"']*["']/i, '<svg$1')
      svgCache.set(url, cleaned)
      svgContent.value = cleaned
    } else {
      error.value = true
    }
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
}

watch(effectiveUrl, loadIcon)
onMounted(() => {
  if (!svgContent.value) loadIcon()
})
</script>

<template>
  <div
    class="shrink-0 inline-flex items-center justify-center transition-colors"
    :class="[size]"
  >
    <div
      v-if="svgContent && !error"
      class="w-full h-full inline-flex items-center justify-center [&>svg]:w-full [&>svg]:h-full [&>svg]:max-w-full [&>svg]:max-h-full fill-current [&>svg_path]:fill-current [&>svg_circle]:fill-current [&>svg_rect]:fill-current [&>svg_polygon]:fill-current [&>svg_polyline]:fill-current [&>svg_ellipse]:fill-current"
      v-html="svgContent"
    />
    <div
      v-else-if="loading"
      class="w-full h-full animate-pulse bg-gray-200/50 dark:bg-neutral-700/50 rounded"
    />
    <svg
      v-else
      class="w-full h-full p-0.5 fill-current opacity-70"
      viewBox="0 0 24 24"
    >
      <path
        d="M12.378 1.602a.75.75 0 00-.756 0L3.422 6.27a.75.75 0 00-.422.668v10.124c0 .274.15.526.393.655l8.25 4.389a.75.75 0 00.714 0l8.25-4.389a.75.75 0 00.393-.655V6.938a.75.75 0 00-.422-.668l-8.2-4.668zM12 3.14l6.78 3.86-2.58 1.38-6.78-3.86L12 3.14zM4.5 7.82l6.75 3.84v7.72L4.5 15.54V7.82zm8.25 11.56v-7.72l6.75-3.84v7.72l-6.75 3.84z"
      />
    </svg>
  </div>
</template>
