import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { HostHandshakePayload, InstalledAppInfo } from '../types'

const PRIMARY_SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const

const SHADE_MIX: Record<number, [number, number]> = {
  50: [1, 0.92],
  100: [1, 0.84],
  200: [1, 0.68],
  300: [1, 0.5],
  400: [1, 0.25],
  500: [0, 0],
  600: [0, 0.18],
  700: [0, 0.36],
  800: [0, 0.54],
  900: [0, 0.72],
  950: [0, 0.85]
}

function isHexColor(color?: unknown): boolean {
  if (typeof color !== 'string') return false
  return /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(color.trim())
}

function generateShades(hexColor: string): Record<number, string> {
  let c = hexColor.trim().replace(/^#/, '')
  if (c.length === 3) {
    c = c
      .split('')
      .map((x) => x + x)
      .join('')
  }
  if (c.length !== 6) return {}
  const num = parseInt(c, 16)
  if (isNaN(num)) return {}

  const rgb: [number, number, number] = [(num >> 16) & 255, (num >> 8) & 255, num & 255]
  const result: Record<number, string> = {}
  for (const shade of PRIMARY_SHADES) {
    const mix = SHADE_MIX[shade]
    if (!mix) continue
    const [isWhite, weight] = mix
    const target = isWhite === 1 ? 255 : 0
    const [r, g, b] = rgb.map((channel) =>
      Math.round(channel * (1 - weight) + target * weight)
    ) as [number, number, number]
    result[shade] = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
  }
  return result
}

export function applyPrimaryColor(color: string): void {
  if (typeof document === 'undefined' || !color) return
  const root = document.documentElement
  if (isHexColor(color)) {
    const shades = generateShades(color)
    for (const shade of PRIMARY_SHADES) {
      if (shades[shade]) {
        root.style.setProperty(`--color-primary-${shade}`, shades[shade])
      }
    }
  } else {
    for (const shade of PRIMARY_SHADES) {
      root.style.setProperty(`--color-primary-${shade}`, `var(--color-${color}-${shade})`)
    }
  }
}

export function useHostBridge() {
  const isEmbedded = ref(
    typeof window !== 'undefined' &&
      (window.parent !== window || new URLSearchParams(window.location.search).get('embedded') === '1')
  )
  const isReady = ref(false)
  const initCount = ref(0)
  const hostApiVersion = ref<string | null>(null)
  const activeTheme = ref<'dark' | 'light'>('dark')
  const installedAppsMap = ref<Map<string, InstalledAppInfo>>(new Map())
  const installingAppIds = ref<Set<string>>(new Set())

  const checkIsEmbedded = (): boolean => {
    if (typeof window === 'undefined') return false
    const urlParams = new URLSearchParams(window.location.search)
    return window.parent !== window || urlParams.get('embedded') === '1'
  }

  const applyTheme = (theme: 'dark' | 'light', withTransition = false) => {
    const doApply = () => {
      activeTheme.value = theme
      if (typeof document === 'undefined') return
      if (theme === 'dark') {
        document.documentElement.classList.add('dark')
        document.documentElement.setAttribute('data-theme', 'dark')
      } else {
        document.documentElement.classList.remove('dark')
        document.documentElement.setAttribute('data-theme', 'light')
      }
    }

    if (
      withTransition &&
      typeof document !== 'undefined' &&
      'startViewTransition' in document &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      ;(document as any).startViewTransition(() => {
        doApply()
      })
    } else {
      doApply()
    }
  }

  const postToHost = (type: string, payload?: any) => {
    if (typeof window !== 'undefined' && window.parent && window.parent !== window) {
      const cleanPayload = payload !== undefined ? JSON.parse(JSON.stringify(payload)) : undefined
      window.parent.postMessage({ type, payload: cleanPayload }, '*')
    }
  }

  const handleMessage = (event: MessageEvent) => {
    const data = event.data
    if (!data || typeof data.type !== 'string') return

    switch (data.type) {
      case 'fynncloud:store:init': {
        const payload: HostHandshakePayload = data.payload || {}
        isReady.value = true
        initCount.value++
        if (payload.apiVersion) {
          hostApiVersion.value = payload.apiVersion
        }
        if (payload.theme) {
          applyTheme(payload.theme)
        }
        if (payload.primaryColor) {
          applyPrimaryColor(payload.primaryColor)
        }
        if (Array.isArray(payload.installedApps)) {
          const map = new Map<string, InstalledAppInfo>()
          for (const item of payload.installedApps) {
            map.set(item.id, item)
          }
          installedAppsMap.value = map
        }
        break
      }

      case 'fynncloud:store:installed': {
        const payload = data.payload || {}
        if (payload.id) {
          installingAppIds.value.delete(payload.id)
          installingAppIds.value = new Set(installingAppIds.value)
          installedAppsMap.value.set(payload.id, {
            id: payload.id,
            version: payload.version || '1.0.0',
            status: 'active'
          })
          installedAppsMap.value = new Map(installedAppsMap.value)
        }
        break
      }

      case 'fynncloud:store:installFailed': {
        const payload = data.payload || {}
        if (payload.id) {
          installingAppIds.value.delete(payload.id)
          installingAppIds.value = new Set(installingAppIds.value)
        }
        break
      }

      case 'fynncloud:store:uninstalled': {
        const payload = data.payload || {}
        if (payload.id) {
          installedAppsMap.value.delete(payload.id)
          installedAppsMap.value = new Map(installedAppsMap.value)
        }
        break
      }

      case 'fynncloud:store:themeChange': {
        if (data.payload?.theme) {
          applyTheme(data.payload.theme)
        }
        if (data.payload?.primaryColor) {
          applyPrimaryColor(data.payload.primaryColor)
        }
        break
      }
    }
  }

  const requestInstall = (appId: string, manifest: any, iconSvg?: string | null) => {
    installingAppIds.value.add(appId)
    installingAppIds.value = new Set(installingAppIds.value)

    postToHost('fynncloud:store:install', {
      appId,
      manifest,
      iconSvg: iconSvg || undefined
    })
  }

  const requestUpdate = (appId: string, manifest: any, iconSvg?: string | null) => {
    installingAppIds.value.add(appId)
    installingAppIds.value = new Set(installingAppIds.value)

    postToHost('fynncloud:store:update', {
      appId,
      manifest,
      iconSvg: iconSvg || undefined
    })
  }

  const requestOpenApp = (appId: string) => {
    postToHost('fynncloud:store:open', { appId })
  }

  const notifyNavigation = (appId: string | null) => {
    postToHost('fynncloud:store:navigate', { appId })
  }

  onMounted(() => {
    isEmbedded.value = checkIsEmbedded()

    const urlParams = new URLSearchParams(window.location.search)
    const themeParam = urlParams.get('theme')
    const colorParam = urlParams.get('primaryColor')
    const apiParam = urlParams.get('apiVersion')

    if (apiParam) {
      hostApiVersion.value = apiParam
    }

    if (themeParam === 'light' || themeParam === 'dark') {
      applyTheme(themeParam)
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      applyTheme('light')
    } else {
      applyTheme('dark')
    }

    if (colorParam) {
      applyPrimaryColor(colorParam)
    }

    window.addEventListener('message', handleMessage)

    postToHost('fynncloud:store:ready', {
      timestamp: Date.now()
    })
  })

  onUnmounted(() => {
    window.removeEventListener('message', handleMessage)
  })

  const getInstalledInfo = (appId: string) => installedAppsMap.value.get(appId) || null
  const isInstalling = (appId: string) => installingAppIds.value.has(appId)

  return {
    isEmbedded: computed(() => isEmbedded.value),
    isReady: computed(() => isReady.value),
    hostApiVersion: computed(() => hostApiVersion.value),
    activeTheme: computed(() => activeTheme.value),
    installedAppsMap: computed(() => installedAppsMap.value),
    getInstalledInfo,
    isInstalling,
    requestInstall,
    requestUpdate,
    requestOpenApp,
    notifyNavigation,
    applyTheme
  }
}
