<script setup lang="ts">
withDefaults(defineProps<{
  as?: string
  title?: string
  description?: string
  variant?: 'default' | 'plain'
}>(), {
  as: 'div',
  variant: 'default',
})
</script>

<template>
  <component
    :is="as"
    :class="[
      variant === 'plain'
        ? 'bg-transparent border-0 shadow-none'
        : 'overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs dark:border-neutral-800 dark:bg-neutral-900'
    ]"
  >
    <div v-if="title || description || $slots.header" :class="variant === 'plain' ? 'px-0 pb-1 pt-2' : 'px-4 pb-2 pt-3'">
      <slot name="header">
        <h2 v-if="title" class="text-xl font-light text-gray-900 dark:text-neutral-100">
          {{ title }}
        </h2>
        <p v-if="description" class="text-xs text-gray-500 dark:text-neutral-400 mt-0.5">
          {{ description }}
        </p>
      </slot>
    </div>
    <slot />
  </component>
</template>
