import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

const root = resolve(__dirname)

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(root, 'electron/main.ts'),
        },
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(root, 'electron/preload.ts'),
        },
      },
    },
  },
  renderer: {
    root,
    resolve: {
      alias: {
        '@': resolve(root, 'src'),
      },
    },
    build: {
      rollupOptions: {
        input: resolve(root, 'index.html'),
      },
    },
    server: {
      port: 5173,
    },
    plugins: [react()],
  },
})
