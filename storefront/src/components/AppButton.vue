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
  fontWeight: 'font-medium',
  textShadow: true,
  gap: 'gap-1.5',
  loading: false,
  disabled: false,
  block: false
})

const roundedClass = computed(() => {
  if (props.rounded) return props.rounded
  return props.size === 'xs' || props.size === 'sm' ? 'rounded-lg' : 'rounded-xl'
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
    xs: 'px-1.5 py-0.5',
    sm: 'px-1.5 py-1',
    md: 'px-2 py-1.5',
    lg: 'px-3 py-3'
  }
  return map[props.size] || map.md
})

const textSize = computed(() => {
  const map: Record<string, string> = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  }
  return map[props.size] || map.md
})

const shadowClasses = computed(() => {
  return props.shadow || 'shadow-[inset_0_1px_2px_rgba(255,255,255,0.35),0_3px_8px_rgba(0,0,0,0.08)]'
})

const textShadowClass = computed(() => {
  if (!props.textShadow) return ''
  return 'drop-shadow-md'
})

const iconSize = computed(() => {
  switch (props.size) {
    case 'xs':
      return 'w-3.5 h-3.5'
    case 'sm':
      return 'w-4 h-4'
    case 'md':
    case 'lg':
    default:
      return 'w-5 h-5'
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
      roundedClass,
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
        roundedClass,
        borderClass,
        shadowClasses
      ]"
    />

    <div
      class="relative z-10 flex items-center justify-center transition-transform duration-150 ease-out"
      :class="[textColor, textShadowClass, gap]"
    >
      <div v-if="loading || icon" class="grid shrink-0 items-center justify-center">
        <Transition
          enter-active-class="transition-all duration-150 ease-out col-start-1 row-start-1"
          leave-active-class="transition-all duration-150 ease-in col-start-1 row-start-1"
          enter-from-class="opacity-0 scale-75"
          enter-to-class="opacity-100 scale-100"
          leave-from-class="opacity-100 scale-100"
          leave-to-class="opacity-0 scale-75"
        >
          <div
            v-if="loading"
            key="spinner"
            class="col-start-1 row-start-1 flex items-center justify-center shrink-0"
            :class="iconSize"
          >
            <svg
              class="animate-spin shrink-0 text-current"
              :class="iconSize"
              fill="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M12,1A11,11,0,1,0,23,12,11,11,0,0,0,12,1Zm0,19a8,8,0,1,1,8-8A8,8,0,0,1,12,20Z" opacity=".25" />
              <path d="M12,4a8,8,0,0,1,7.89,6.7A1.53,1.53,0,0,0,21.38,12h0a1.5,1.5,0,0,0,1.48-1.75,11,11,0,0,0-21.72,0A1.5,1.5,0,0,0,2.62,12h0a1.53,1.53,0,0,0,1.49-1.3A8,8,0,0,1,12,4Z" />
            </svg>
          </div>
          <div
            v-else-if="icon"
            key="icon"
            class="col-start-1 row-start-1 flex items-center justify-center shrink-0"
            :class="iconSize"
          >
            <AppIcon :name="icon" :size="iconSize" />
          </div>
        </Transition>
      </div>

      <span v-if="label || $slots.default" class="font-sans tracking-tight" :class="[textSize, fontWeight]">
        <slot>{{ label }}</slot>
      </span>
    </div>
  </component>
</template>
