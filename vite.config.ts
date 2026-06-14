import { defineConfig, Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

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

// https://vitejs.dev/config/
export default defineConfig({
  base: '/Heartbeat-Merge-Game/', 
  
  plugins: [vue(), assetBasePlugin('/Heartbeat-Merge-Game/')],
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