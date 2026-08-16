import { useEffect, useRef, useState, type RefObject } from 'react'
import { Canvas } from '@react-three/fiber'

import { usePortraitPoints } from '../hooks/usePortraitPoints'
import { HarmonicField } from './HarmonicField'
import { HeadPoints, type HeadMode } from './HeadPoints'

/**
 * Which scene a stage renders. `portrait` samples the photograph; `harmonic`
 * solves a spherical-harmonic field from an equation and has no source image.
 */
export type StageVariant = 'portrait' | 'harmonic'

/**
 * The portrait photograph the point cloud is sampled from, resolved at build
 * time from `src/assets/portrait.*`.
 *
 * Resolving it with `import.meta.glob` rather than requesting a fixed public
 * path matters for two reasons. The file is optional, and probing a fixed URL
 * for a file that is not there logs a 404 in every visitor's console; this
 * emits no request at all when there is no portrait. It also means the image
 * is hashed and served with immutable cache headers like any other asset,
 * instead of being an unversioned public file.
 *
 * Any of the four extensions works. If none is present, `PORTRAIT_URL` is
 * undefined and the stage falls back to the parametric head.
 */
const portraitModules = import.meta.glob<string>(
  '../assets/portrait.{jpg,jpeg,png,webp}',
  { eager: true, query: '?url', import: 'default' },
)

export const PORTRAIT_URL: string | undefined = Object.values(portraitModules)[0]

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
  variant?: StageVariant
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
  variant = 'portrait',
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

  // Only the portrait variant asks for the photograph. The harmonic field is
  // solved from an equation, so requesting and sampling an image for it would
  // be a hundred milliseconds of main-thread work for nothing.
  const { data: portrait, status: portraitStatus } = usePortraitPoints(
    variant === 'portrait' ? PORTRAIT_URL : undefined,
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
        {variant === 'harmonic' ? (
          <HarmonicField
            baseColor={tokens.base}
            accentColor={tokens.accent}
            glowColor={tokens.glow}
            progress={progress}
            still={reducedMotion}
            containerRef={container}
          />
        ) : (
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
        )}
      </Canvas>
    </div>
  )
}
