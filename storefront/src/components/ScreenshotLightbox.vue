<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'

const props = defineProps<{
  images: string[]
  currentIndex: number
  isOpen: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'update:currentIndex', idx: number): void
}>()

const next = () => {
  if (props.images.length > 0) {
    emit('update:currentIndex', (props.currentIndex + 1) % props.images.length)
  }
}

const prev = () => {
  if (props.images.length > 0) {
    emit('update:currentIndex', (props.currentIndex - 1 + props.images.length) % props.images.length)
  }
}

const handleKey = (e: KeyboardEvent) => {
  if (!props.isOpen) return
  if (e.key === 'Escape') emit('close')
  if (e.key === 'ArrowRight') next()
  if (e.key === 'ArrowLeft') prev()
}

onMounted(() => window.addEventListener('keydown', handleKey))
onUnmounted(() => window.removeEventListener('keydown', handleKey))
</script>

<template>
  <Teleport to="body">
    <div
      v-if="isOpen && images.length > 0"
      class="fixed inset-0 z-[20000] flex items-center justify-center bg-black/90 backdrop-blur-md p-4"
      @click.self="$emit('close')"
    >
      <div class="absolute top-4 left-6 right-6 flex items-center justify-between text-white z-10">
        <span class="text-xs font-mono bg-white/10 px-2.5 py-1 rounded-md backdrop-blur-sm border border-white/10">
          {{ currentIndex + 1 }} / {{ images.length }}
        </span>

        <button
          @click="$emit('close')"
          class="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-white border border-white/10 cursor-pointer"
          title="Close (Esc)"
        >
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div class="relative max-w-6xl max-h-[85vh] flex items-center justify-center">
        <img
          :src="images[currentIndex]"
          alt="App Screenshot"
          class="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl border border-white/10 select-none"
        />
      </div>

      <button
        v-if="images.length > 1"
        @click="prev"
        class="absolute left-4 top-1/2 -translate-y-1/2 p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm transition-all border border-white/10 cursor-pointer"
        title="Previous"
      >
        <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <button
        v-if="images.length > 1"
        @click="next"
        class="absolute right-4 top-1/2 -translate-y-1/2 p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm transition-all border border-white/10 cursor-pointer"
        title="Next"
      >
        <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  </Teleport>
</template>
