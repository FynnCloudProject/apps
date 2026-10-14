<script setup lang="ts">
import { computed, ref, watch, onMounted, onBeforeUnmount, nextTick, inject, unref, type Ref } from 'vue'
import AppIcon from './AppIcon.vue'

export interface SegmentOption {
  label: string
  value: string
  count?: number
  icon?: string
  disabled?: boolean
}

interface Props {
  modelValue: string
  options: (SegmentOption | string)[]
  size?: 'xs' | 'sm' | 'md' | 'lg'
  block?: boolean
  glass?: boolean
  rounded?: string
}

const props = withDefaults(defineProps<Props>(), {
  size: 'sm',
  block: false,
  glass: undefined,
  rounded: 'rounded-xl'
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'change', value: string): void
}>()

const injectedGlass = inject<boolean | Ref<boolean> | null>('isInsideGlassContainer', null)

const isGlass = computed(() => {
  if (props.glass !== undefined) return props.glass
  return Boolean(unref(injectedGlass))
})

const normalizedOptions = computed<SegmentOption[]>(() => {
  return props.options.map((opt) => {
    if (typeof opt === 'string') {
      return { label: opt, value: opt }
    }
    return opt
  })
})

const containerRef = ref<HTMLElement | null>(null)
const buttonRefs = ref<HTMLElement[]>([])
const sliderStyle = ref<{ left: string; top: string; width: string; height: string } | null>(null)

const updateSlider = () => {
  nextTick(() => {
    if (!containerRef.value) return
    const activeIndex = normalizedOptions.value.findIndex((opt) => opt.value === props.modelValue)
    if (activeIndex === -1 || !buttonRefs.value[activeIndex]) {
      sliderStyle.value = null
      return
    }
    const btn = buttonRefs.value[activeIndex]
    sliderStyle.value = {
      left: `${btn.offsetLeft}px`,
      top: `${btn.offsetTop}px`,
      width: `${btn.offsetWidth}px`,
      height: `${btn.offsetHeight}px`
    }
  })
}

watch(() => props.modelValue, updateSlider)
watch(() => props.options, updateSlider, { deep: true })

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  updateSlider()
  if (containerRef.value && typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => updateSlider())
    resizeObserver.observe(containerRef.value)
  }
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
})

const select = (value: string, disabled?: boolean) => {
  if (disabled) return
  if (props.modelValue !== value) {
    emit('update:modelValue', value)
    emit('change', value)
  }
}

const sizeClasses: Record<string, string> = {
  xs: 'px-2 py-0.5 text-xs',
  sm: 'px-2.5 py-1 text-xs',
  md: 'px-3 py-1.5 text-sm',
  lg: 'px-3.5 py-2 text-sm'
}

const innerRadiusClass = computed(() => {
  const r = props.rounded
  if (r === 'rounded-2xl') return 'rounded-xl'
  if (r === 'rounded-xl') return 'rounded-lg'
  if (r === 'rounded-lg') return 'rounded-md'
  return 'rounded-lg'
})
</script>

<template>
  <div
    ref="containerRef"
    role="tablist"
    class="relative p-1 select-none gap-1 overflow-x-auto max-w-full scrollbar-hide"
    :class="[
      rounded,
      block ? 'flex w-full' : 'inline-flex items-center',
      isGlass
        ? 'bg-black/[0.04] dark:bg-white/[0.06] ring-1 ring-black/5 dark:ring-white/10'
        : 'bg-gray-200/60 dark:bg-neutral-900 border border-gray-200/80 dark:border-neutral-800'
    ]"
  >
    <!-- Sliding active indicator pill matching FynnCloud-UI neutral surface -->
    <div
      v-if="sliderStyle"
      class="absolute transition-all duration-200 ease-out pointer-events-none"
      :class="[
        innerRadiusClass,
        isGlass
          ? 'bg-white dark:bg-white/[0.14] shadow-xs ring-1 ring-black/[0.04] dark:ring-white/10'
          : 'bg-white dark:bg-neutral-800 shadow-xs ring-1 ring-black/[0.04] dark:ring-white/[0.06]'
      ]"
      :style="sliderStyle"
    />

    <button
      v-for="opt in normalizedOptions"
      :key="opt.value"
      ref="buttonRefs"
      type="button"
      role="tab"
      :aria-selected="modelValue === opt.value"
      :disabled="opt.disabled"
      class="relative z-10 inline-flex items-center justify-center gap-1.5 font-medium transition-colors duration-150 cursor-pointer whitespace-nowrap focus:outline-none"
      :class="[
        innerRadiusClass,
        sizeClasses[size] || sizeClasses.sm,
        block ? 'flex-1' : '',
        modelValue === opt.value
          ? 'text-gray-900 dark:text-neutral-100'
          : 'text-gray-500 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-neutral-200',
        opt.disabled ? 'opacity-50 cursor-not-allowed' : ''
      ]"
      @click="select(opt.value, opt.disabled)"
    >
      <AppIcon v-if="opt.icon" :name="opt.icon" size="w-3.5 h-3.5" />
      <span>{{ opt.label }}</span>
      <span
        v-if="opt.count !== undefined"
        class="text-[11px] font-mono tabular-nums transition-colors"
        :class="[
          modelValue === opt.value
            ? 'text-gray-500 dark:text-neutral-400'
            : 'text-gray-400 dark:text-neutral-500'
        ]"
      >
        {{ opt.count }}
      </span>
    </button>
  </div>
</template>
