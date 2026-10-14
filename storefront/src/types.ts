export interface CatalogAppRelease {
  version: string
  released_at: string | null
  compatibility?: {
    api_version?: string
  }
  image?: string
  digest?: string | null
  manifest: any
}

export interface CatalogApp {
  id: string
  name: string
  version: string
  description: string
  author: string
  category: string
  icon: string | null
  icon_url: string
  hero_url: string | null
  hero_dimensions: { width: number; height: number } | null
  gallery: string[]
  readme_url: string | null
  image: string
  digest?: string | null
  compatibility?: {
    api_version?: string
  }
  versions: CatalogAppRelease[]
  permissions?: string[]
  hooks?: {
    sidebar?: any[]
    file_actions?: any[]
    new_file?: any[]
  }
  manifest: any
}

export interface Catalog {
  version: number
  updated_at: string
  total_apps: number
  categories: string[]
  apps: CatalogApp[]
}

export interface InstalledAppInfo {
  id: string
  version: string
  status?: 'active' | 'disabled' | 'failed'
}

export interface HostHandshakePayload {
  apiVersion?: string
  theme?: 'dark' | 'light'
  primaryColor?: string
  installedApps?: InstalledAppInfo[]
}
