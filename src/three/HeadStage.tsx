import { useEffect, useRef, useState, type RefObject } from 'react'
import { Canvas } from '@react-three/fiber'

import { usePortraitPoints } from '../hooks/usePortraitPoints'
import { HeadPoints, type HeadMode } from './HeadPoints'

/**
 * Candidate paths for the portrait photograph the point cloud is sampled from,
 * tried in order. Both extensions are accepted so the file can be dropped in
 * as either without editing code.
 *
 * If none load, the stage falls back to the parametric head, so the site is
 * never broken by a missing asset.
 */
export const PORTRAIT_SOURCES = [
  '/images/portrait.jpg',
  '/images/portrait.png',
] as const

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
  /** Resolved by `Stage`, which already needs it to decide whether to load. */
  reducedMotion: boolean
}

/**
 * A single section's 3D scene, scoped to its own layout column rather than
 * being a page-wide background layer.
 *
 * This module is loaded lazily by `Stage`, which owns the breakpoint check and
 * reserves the layout box beforehand. Importing three.js is therefore already
 * a decision by the time this renders: it is only reached on viewports that
 * will actually show a scene.
 */
export function HeadStage({
  progress,
  mode,
  className,
  reducedMotion,
}: HeadStageProps) {
  const [isNearView, setIsNearView] = useState(false)
  const container = useRef<HTMLDivElement>(null)

  // Static for the session: design tokens don't change after the stylesheet
  // is applied, so this is computed once rather than re-read every render.
  const [tokens] = useState(() => ({
    base: readToken('--color-head-fg', '#B9B4E8'),
    accent: readToken('--color-accent', '#E8A33D'),
    glow: readToken('--color-head-glow', '#FFE3B0'),
  }))

  // Both stages request the same URL, so the browser cache serves the second
  // without a second network round trip.
  const { data: portrait, status: portraitStatus } = usePortraitPoints(
    PORTRAIT_SOURCES,
    { baseColor: tokens.base, accentColor: tokens.accent },
  )

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

  return (
    <div
      ref={container}
      className={className}
      // Surfaces which source the cloud came from. 'ready' means the photo was
      // sampled; 'unavailable' means it fell back to the parametric head. Makes
      // a missing or unreadable portrait visible instead of silent.
      data-portrait={portraitStatus}
      data-points={portrait ? portrait.count : undefined}
    >
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
          portrait={portrait}
        />
      </Canvas>
    </div>
  )
}
