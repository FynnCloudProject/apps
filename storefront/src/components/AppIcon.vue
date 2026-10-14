<script setup lang="ts">
import { computed } from 'vue'
import {
  MagnifyingGlassIcon,
  ArrowDownTrayIcon,
  XMarkIcon,
  CheckIcon,
  ArrowTopRightOnSquareIcon,
  SparklesIcon,
  ShieldCheckIcon,
  CubeIcon,
  ArrowPathIcon,
  SunIcon,
  MoonIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  DocumentTextIcon,
  CodeBracketIcon,
  CalendarIcon,
  ClipboardDocumentIcon,
  ExclamationTriangleIcon,
  PhotoIcon,
  CheckCircleIcon,
  LockClosedIcon,
  ServerIcon,
  EyeIcon,
  InformationCircleIcon,
  Squares2X2Icon,
  ArrowLeftIcon,
  ArrowsPointingOutIcon
} from '@heroicons/vue/20/solid'

interface Props {
  name: string
  size?: string
}

const props = withDefaults(defineProps<Props>(), {
  size: 'w-4 h-4'
})

const iconMap: Record<string, any> = {
  'heroicons:magnifying-glass-20-solid': MagnifyingGlassIcon,
  'heroicons:arrow-down-tray-20-solid': ArrowDownTrayIcon,
  'heroicons:arrow-left-20-solid': ArrowLeftIcon,
  'heroicons:arrows-pointing-out-20-solid': ArrowsPointingOutIcon,
  'heroicons:x-mark-20-solid': XMarkIcon,
  'heroicons:check-20-solid': CheckIcon,
  'heroicons:check-circle-20-solid': CheckCircleIcon,
  'heroicons:arrow-top-right-on-square-20-solid': ArrowTopRightOnSquareIcon,
  'heroicons:sparkles-20-solid': SparklesIcon,
  'heroicons:shield-check-20-solid': ShieldCheckIcon,
  'heroicons:cube-20-solid': CubeIcon,
  'heroicons:arrow-path-20-solid': ArrowPathIcon,
  'heroicons:sun-20-solid': SunIcon,
  'heroicons:moon-20-solid': MoonIcon,
  'heroicons:chevron-left-20-solid': ChevronLeftIcon,
  'heroicons:chevron-right-20-solid': ChevronRightIcon,
  'heroicons:chevron-down-20-solid': ChevronDownIcon,
  'heroicons:document-text-20-solid': DocumentTextIcon,
  'heroicons:code-bracket-20-solid': CodeBracketIcon,
  'heroicons:calendar-20-solid': CalendarIcon,
  'heroicons:clipboard-20-solid': ClipboardDocumentIcon,
  'heroicons:exclamation-triangle-20-solid': ExclamationTriangleIcon,
  'heroicons:photo-20-solid': PhotoIcon,
  'heroicons:lock-closed-20-solid': LockClosedIcon,
  'heroicons:server-20-solid': ServerIcon,
  'heroicons:eye-20-solid': EyeIcon,
  'heroicons:information-circle-20-solid': InformationCircleIcon,
  'heroicons:squares-2x2-20-solid': Squares2X2Icon
}

const component = computed(() => {
  return iconMap[props.name] || iconMap[`heroicons:${props.name}-20-solid`] || CubeIcon
})
</script>

<template>
  <component :is="component" :class="[size, 'shrink-0']" aria-hidden="true" />
</template>
