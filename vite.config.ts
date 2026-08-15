import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // The 3D scene is loaded lazily and deliberately late (see src/three/Stage.tsx),
    // but the bundler still emits a <link rel="modulepreload"> for the three.js
    // chunk in the HTML head, which makes the browser fetch all ~870kB of it at
    // high priority during first paint and undoes the deferral entirely.
    // Nothing outside the lazy chunk imports three, so dropping it from the
    // preload list is safe: it is fetched when the dynamic import runs.
    modulePreload: {
      resolveDependencies: (_url, deps) =>
        deps.filter((dep) => !/[/\\]three-[^/\\]*\.js$/.test(dep)),
    },
    rollupOptions: {
      output: {
        // Three.js is by far the heaviest dependency and changes far less often
        // than app code, so splitting it keeps the app chunk cheap to re-download
        // when copy changes, instead of invalidating the whole bundle.
        //
        // React is pinned to its own chunk first, and that ordering is
        // load-bearing rather than cosmetic. React is a shared dependency of
        // both the app and @react-three/fiber; left unassigned, the bundler
        // folded it into the three chunk, which forced the entry to import
        // that chunk statically and pulled all ~870kB of three.js into first
        // paint no matter how lazily the scene itself was imported.
        //
        // Paths are matched with separators on both sides so that
        // `three-stdlib` is matched deliberately rather than by accident of
        // `three` being a prefix of it.
        manualChunks(id) {
          if (/[/\\]node_modules[/\\](react|react-dom|scheduler)[/\\]/.test(id)) {
            return 'react'
          }
          if (/[/\\]node_modules[/\\](three|three-stdlib)[/\\]/.test(id)) {
            return 'three'
          }
          if (/[/\\]node_modules[/\\]@react-three[/\\]/.test(id)) return 'three'
          return undefined
        },
      },
    },
  },
})
