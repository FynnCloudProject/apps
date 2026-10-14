<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from './AppIcon.vue'

interface Props {
  label?: string
  href?: string
  target?: string
  icon?: string
  loading?: boolean
  block?: boolean
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'white' | 'clear'
  size?: 'xs' | 'sm' | 'md' | 'lg'
  type?: 'button' | 'submit'
  rounded?: string
  disabled?: boolean
  textColor?: string
  shadow?: string
  borderClass?: string
  fontWeight?: string
  textShadow?: boolean
  gap?: string
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'md',
  type: 'button',
  rounded: 'rounded-xl',
  fontWeight: 'font-medium',
  textShadow: true,
  gap: 'gap-1.5',
  loading: false,
  disabled: false,
  block: false
})

const emit = defineEmits<{
  (e: 'click', event: MouseEvent): void
}>()

const variantClasses = computed(() => {
  const map: Record<string, string> = {
    primary: 'from-primary-500 to-primary-700 group-enabled:group-active:from-primary-600 group-enabled:group-active:to-primary-800',
    secondary: 'from-white to-zinc-100 group-enabled:group-active:from-zinc-100 group-enabled:group-active:to-zinc-200 dark:from-zinc-800 dark:to-zinc-900 dark:group-enabled:group-active:from-zinc-900 dark:group-enabled:group-active:to-zinc-950 border-[0.5px] border-zinc-300 dark:border-zinc-700/80',
    danger: 'from-red-500 to-red-700 group-enabled:group-active:from-red-600 group-enabled:group-active:to-red-800 dark:from-[#EF4444] dark:to-[#B91C1C]',
    clear: 'bg-transparent shadow-none',
    white: 'from-white to-zinc-100 group-enabled:group-active:from-zinc-100 group-enabled:group-active:to-zinc-200 dark:from-zinc-800 dark:to-zinc-900 border-[0.5px] border-zinc-300 dark:border-zinc-700/80',
    ghost: 'bg-transparent shadow-none'
  }
  return map[props.variant] || map.primary
})

const textColor = computed(() => {
  if (props.textColor) return props.textColor
  const map: Record<string, string> = {
    primary: 'text-white',
    secondary: 'text-zinc-700 dark:text-zinc-200',
    danger: 'text-white',
    clear: 'text-zinc-700 dark:text-zinc-300',
    white: 'text-zinc-700 dark:text-zinc-200',
    ghost: 'text-zinc-700 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-white'
  }
  return map[props.variant] || map.primary
})

const sizeClasses = computed(() => {
  const map: Record<string, string> = {
    xs: 'px-2 py-1',
    sm: 'px-2.5 py-1',
    md: 'px-3 py-1.5',
    lg: 'px-4 py-2.5'
  }
  return map[props.size] || map.md
})

const textSize = computed(() => {
  const map: Record<string, string> = {
    xs: 'text-xs',
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  }
  return map[props.size] || map.md
})

const shadowClasses = computed(() => {
  return props.shadow || 'shadow-[inset_0_1px_2px_rgba(255,255,255,0.35),0_3px_8px_rgba(0,0,0,0.08)]'
})

const textShadowClass = computed(() => {
  if (!props.textShadow) return ''
  return props.variant === 'primary' || props.variant === 'danger' ? 'drop-shadow-xs' : ''
})

const iconSize = computed(() => {
  switch (props.size) {
    case 'xs':
      return 'w-3.5 h-3.5'
    case 'lg':
      return 'w-5 h-5'
    case 'sm':
    case 'md':
    default:
      return 'w-4 h-4'
  }
})

const handleClick = (e: MouseEvent) => {
  if (!props.disabled && !props.loading) {
    emit('click', e)
  }
}
</script>

<template>
  <component
    :is="href ? 'a' : 'button'"
    :href="href"
    :target="target"
    :rel="target === '_blank' ? 'noopener noreferrer' : undefined"
    :type="!href ? type : undefined"
    :disabled="disabled || loading"
    class="group relative inline-flex items-center justify-center transition-all duration-150 ease-out active:scale-[0.98] disabled:active:scale-100 disabled:cursor-not-allowed disabled:opacity-70 cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50 dark:focus-visible:ring-primary-400/50"
    :class="[
      block ? 'flex w-full' : '',
      rounded,
      sizeClasses,
      variant === 'ghost' ? 'hover:bg-black/5 dark:hover:bg-white/10' : ''
    ]"
    @click="handleClick"
  >
    <div
      v-if="variant !== 'ghost' && variant !== 'clear'"
      class="absolute inset-0 bg-gradient-to-b via-90% transition-all duration-150 ease-out"
      :class="[
        variantClasses,
        rounded,
        borderClass,
        shadowClasses
      ]"
    />

    <div
      class="relative z-10 flex items-center justify-center transition-transform duration-150 ease-out"
      :class="[textColor, textShadowClass, gap]"
    >
      <div v-if="loading" class="flex items-center justify-center shrink-0">
        <svg
          class="animate-spin shrink-0 text-current"
          :class="iconSize"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
      <div v-else-if="icon" class="flex items-center justify-center shrink-0">
        <AppIcon :name="icon" :size="iconSize" />
      </div>

      <span v-if="label || $slots.default" class="font-sans tracking-tight" :class="[textSize, fontWeight]">
        <slot>{{ label }}</slot>
      </span>
    </div>
  </component>
</template>
