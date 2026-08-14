import { useEffect, useRef, useState, type RefObject } from 'react'
import { Canvas } from '@react-three/fiber'

import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'
import { HeadPoints, type HeadMode } from './HeadPoints'

/**
 * Reads a design token off the document. Tailwind's `@theme` emits every token
 * in src/index.css as a real CSS custom property, so the 3D layer consumes the
 * exact values the utilities are generated from rather than a second copy.
 */
function readToken(name: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim()
  return value || fallback
}

interface HeadStageProps {
  /** 0..1 scroll-pin progress, owned by the section that renders this. */
  progress: RefObject<number>
  mode: HeadMode
  className?: string
}

/**
 * A single section's 3D stage — scoped to its own layout column, never a
 * page-wide background layer.
 *
 * Hidden entirely under 768px. Per the "mobile is a deliberate lighter
 * experience" non-negotiable, this isn't a shrunk version of the desktop
 * scene: pinning combined with a mobile browser's address-bar show/hide
 * resize behaviour is a well-known source of jank, so mobile gets no 3D here
 * at all rather than a smaller, glitchier version of it.
 */
export function HeadStage({ progress, mode, className }: HeadStageProps) {
  const reducedMotion = usePrefersReducedMotion()
  const [isCompact, setIsCompact] = useState(() =>
    window.matchMedia('(max-width: 768px)').matches,
  )
  const [isNearView, setIsNearView] = useState(false)
  const container = useRef<HTMLDivElement>(null)

  // Static for the session: design tokens don't change after the stylesheet
  // is applied, so this is computed once rather than re-read every render.
  const [tokens] = useState(() => ({
    base: readToken('--color-head-fg', '#B9B4E8'),
    accent: readToken('--color-accent', '#E8A33D'),
    glow: readToken('--color-head-glow', '#FFE3B0'),
  }))

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 768px)')
    const sync = () => setIsCompact(mql.matches)
    mql.addEventListener('change', sync)
    return () => mql.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    const el = container.current
    if (!el) return
    // Generous margin so rendering resumes slightly before the stage is
    // actually on screen, rather than starting from a stale first frame.
    const io = new IntersectionObserver(
      ([entry]) => setIsNearView(entry.isIntersecting),
      { rootMargin: '50% 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  if (isCompact) return null

  return (
    <div ref={container} aria-hidden="true" className={className}>
      <Canvas
        // R3F writes `pointer-events: auto` inline on its own container, which
        // would let the canvas swallow clicks on whatever sits near it.
        style={{ pointerEvents: 'none' }}
        dpr={[1, 1.75]}
        camera={{ position: [0, 0.05, 7.3], fov: 28 }}
        gl={{ antialias: false, alpha: true }}
        // Off-screen or reduced-motion: render once and idle, rather than
        // paying for a live frame loop nobody can see or that shouldn't move.
        frameloop={reducedMotion || !isNearView ? 'demand' : 'always'}
      >
        <HeadPoints
          baseColor={tokens.base}
          accentColor={tokens.accent}
          glowColor={tokens.glow}
          progress={progress}
          mode={mode}
          still={reducedMotion}
          containerRef={container}
        />
      </Canvas>
    </div>
  )
}
