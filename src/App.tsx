import { SiteHeader } from './components/SiteHeader'
import { About } from './components/sections/About'
import { Contact } from './components/sections/Contact'
import { Hero } from './components/sections/Hero'
import { Work } from './components/sections/Work'
import { useSmoothScroll } from './hooks/useSmoothScroll'
import { SceneCanvas } from './three/SceneCanvas'

export default function App() {
  useSmoothScroll()

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:border focus:border-accent focus:bg-bg focus:px-4 focus:py-2 focus:font-mono focus:text-xs focus:tracking-[0.14em] focus:text-accent focus:uppercase"
      >
        Skip to content
      </a>

      <SiteHeader />

      {/* The gradient sits behind everything and never affects layout. */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(120%_70%_at_68%_26%,var(--color-bg-glow)_0%,var(--color-bg)_58%)]"
      />

      {/* Fixed 3D layer spanning the whole page, above the gradient and below
          the content. Decorative only. */}
      <SceneCanvas />

      <main id="main" className="relative px-6 sm:px-gutter">
        <Hero />
        <Work />
        <About />
        <Contact />
      </main>
    </>
  )
}
