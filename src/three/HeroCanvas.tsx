import { useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'

import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'
import { PlaceholderShape } from './PlaceholderShape'

/**
 * Reads a design token off the document. Tailwind's `@theme` emits every token
 * in src/index.css as a real CSS custom property, so Three.js can consume the
 * exact same value the utilities are generated from. Changing a colour there
 * changes it here. There is no second copy of the palette.
 */
function readToken(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim()
  return value || fallback
}

/**
 * The canvas is absolutely positioned and never participates in layout, so it
 * cannot contribute cumulative layout shift no matter when WebGL finishes
 * initialising. It is also inert to pointer events and hidden from assistive
 * technology. The hero's real content is the DOM underneath it.
 */
export function HeroCanvas() {
  const reducedMotion = usePrefersReducedMotion()
  const [tokens, setTokens] = useState<{ head: string; accent: string } | null>(
    null,
  )
  const [isCompact, setIsCompact] = useState(false)

  useEffect(() => {
    setTokens({
      head: readToken('--color-head-fg', '#B9B4E8'),
      accent: readToken('--color-accent', '#E8A33D'),
    })
  }, [])

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 768px)')
    const sync = () => setIsCompact(mql.matches)
    sync()
    mql.addEventListener('change', sync)
    return () => mql.removeEventListener('change', sync)
  }, [])

  // Wait for tokens so the first rendered frame is already the right colour.
  if (!tokens) return null

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0"
    >
      <Canvas
        // R3F writes `pointer-events: auto` inline on its own container, which
        // overrides pointer-events-none on the wrapper above. Without this the
        // canvas swallows clicks on the hero's links.
        style={{ pointerEvents: 'none' }}
        // Capped, and capped harder on mobile. A phone rendering at native DPR
        // burns battery for detail nobody can see at that size.
        dpr={isCompact ? [1, 1.25] : [1, 1.75]}
        camera={{ position: [0, 0, 5], fov: 32 }}
        gl={{ antialias: !isCompact, alpha: true }}
        // Only redraw when something changed; under reduced motion nothing
        // does, so the GPU goes idle after the first frame.
        frameloop={reducedMotion ? 'demand' : 'always'}
      >
        <PlaceholderShape
          color={tokens.head}
          accent={tokens.accent}
          detail={isCompact ? 0 : 1}
          still={reducedMotion}
        />
      </Canvas>
    </div>
  )
}
