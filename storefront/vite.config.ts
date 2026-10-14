import { fileURLToPath, URL } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
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

import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), vue(), serveCatalogDev()],
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
