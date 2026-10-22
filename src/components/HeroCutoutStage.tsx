import type { RefObject } from 'react'

import cutoutManifest from '../assets/hero-cutout.json'
import lensStillUrl from '../assets/hero-lens-still.png?url'
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
          className="h-full w-full mix-blend-multiply"
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
 * matching every other pinned visual on this site: pinning plus a mobile browser's address-bar show/hide resize is a
 * well-known source of jank, independent of what's being pinned.
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
  // `relative`, never a transform: useHeroCamera moves this box with `top`.
  // A transform (or translate, or z-index) here would start a new stacking
  // context, and multiply would then blend against that context's empty
  // backdrop instead of the back name behind it, bringing the frames' white
  // rectangle straight back.
  return (
    <div
      ref={boxRef}
      className={`relative ${className ?? ''}`}
      style={{ aspectRatio: cutoutAspectRatio }}
      aria-hidden="true"
    >
      <HeroCutoutLoader progress={progress} still={reducedMotion} />
      {/* The last poster frame at the source's own resolution, about twice
          the sprite's, so the lens holds up deeper into the push. Swapped in
          with visibility, not faded: it is the same pose as the canvas's
          final frame, so the swap is invisible. Its white background is pure
          255 (rgb24 PNG, like the sprite), which multiply needs. */}
      <img
        ref={stillRef}
        src={lensStillUrl}
        alt=""
        decoding="async"
        className="invisible absolute inset-0 h-full w-full mix-blend-multiply"
      />
    </div>
  )
}
