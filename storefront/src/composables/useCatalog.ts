import { ref, computed, onMounted, nextTick } from 'vue'
import { marked } from 'marked'
import type { Catalog, CatalogApp } from '../types'

const readmeCache = new Map<string, string>()

export function cleanReadmeMarkdown(md: string): string {
  let cleaned = md.trim().replace(/^#\s+[^\n]+\n+/, '')
  cleaned = cleaned.replace(/^[^#\n][^\n]*\n+(?:---\s*\n+)?(?=##)/, '')
  cleaned = cleaned.replace(/^---\s*\n+/, '')
  return cleaned.trim()
}

export function getCachedReadmeHtml(url: string | null | undefined): string | null {
  if (!url) return null
  return readmeCache.get(url) ?? null
}

export async function fetchReadmeHtml(url: string): Promise<string> {
  const cached = readmeCache.get(url)
  if (cached !== undefined) return cached

  const res = await fetch(url)
  if (!res.ok) throw new Error('README fetch failed')
  const md = await res.text()
  const cleaned = cleanReadmeMarkdown(md)
  const html = cleaned ? (marked.parse(cleaned, { gfm: true, breaks: true }) as string) : ''
  readmeCache.set(url, html)
  return html
}

export function useCatalog() {
  const catalog = ref<Catalog | null>(null)
  const loading = ref(true)
  const error = ref<string | null>(null)

  const searchQuery = ref('')
  const selectedCategory = ref<string>('all')
  const selectedAppId = ref<string | null>(null)

  const fetchCatalog = async () => {
    loading.value = true
    error.value = null

    try {
      const res = await fetch('/index.json', {
        headers: { Accept: 'application/json' },
        cache: 'no-cache'
      })

      if (!res.ok) {
        throw new Error(`Failed to load catalog: ${res.status} ${res.statusText}`)
      }

      const data: Catalog = await res.json()
      catalog.value = data
      syncFromUrl()

      for (const app of data.apps || []) {
        if (app.readme_url) {
          fetchReadmeHtml(app.readme_url).catch(() => {})
        }
      }
    } catch (err: any) {
      console.error('[Catalog] Error fetching index.json:', err)
      error.value = err?.message || 'Could not load application catalog.'
    } finally {
      loading.value = false
    }
  }

  const syncFromUrl = () => {
    if (typeof window === 'undefined') return
    if (window.location.hash.startsWith('#/app/')) {
      const legacyId = window.location.hash.replace('#/app/', '').trim()
      if (legacyId) {
        window.history.replaceState(null, '', `/app/${legacyId}`)
      }
    }
    const match = window.location.pathname.match(/^\/app\/([a-z0-9-]+)\/?$/)
    selectedAppId.value = match && match[1] ? match[1] : null
  }

  const applyAppSelection = (appId: string | null) => {
    selectedAppId.value = appId
    if (typeof window !== 'undefined') {
      const targetPath = appId ? `/app/${appId}` : '/'
      if (window.location.pathname !== targetPath || window.location.hash) {
        window.history.pushState(null, '', targetPath + window.location.search)
      }
      if (appId) {
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    }
  }

  const selectApp = (appId: string | null) => {
    if (selectedAppId.value === appId) return
    applyAppSelection(appId)
  }

  const allApps = computed<CatalogApp[]>(() => catalog.value?.apps || [])

  const categories = computed<string[]>(() => {
    return catalog.value?.categories || [
      'productivity',
      'collaboration',
      'office',
      'media',
      'ai',
      'utilities',
      'security',
      'system',
      'developer'
    ]
  })

  const featuredApps = computed<CatalogApp[]>(() => {
    const ids = catalog.value?.featured || []
    return ids
      .map((id) => allApps.value.find((a) => a.id === id))
      .filter((a): a is CatalogApp => Boolean(a))
  })

  const selectedApp = computed<CatalogApp | null>(() => {
    if (!selectedAppId.value) return null
    return allApps.value.find((a) => a.id === selectedAppId.value) || null
  })

  const getFilteredApps = (installedMap?: Map<string, any>) => {
    const q = searchQuery.value.trim().toLowerCase()
    const cat = selectedCategory.value

    return allApps.value.filter((app) => {
      if (cat === 'installed') {
        if (!installedMap || !installedMap.has(app.id)) return false
      } else if (cat === 'updates') {
        if (!installedMap) return false
        const info = installedMap.get(app.id)
        if (!info || info.version === app.version) return false
      } else if (cat !== 'all') {
        if (app.category !== cat) return false
      }

      if (!q) return true

      return (
        app.name.toLowerCase().includes(q) ||
        (app.description || '').toLowerCase().includes(q) ||
        (app.author || '').toLowerCase().includes(q) ||
        app.id.toLowerCase().includes(q) ||
        (app.category || '').toLowerCase().includes(q)
      )
    })
  }

  onMounted(() => {
    fetchCatalog()
    window.addEventListener('popstate', syncFromUrl)
    window.addEventListener('hashchange', syncFromUrl)
  })

  return {
    catalog,
    loading,
    error,
    allApps,
    categories,
    featuredApps,
    searchQuery,
    selectedCategory,
    selectedAppId,
    selectedApp,
    selectApp,
    getFilteredApps,
    refresh: fetchCatalog
  }
}
