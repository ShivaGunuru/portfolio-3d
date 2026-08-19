import { useEffect, useRef, useState, type RefObject } from 'react'
import { Canvas } from '@react-three/fiber'

import { useHeroField } from '../hooks/useHeroField'
import { HarmonicField } from './HarmonicField'
import { VideoField } from './VideoField'

/**
 * Which scene a stage renders. `video` samples the baked Hero clip; `harmonic`
 * solves a spherical-harmonic field from an equation and has no source asset
 * at all.
 */
export type StageVariant = 'video' | 'harmonic'

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
  className?: string
  /** Resolved by `Stage`, which already needs it to decide whether to load. */
  reducedMotion: boolean
  variant: StageVariant
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
  className,
  reducedMotion,
  variant,
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

  // Only the video variant needs the baked asset. Fetching 3.2MB for a scene
  // that would not use it is the exact waste the portrait loader avoided for
  // the harmonic field before it.
  const { data: heroField, status: heroFieldStatus } = useHeroField()
  const wantsVideo = variant === 'video'

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
      // Surfaces load state for the video variant, so a slow or failed fetch
      // of a 3.2MB asset is inspectable rather than silently blank.
      data-hero-field={wantsVideo ? heroFieldStatus : undefined}
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
        {variant === 'harmonic' && (
          <HarmonicField
            baseColor={tokens.base}
            accentColor={tokens.accent}
            glowColor={tokens.glow}
            progress={progress}
            still={reducedMotion}
            containerRef={container}
          />
        )}
        {wantsVideo && heroField && (
          <VideoField
            data={heroField}
            glowColor={tokens.glow}
            progress={progress}
            still={reducedMotion}
            containerRef={container}
          />
        )}
      </Canvas>
    </div>
  )
}
