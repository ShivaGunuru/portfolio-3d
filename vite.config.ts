import { resolve } from 'node:path'

import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

import { projects, site } from './src/content/site.ts'
import { buildBands } from './src/preloader/bands.ts'
import { PRELOADER_PLACEHOLDER, renderPreloaderMarkup } from './src/preloader/markup.ts'

/**
 * Writes the preloader overlay into index.html at build (and dev-serve) time.
 *
 * The overlay has to be static HTML: a React component cannot paint until the
 * JS bundle has downloaded and run, which would show a blank page first,
 * exactly what the preloader exists to prevent. Generating it here, rather
 * than hand-writing it into index.html, keeps site.ts the only place copy
 * lives. Pages without the placeholder (the legal pages) pass through
 * untouched.
 */
function preloaderHtml(): Plugin {
  return {
    name: 'preloader-html',
    transformIndexHtml(html) {
      if (!html.includes(PRELOADER_PLACEHOLDER)) return html
      return html.replace(
        PRELOADER_PLACEHOLDER,
        renderPreloaderMarkup(buildBands(site.name, site.role, projects)),
      )
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), preloaderHtml()],
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
      // Vite serves any .html file at the project root automatically in dev,
      // but the production build only emits what is explicitly listed here.
      // Leaving this unset builds index.html alone, which is why a page
      // like privacy.html can dev-serve fine and still 404 once deployed:
      // dev and prod silently diverging is the trap this list closes.
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        privacy: resolve(import.meta.dirname, 'privacy.html'),
        terms: resolve(import.meta.dirname, 'terms.html'),
        cookies: resolve(import.meta.dirname, 'cookies.html'),
      },
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
