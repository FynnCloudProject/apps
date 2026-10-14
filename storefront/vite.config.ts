import { fileURLToPath, URL } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import fs from 'node:fs'
import path from 'node:path'

function serveCatalogDev(): Plugin {
  return {
    name: 'serve-catalog-dev',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split('?')[0]
        if (url === '/index.json' || url?.startsWith('/apps/')) {
          const filePath = path.resolve(__dirname, '../dist', url.slice(1))
          if (fs.existsSync(filePath)) {
            const ext = path.extname(filePath)
            const mimeTypes: Record<string, string> = {
              '.json': 'application/json',
              '.svg': 'image/svg+xml',
              '.jpg': 'image/jpeg',
              '.jpeg': 'image/jpeg',
              '.png': 'image/png',
              '.webp': 'image/webp',
              '.md': 'text/markdown'
            }
            res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream')
            res.end(fs.readFileSync(filePath))
            return
          }
        }
        next()
      })
    }
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function generateSpaRoutes(): Plugin {
  return {
    name: 'generate-spa-routes',
    closeBundle() {
      const distDir = path.resolve(__dirname, '../dist')
      const indexPath = path.join(distDir, 'index.html')
      if (!fs.existsSync(indexPath)) return

      const indexHtml = fs.readFileSync(indexPath, 'utf8')

      // 1. Generate 404.html (GitHub Pages SPA fallback)
      fs.writeFileSync(path.join(distDir, '404.html'), indexHtml, 'utf8')

      // 2. Generate /app.html and /app/index.html
      const appDir = path.join(distDir, 'app')
      fs.mkdirSync(appDir, { recursive: true })
      fs.writeFileSync(path.join(distDir, 'app.html'), indexHtml, 'utf8')
      fs.writeFileSync(path.join(appDir, 'index.html'), indexHtml, 'utf8')

      // 3. Generate static entrypoints for each app in catalog
      const catalogPath = path.join(distDir, 'index.json')
      if (fs.existsSync(catalogPath)) {
        try {
          const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'))
          const apps = catalog.apps || []
          for (const app of apps) {
            if (!app.id) continue

            let appHtml = indexHtml
            if (app.name) {
              const title = `${app.name} - FynnCloud Apps`
              appHtml = appHtml.replace(/<title>.*?<\/title>/, `<title>${escapeHtml(title)}</title>`)
            }
            if (app.description) {
              const desc = escapeHtml(app.description)
              appHtml = appHtml.replace(
                /<meta name="description" content=".*?" \/>/,
                `<meta name="description" content="${desc}" />\n    <meta property="og:title" content="${escapeHtml(app.name)} - FynnCloud Apps" />\n    <meta property="og:description" content="${desc}" />`
              )
            }

            const singleAppDir = path.join(appDir, app.id)
            fs.mkdirSync(singleAppDir, { recursive: true })
            fs.writeFileSync(path.join(distDir, 'app', `${app.id}.html`), appHtml, 'utf8')
            fs.writeFileSync(path.join(singleAppDir, 'index.html'), appHtml, 'utf8')
          }
          console.log(`[generate-spa-routes] Generated static entrypoints for ${apps.length} apps + 404.html`)
        } catch (err) {
          console.error('[generate-spa-routes] Failed to generate app routes from index.json:', err)
        }
      }
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), vue(), serveCatalogDev(), generateSpaRoutes()],
  base: '/',
  server: {
    port: 5173,
    fs: {
      allow: ['..']
    }
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  build: {
    outDir: '../dist',
    emptyOutDir: false,
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    }
  }
})
