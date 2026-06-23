import { defineConfig, Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import { readFileSync } from 'fs'

function assetBasePlugin(base: string): Plugin {
  return {
    name: 'asset-base',
    transformIndexHtml(html) {
      return html.replace(
        /((?:src|href)=["'])\/assets\//g,
        `$1${base}assets/`
      )
    }
  }
}

function configEditorPlugin(): Plugin {
  return {
    name: 'config-editor-fallback',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split('?')[0] || ''
        if (url === '/untitled-merge-game/config-editor/' || url === '/untitled-merge-game/config-editor') {
          res.setHeader('Content-Type', 'text/html')
          res.end(readFileSync(resolve(__dirname, 'public/config-editor/index.html'), 'utf-8'))
          return
        }
        next()
      })
    }
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  base: '/untitled-merge-game/', 
   
  plugins: [vue(), assetBasePlugin('/untitled-merge-game/'), configEditorPlugin()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  server: {
    port: 3000
  },
  build: {
    outDir: 'dist'
  }
})