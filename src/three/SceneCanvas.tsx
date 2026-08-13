import { useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'

import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'
import { HeadPoints } from './HeadPoints'

/**
 * Reads a design token off the document. Tailwind's `@theme` emits every token
 * in src/index.css as a real CSS custom property, so the 3D layer consumes the
 * exact values the utilities are generated from rather than a second copy.
 */
function readToken(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim()
  return value || fallback
}

/**
 * The scene sits behind the entire page as a fixed layer, which is what lets a
 * single point cloud morph continuously as the reader moves between sections.
 *
 * Two properties matter for the rest of the site:
 *
 *  - It is `fixed` and never participates in layout, so it cannot contribute
 *    cumulative layout shift regardless of when WebGL finishes initialising.
 *  - It is inert to pointer events and hidden from assistive technology. Every
 *    word on the page exists in the DOM underneath it.
 */
export function SceneCanvas() {
  const reducedMotion = usePrefersReducedMotion()
  const [tokens, setTokens] = useState<{
    base: string
    accent: string
    glow: string
  } | null>(null)
  const [isCompact, setIsCompact] = useState(false)

  useEffect(() => {
    setTokens({
      base: readToken('--color-head-fg', '#B9B4E8'),
      accent: readToken('--color-accent', '#E8A33D'),
      glow: readToken('--color-head-glow', '#FFE3B0'),
    })
  }, [])

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 768px)')
    const sync = () => setIsCompact(mql.matches)
    sync()
    mql.addEventListener('change', sync)
    return () => mql.removeEventListener('change', sync)
  }, [])

  // Hold until tokens resolve so the first painted frame is the right colour.
  if (!tokens) return null

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0">
      <Canvas
        // R3F writes `pointer-events: auto` inline on its own container, which
        // would override the wrapper above and let the canvas swallow clicks on
        // every link on the page.
        style={{ pointerEvents: 'none' }}
        dpr={isCompact ? [1, 1.25] : [1, 1.75]}
        camera={{ position: [0, 0.05, 7.3], fov: 28 }}
        gl={{ antialias: false, alpha: true }}
        // Nothing moves under reduced motion, so the GPU idles after one frame.
        frameloop={reducedMotion ? 'demand' : 'always'}
      >
        {/* Offset right of centre, so the hero copy on the left stays legible. */}
        <group position={[isCompact ? 0 : 0.9, 0, 0]}>
          <HeadPoints
            baseColor={tokens.base}
            accentColor={tokens.accent}
            glowColor={tokens.glow}
            compact={isCompact}
            still={reducedMotion}
          />
        </group>
      </Canvas>
    </div>
  )
}
