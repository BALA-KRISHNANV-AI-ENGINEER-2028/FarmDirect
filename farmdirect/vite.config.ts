import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function syncDistPlugin(): Plugin {
  return {
    name: 'sync-dist-plugin',
    closeBundle() {
      try {
        const localDist = path.resolve(__dirname, 'dist')
        const rootDist = path.resolve(__dirname, '../dist')
        if (fs.existsSync(localDist)) {
          fs.cpSync(localDist, rootDist, { recursive: true, force: true })
        }
      } catch {
        // Silently ignore if parent directory is not writable
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), syncDistPlugin()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: true,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 1600,
  },
})
