<script setup lang="ts">
import {
  computed,
  ref,
  watch,
  onMounted,
  onBeforeUpdate,
  onBeforeUnmount,
  nextTick,
  inject,
  unref,
  type Ref,
  type ComponentPublicInstance
} from 'vue'
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
  ariaLabel?: string
}

const props = withDefaults(defineProps<Props>(), {
  size: 'sm',
  block: false,
  glass: undefined,
  rounded: 'rounded-xl',
  ariaLabel: 'Filter options'
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
const buttonRefs = ref<(HTMLButtonElement | null)[]>([])
const sliderStyle = ref<{ left: string; top: string; width: string; height: string } | null>(null)

const setButtonRef = (el: Element | ComponentPublicInstance | null, idx: number) => {
  buttonRefs.value[idx] = el instanceof HTMLButtonElement ? el : null
}

onBeforeUpdate(() => {
  buttonRefs.value = []
})

const scrollSelectedIntoView = (btn: HTMLButtonElement | null | undefined) => {
  if (!btn) return
  try {
    btn.scrollIntoView({ block: 'nearest', inline: 'nearest', container: 'nearest' } as ScrollIntoViewOptions)
  } catch {
    btn.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }
}

const updateSlider = (scrollIntoViewOnSelect = false) => {
  nextTick(() => {
    if (!containerRef.value) return
    const activeIndex = normalizedOptions.value.findIndex((opt) => opt.value === props.modelValue)
    const btn = activeIndex !== -1 ? buttonRefs.value[activeIndex] : null
    if (!btn) {
      sliderStyle.value = null
      return
    }
    sliderStyle.value = {
      left: `${btn.offsetLeft}px`,
      top: `${btn.offsetTop}px`,
      width: `${btn.offsetWidth}px`,
      height: `${btn.offsetHeight}px`
    }
    if (scrollIntoViewOnSelect) {
      scrollSelectedIntoView(btn)
    }
  })
}

watch(
  () => props.modelValue,
  () => {
    updateSlider(true)
  }
)
watch(
  () => props.options,
  () => {
    updateSlider(false)
  },
  { deep: true }
)

let resizeObserver: ResizeObserver | null = null
let overflowObserver: IntersectionObserver | null = null

const setupOverflowFallbackObserver = () => {
  overflowObserver?.disconnect()
  overflowObserver = null
  const scroller = containerRef.value
  if (!scroller || typeof CSS === 'undefined' || CSS.supports('animation-timeline', 'scroll()')) {
    return
  }
  const tabs = Array.from(scroller.querySelectorAll<HTMLElement>('[role="tab"]'))
  if (tabs.length < 2) {
    scroller.classList.remove('more-start', 'more-end')
    return
  }
  const first = tabs[0]!
  const last = tabs[tabs.length - 1]!
  overflowObserver = new IntersectionObserver(
    (entries) => {
      for (const { target, intersectionRatio } of entries) {
        if (target === first) {
          scroller.classList.toggle('more-start', intersectionRatio < 1)
        } else if (target === last) {
          scroller.classList.toggle('more-end', intersectionRatio < 1)
        }
      }
    },
    { root: scroller, threshold: 1, rootMargin: '1px' }
  )
  overflowObserver.observe(first)
  overflowObserver.observe(last)
}

watch(
  () => normalizedOptions.value.length,
  () => {
    nextTick(() => {
      setupOverflowFallbackObserver()
    })
  }
)

onMounted(() => {
  updateSlider(false)
  setupOverflowFallbackObserver()
  if (containerRef.value && typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => updateSlider(false))
    resizeObserver.observe(containerRef.value)
  }
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  overflowObserver?.disconnect()
})

const select = (value: string, disabled?: boolean) => {
  if (disabled) return
  if (props.modelValue !== value) {
    emit('update:modelValue', value)
    emit('change', value)
  }
}

const handleTabKeydown = (e: KeyboardEvent, currentIdx: number) => {
  const opts = normalizedOptions.value
  if (opts.length === 0) return

  let targetIdx = -1
  if (e.key === 'ArrowRight') {
    for (let step = 1; step <= opts.length; step++) {
      const candidate = (currentIdx + step) % opts.length
      if (!opts[candidate]?.disabled) {
        targetIdx = candidate
        break
      }
    }
  } else if (e.key === 'ArrowLeft') {
    for (let step = 1; step <= opts.length; step++) {
      const candidate = (currentIdx - step + opts.length) % opts.length
      if (!opts[candidate]?.disabled) {
        targetIdx = candidate
        break
      }
    }
  } else if (e.key === 'Home') {
    targetIdx = opts.findIndex((o) => !o.disabled)
  } else if (e.key === 'End') {
    for (let i = opts.length - 1; i >= 0; i--) {
      if (!opts[i]?.disabled) {
        targetIdx = i
        break
      }
    }
  }

  if (targetIdx === -1 || targetIdx === currentIdx) return
  e.preventDefault()
  const opt = opts[targetIdx]
  if (!opt) return
  select(opt.value, opt.disabled)
  nextTick(() => {
    const targetBtn = buttonRefs.value[targetIdx]
    targetBtn?.focus()
    scrollSelectedIntoView(targetBtn)
  })
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
    :aria-label="ariaLabel"
    class="segment-scroller relative p-1 select-none flex-nowrap gap-1 overflow-x-auto max-w-full scrollbar-hide"
    :class="[
      rounded,
      block ? 'flex w-full' : 'inline-flex items-center',
      isGlass
        ? 'bg-black/[0.04] dark:bg-white/[0.06] border border-black/5 dark:border-white/10'
        : 'bg-zinc-200/70 dark:bg-zinc-900 border border-zinc-300/70 dark:border-zinc-800 shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)] dark:shadow-[inset_0_1px_2.5px_rgba(0,0,0,0.35)]'
    ]"
  >
    <!-- Sliding active indicator pill -->
    <div
      v-if="sliderStyle"
      class="absolute transition-all duration-250 ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none"
      :class="[
        innerRadiusClass,
        isGlass
          ? 'bg-white dark:bg-white/[0.14] shadow-xs border border-black/[0.04] dark:border-white/10'
          : 'bg-linear-to-b via-90% from-white to-zinc-100 dark:from-zinc-700/95 dark:to-zinc-800 border-[0.5px] border-zinc-300/90 dark:border-zinc-600/60 shadow-[inset_0_1px_2px_rgba(255,255,255,0.6),0_1px_3px_rgba(0,0,0,0.08)] dark:shadow-[inset_0_1px_2px_rgba(255,255,255,0.08),0_2px_5px_rgba(0,0,0,0.35)]'
      ]"
      :style="sliderStyle"
    />

    <button
      v-for="(opt, idx) in normalizedOptions"
      :key="opt.value"
      :ref="(el) => setButtonRef(el, idx)"
      type="button"
      role="tab"
      :aria-selected="modelValue === opt.value"
      :tabindex="modelValue === opt.value ? 0 : -1"
      :disabled="opt.disabled"
      class="relative z-10 flex-none inline-flex items-center justify-center gap-1.5 font-medium transition-colors duration-150 active:scale-[0.98] cursor-pointer whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60"
      :class="[
        innerRadiusClass,
        sizeClasses[size] || sizeClasses.sm,
        block ? 'flex-1' : '',
        modelValue === opt.value
          ? 'text-zinc-900 dark:text-zinc-100'
          : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100',
        opt.disabled ? 'opacity-50 cursor-not-allowed' : ''
      ]"
      @click="select(opt.value, opt.disabled)"
      @keydown="handleTabKeydown($event, idx)"
    >
      <AppIcon v-if="opt.icon" :name="opt.icon" size="w-3.5 h-3.5" />
      <span>{{ opt.label }}</span>
      <span
        v-if="opt.count !== undefined"
        class="text-[11px] font-mono tabular-nums transition-colors"
        :class="[
          modelValue === opt.value
            ? 'text-zinc-500 dark:text-zinc-300'
            : 'text-zinc-400 dark:text-zinc-500'
        ]"
      >
        {{ opt.count }}
      </span>
    </button>
  </div>
</template>

<style>
@property --fade-start {
  syntax: "<length>";
  inherits: false;
  initial-value: 0px;
}

@property --fade-end {
  syntax: "<length>";
  inherits: false;
  initial-value: 0px;
}

@keyframes segment-reveal-fade-start {
  to {
    --fade-start: var(--fade-size);
  }
}

@keyframes segment-hide-fade-end {
  from {
    --fade-end: var(--fade-size);
  }
}
</style>

<style scoped>
.segment-scroller {
  --fade-size: 1.75rem;
  --fade-dir: right;
  --fade-start-pos: 0;
  --fade-end-pos: 100%;
  scroll-padding-inline: var(--fade-size);
  scroll-snap-type: inline proximity;
  mask:
    linear-gradient(black, black) no-clip subtract,
    linear-gradient(to var(--fade-dir), black, transparent) var(--fade-start-pos) 0 / var(--fade-start) 100% no-repeat no-clip,
    linear-gradient(to var(--fade-dir), transparent, black) var(--fade-end-pos) 0 / var(--fade-end) 100% no-repeat no-clip;
  transition: --fade-start 0.2s, --fade-end 0.2s;
}

.segment-scroller:dir(rtl) {
  --fade-dir: left;
  --fade-start-pos: 100%;
  --fade-end-pos: 0;
}

.segment-scroller > [role="tab"] {
  scroll-snap-align: start;
}

.segment-scroller.more-start {
  --fade-start: var(--fade-size);
}

.segment-scroller.more-end {
  --fade-end: var(--fade-size);
}

@supports (animation-timeline: scroll()) {
  .segment-scroller {
    transition: none;
    animation: segment-reveal-fade-start linear both, segment-hide-fade-end linear both;
    animation-timeline: scroll(self inline);
    animation-range: 0 var(--fade-size), calc(100% - var(--fade-size)) 100%;
  }
}

/* Forced colors shape affordance when background fills are stripped */
@media (forced-colors: active) {
  .segment-scroller [role="tab"][aria-selected="true"]::after {
    content: "";
    position: absolute;
    inset-inline: 0.35rem;
    inset-block-end: 0;
    border-block-end: 2px solid Highlight;
  }
}
</style>
