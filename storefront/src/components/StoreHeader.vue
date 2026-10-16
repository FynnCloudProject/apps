<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import AppIcon from './AppIcon.vue'
import AppLogo from './AppLogo.vue'

interface Props {
  searchQuery: string
  isEmbedded: boolean
  activeTheme: 'light' | 'dark'
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:searchQuery', val: string): void
  (e: 'toggleTheme'): void
  (e: 'home'): void
}>()

const inputRef = ref<HTMLInputElement | null>(null)
const isFocused = ref(false)

const handleInput = (e: Event) => {
  const val = (e.target as HTMLInputElement).value
  emit('update:searchQuery', val)
}

const clearSearch = () => {
  emit('update:searchQuery', '')
  inputRef.value?.focus()
}

const handleGlobalKeydown = (e: KeyboardEvent) => {
  if (props.isEmbedded) return
  if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
    e.preventDefault()
    inputRef.value?.focus()
    inputRef.value?.select()
  } else if (
    e.key === '/' &&
    document.activeElement?.tagName !== 'INPUT' &&
    document.activeElement?.tagName !== 'TEXTAREA'
  ) {
    e.preventDefault()
    inputRef.value?.focus()
  } else if (e.key === 'Escape' && document.activeElement === inputRef.value) {
    if (props.searchQuery) {
      emit('update:searchQuery', '')
    }
    inputRef.value?.blur()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleGlobalKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleGlobalKeydown)
})
</script>

<template>
  <!-- Standalone Header matching FynnCloud's AppHeader.vue & AppLogo.vue (hidden when embedded) -->
  <div v-if="!isEmbedded" class="sticky top-0 left-0 right-0 z-30">
    <header
      class="shrink-0 h-14 relative flex items-center justify-between px-4 transition-all duration-500 select-none
             bg-linear-to-b from-white to-gray-50/80
             dark:from-neutral-800/90 dark:to-neutral-900/95 dark:backdrop-blur-xl dark:backdrop-saturate-150
             shadow-[inset_0_-1px_0_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.06),0_2px_8px_rgba(0,0,0,0.04)]
             dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_1px_3px_rgba(0,0,0,0.3),0_2px_8px_rgba(0,0,0,0.2)]
             dark:border-b dark:border-white/5"
    >
      <!-- Left Brand matching AppHeader.vue + AppLogo.vue -->
      <div class="flex items-center gap-2 shrink-0 z-10">
        <a
          href="#"
          class="flex items-center select-none cursor-pointer"
          @click.prevent="emit('home')"
        >
          <h1 class="flex items-center select-none shrink-0">
            <AppLogo size="header" show-apps />
          </h1>
        </a>
      </div>

      <!-- Centered Header Search Input matching AppSearch.vue -->
      <div class="hidden md:flex items-center justify-center absolute inset-0 pointer-events-none px-4">
        <div
          class="w-full pointer-events-auto transition-[max-width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
          :class="isFocused || searchQuery ? 'max-w-lg lg:max-w-2xl' : 'max-w-md lg:max-w-xl'"
        >
          <div
            class="group relative w-full h-9 flex items-center justify-between rounded-xl border transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-text"
            :class="[
              isFocused
                ? 'border-primary-500/50 dark:border-primary-400/50 ring-2 ring-primary-500/30 dark:ring-primary-400/30 bg-white dark:bg-zinc-800 shadow-xs'
                : 'border-gray-200/70 dark:border-white/10 bg-gray-100/80 hover:bg-gray-200/60 dark:bg-zinc-800/60 dark:hover:bg-zinc-800/90'
            ]"
            @click="inputRef?.focus()"
          >
            <div class="flex items-center pl-3 shrink-0 pointer-events-none">
              <AppIcon
                name="heroicons:magnifying-glass-20-solid"
                size="w-4 h-4"
                class="transition-colors"
                :class="[
                  isFocused || searchQuery
                    ? 'text-primary-600 dark:text-primary-400'
                    : 'text-zinc-400 dark:text-zinc-500 group-hover:text-primary-600 dark:group-hover:text-primary-400'
                ]"
              />
            </div>

            <input
              ref="inputRef"
              :value="searchQuery"
              type="text"
              placeholder="Search applications..."
              class="w-full h-full bg-transparent px-2.5 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none font-normal"
              autocomplete="off"
              spellcheck="false"
              @input="handleInput"
              @focus="isFocused = true"
              @blur="isFocused = false"
            />

            <div class="flex items-center gap-1.5 pr-2 shrink-0">
              <button
                v-if="searchQuery"
                type="button"
                class="p-0.5 rounded-md text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                title="Clear"
                @click.stop="clearSearch"
              >
                <AppIcon name="heroicons:x-mark-20-solid" size="w-4 h-4" />
              </button>
              <kbd
                v-else
                class="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md select-none
                       bg-zinc-200/60 dark:bg-white/[0.08]
                       border border-zinc-300/50 dark:border-white/10
                       text-[10px] font-sans font-medium text-zinc-500 dark:text-zinc-400 pointer-events-none"
              >
                <span class="text-xs leading-none">⌘</span>
                <span class="leading-none">K</span>
              </kbd>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Controls matching AppHeader.vue & ThemeSwitcher.vue -->
      <div class="flex items-center gap-1.5 shrink-0 z-10 ml-auto">
        <!-- Theme Switcher matching FynnCloud ThemeSwitcher.vue -->
        <button
          type="button"
          class="relative w-9 h-9 p-2 rounded-xl inline-flex items-center justify-center shrink-0 text-gray-500 hover:text-gray-800 hover:bg-gray-100 dark:text-neutral-400 dark:hover:text-neutral-200 dark:hover:bg-neutral-800 active:scale-95 transition-colors duration-150 cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          :title="activeTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
          @click="emit('toggleTheme')"
        >
          <AppIcon
            name="heroicons:sun-20-solid"
            size="w-5 h-5"
            class="text-amber-500 transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] absolute"
            :class="activeTheme === 'dark' ? 'opacity-0 rotate-90 scale-0' : 'opacity-100 rotate-0 scale-100'"
          />
          <AppIcon
            name="heroicons:moon-20-solid"
            size="w-5 h-5"
            class="text-indigo-400 transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] absolute"
            :class="activeTheme === 'dark' ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-0'"
          />
          <div class="w-5 h-5 opacity-0" />
        </button>

        <!-- GitHub Repository Icon Button matching AppIconButton size="lg" rounded="rounded-xl" -->
        <a
          href="https://github.com/FynnCloudProject/apps"
          target="_blank"
          rel="noopener noreferrer"
          class="w-9 h-9 p-2 rounded-xl inline-flex items-center justify-center shrink-0 text-gray-500 hover:text-gray-800 hover:bg-gray-100 dark:text-neutral-400 dark:hover:text-neutral-200 dark:hover:bg-neutral-800 active:scale-95 transition-colors duration-150 cursor-pointer select-none focus:outline-none"
          title="GitHub Repository"
        >
          <svg class="w-5 h-5 fill-current" viewBox="0 0 24 24">
            <path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
          </svg>
        </a>
      </div>
    </header>
  </div>
</template>
