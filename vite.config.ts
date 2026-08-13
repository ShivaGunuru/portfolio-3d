import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        // Three.js is by far the heaviest dependency and changes far less often
        // than app code — splitting it keeps the app chunk cheap to re-download
        // when copy changes, instead of invalidating the whole bundle.
        manualChunks(id) {
          if (id.includes('node_modules/three')) return 'three'
          if (id.includes('node_modules/@react-three')) return 'three'
          return undefined
        },
      },
    },
  },
})
