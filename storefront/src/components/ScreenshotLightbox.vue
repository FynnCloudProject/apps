<script setup lang="ts">
import { ref, watch, nextTick, onMounted, onUnmounted } from 'vue'
import AppIcon from './AppIcon.vue'

const props = defineProps<{
  images: string[]
  currentIndex: number
  isOpen: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'update:currentIndex', idx: number): void
}>()

const dialogRef = ref<HTMLDialogElement | null>(null)
let pressedOutside = false

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
  if (e.key === 'ArrowRight') next()
  if (e.key === 'ArrowLeft') prev()
}

const syncDialogState = async (open: boolean) => {
  await nextTick()
  const dialog = dialogRef.value
  if (!dialog) return

  if (open && props.images.length > 0) {
    if (!dialog.open) {
      dialog.showModal()
    }
  } else if (dialog.open) {
    dialog.close()
  }
}

const handleDialogClose = () => {
  if (dialogRef.value) {
    dialogRef.value.returnValue = ''
  }
  if (props.isOpen) {
    emit('close')
  }
}

const requestClose = () => {
  if (dialogRef.value?.open) {
    dialogRef.value.close()
  } else {
    emit('close')
  }
}

const isOutsideDialog = (e: PointerEvent, dialog: HTMLDialogElement): boolean => {
  const r = dialog.getBoundingClientRect()
  return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom
}

const onPointerDown = (e: PointerEvent) => {
  if ('closedBy' in HTMLDialogElement.prototype) return
  const dialog = dialogRef.value
  if (!dialog) return
  pressedOutside = isOutsideDialog(e, dialog)
}

const onPointerUp = (e: PointerEvent) => {
  if ('closedBy' in HTMLDialogElement.prototype) return
  const dialog = dialogRef.value
  if (!dialog) return
  if (pressedOutside && isOutsideDialog(e, dialog)) {
    dialog.close()
  }
  pressedOutside = false
}

watch(
  () => [props.isOpen, props.images.length] as const,
  ([open]) => {
    void syncDialogState(open)
  }
)

onMounted(() => {
  window.addEventListener('keydown', handleKey)
  if (props.isOpen && props.images.length > 0) {
    void syncDialogState(true)
  }
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKey)
})
</script>

<template>
  <dialog
    ref="dialogRef"
    v-bind="({ closedby: 'any' } as any)"
    aria-label="Screenshot preview"
    class="lightbox-dialog m-auto w-fit min-w-[min(92vw,20rem)] max-w-[min(94vw,76rem)] max-h-[92dvh] bg-transparent p-0 border-0 text-white focus:outline-none overflow-visible"
    @close="handleDialogClose"
    @pointerdown="onPointerDown"
    @pointerup="onPointerUp"
  >
    <div v-if="images.length > 0" class="flex flex-col gap-3 max-h-[92dvh]">
      <div class="lightbox-toolbar flex items-center justify-between gap-4">
        <span class="text-xs font-mono tabular-nums bg-white/10 px-2.5 py-1 rounded-lg backdrop-blur-md border border-white/15">
          {{ currentIndex + 1 }} / {{ images.length }}
        </span>

        <div class="flex items-center gap-1.5">
          <button
            v-if="images.length > 1"
            type="button"
            class="p-2 rounded-lg bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-white border border-white/15 cursor-pointer"
            aria-label="Previous screenshot"
            title="Previous"
            @click="prev"
          >
            <AppIcon name="heroicons:chevron-left-20-solid" size="w-5 h-5" />
          </button>
          <button
            v-if="images.length > 1"
            type="button"
            class="p-2 rounded-lg bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-white border border-white/15 cursor-pointer"
            aria-label="Next screenshot"
            title="Next"
            @click="next"
          >
            <AppIcon name="heroicons:chevron-right-20-solid" size="w-5 h-5" />
          </button>
          <button
            type="button"
            autofocus
            class="p-2 rounded-lg bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-white border border-white/15 cursor-pointer"
            aria-label="Close preview"
            title="Close (Esc)"
            @click="requestClose"
          >
            <AppIcon name="heroicons:x-mark-20-solid" size="w-5 h-5" />
          </button>
        </div>
      </div>

      <div class="lightbox-stage relative flex items-center justify-center min-h-0">
        <Transition name="lightbox-img" mode="out-in">
          <img
            :key="currentIndex"
            :src="images[currentIndex]"
            :alt="`Screenshot ${currentIndex + 1} of ${images.length}`"
            class="max-w-full max-h-[calc(92dvh-3.75rem)] w-auto h-auto object-contain rounded-xl shadow-2xl border border-white/15 select-none bg-neutral-950 block"
          />
        </Transition>
      </div>
    </div>
  </dialog>
</template>

<style scoped>
dialog.lightbox-dialog[open] {
  display: flex;
  flex-direction: column;
}

dialog.lightbox-dialog:modal {
  overscroll-behavior: contain;
}

dialog.lightbox-dialog::backdrop {
  background-color: rgba(0, 0, 0, 0.88);
  backdrop-filter: blur(8px);
  overflow: hidden;
  overscroll-behavior: contain;
}
</style>
