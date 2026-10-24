import type { RefObject } from 'react'

import cutoutManifest from '../assets/hero-cutout.json'
import lensStillUrl from '../assets/hero-lens-still.webp?url'
import { useHeroCutout } from '../hooks/useHeroCutout'
import { useIsCompact } from '../hooks/useIsCompact'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'
import { HeroCutout } from './HeroCutout'

// The manifest is a small bundled JSON import, not a fetch, so its aspect
// ratio is known synchronously at module load: the reserved box below can
// use the sprite's real proportions from the very first render instead of a
// guessed placeholder ratio, with nothing to correct once the sprite sheet
// itself arrives later. That's what keeps this CLS-safe despite the sprite
// being lazy-loaded.
const cutoutAspectRatio = cutoutManifest.frameWidth / cutoutManifest.frameHeight

interface LoaderProps {
  progress: RefObject<number>
  still: boolean
}

/** Split out so `useHeroCutout` (and the fetch it starts on mount) only
 *  exists above the mobile breakpoint. A hook can't be called conditionally
 *  within one component; mounting this component conditionally is the same
 *  gate applied at the tree level instead. */
function HeroCutoutLoader({ progress, still }: LoaderProps) {
  const { data, status } = useHeroCutout()
  return (
    <>
      {/* Surfaces load state so a slow or failed fetch is inspectable
          rather than silently blank. */}
      <span className="hidden" data-hero-cutout={status} />
      {data && (
        <HeroCutout
          data={data}
          progress={progress}
          still={still}
          className="h-full w-full"
        />
      )}
    </>
  )
}

interface HeroCutoutStageProps {
  progress: RefObject<number>
  /** Applied to the reserved box, not to the canvas. */
  className?: string
  /** The reserved box, for useHeroCamera to measure and position. */
  boxRef?: RefObject<HTMLDivElement | null>
  /** The hi-res still that stands in for the canvas during the lens push. */
  stillRef?: RefObject<HTMLImageElement | null>
}

/**
 * Reserves the Hero visual's layout box and loads the sprite sheet into it.
 * The preloader (src/preloader/run.ts) has usually started that download
 * already; `useHeroCutout` memoises it, so this picks up the same promise.
 *
 * Hidden entirely on compact screens (narrow or short; see useIsCompact),
 * matching every other pinned visual on this site: pinning plus a mobile
 * browser's address-bar show/hide resize is a well-known source of jank,
 * independent of what's being pinned.
 *
 * The portrait is a true cut-out (transparent background, see
 * src/dev/grade-to-white.py) drawn with ordinary blending over the giant
 * back name. It used to rely on a blend mode to hide a white background,
 * which darkened the face wherever the name sat behind it.
 */
export function HeroCutoutStage({ progress, className, boxRef, stillRef }: HeroCutoutStageProps) {
  const reducedMotion = usePrefersReducedMotion()
  const isCompact = useIsCompact()

  if (isCompact) return null

  // Mounts the loader straight away. This used to wait for
  // requestIdleCallback so the sprite would not compete with first paint,
  // but the preloader now hides first paint and starts this same download
  // itself (run.ts). Waiting for idle here would let the Hero pop in after
  // the reveal, the one thing the preloader exists to prevent.
  // useHeroCamera places this box with `top` (static, once per measure) and
  // drifts it with a transform (every frame, compositor-only).
  return (
    <div
      ref={boxRef}
      className={`relative ${className ?? ''}`}
      style={{ aspectRatio: cutoutAspectRatio }}
      aria-hidden="true"
    >
      <HeroCutoutLoader progress={progress} still={reducedMotion} />
      {/* The last poster frame at the source's own resolution, so the lens
          holds up deeper into the push. It REPLACES the canvas for the push
          (useHeroCamera hides one as it shows the other), never sits on top
          of it: same pose, so the swap is invisible. */}
      <img
        ref={stillRef}
        src={lensStillUrl}
        alt=""
        decoding="async"
        className="invisible absolute inset-0 h-full w-full"
      />
    </div>
  )
}
