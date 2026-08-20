import { useEffect, useState, type RefObject } from 'react'

import cutoutManifest from '../assets/hero-cutout.json'
import { useHeroCutout } from '../hooks/useHeroCutout'
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
 *  exists once `HeroCutoutStage` decides loading may begin. A hook can't be
 *  called conditionally within one component; mounting this component
 *  conditionally is the same gate applied at the tree level instead. */
function HeroCutoutLoader({ progress, still }: LoaderProps) {
  const { data, status } = useHeroCutout()
  return (
    <>
      {/* Surfaces load state so a slow or failed fetch is inspectable
          rather than silently blank. */}
      <span className="hidden" data-hero-cutout={status} />
      {data && <HeroCutout data={data} progress={progress} still={still} className="h-full w-full" />}
    </>
  )
}

interface HeroCutoutStageProps {
  progress: RefObject<number>
  /** Applied to the reserved box, not to the canvas. */
  className?: string
}

/**
 * Reserves the Hero visual's layout box and only then loads the sprite sheet
 * into it, the same shape `Stage.tsx` uses for the About field, minus
 * React.lazy(): there is no three.js chunk to defer here, just a decorative
 * image asset that still shouldn't compete with fonts and first paint for
 * bandwidth.
 *
 * Hidden entirely below 768px, matching every other pinned visual on this
 * site: pinning plus a mobile browser's address-bar show/hide resize is a
 * well-known source of jank, independent of what's being pinned.
 */
export function HeroCutoutStage({ progress, className }: HeroCutoutStageProps) {
  const reducedMotion = usePrefersReducedMotion()
  const [isCompact, setIsCompact] = useState(() =>
    window.matchMedia('(max-width: 768px)').matches,
  )
  const [mayLoad, setMayLoad] = useState(false)

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 768px)')
    const sync = () => setIsCompact(mql.matches)
    mql.addEventListener('change', sync)
    return () => mql.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    if (isCompact) return

    type IdleWindow = Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number
      cancelIdleCallback?: (handle: number) => void
    }
    const w = window as IdleWindow

    if (typeof w.requestIdleCallback === 'function') {
      const handle = w.requestIdleCallback(() => setMayLoad(true), { timeout: 2000 })
      return () => w.cancelIdleCallback?.(handle)
    }

    const t = window.setTimeout(() => setMayLoad(true), 400)
    return () => window.clearTimeout(t)
  }, [isCompact])

  if (isCompact) return null

  return (
    <div className={className} style={{ aspectRatio: cutoutAspectRatio }} aria-hidden="true">
      {mayLoad && <HeroCutoutLoader progress={progress} still={reducedMotion} />}
    </div>
  )
}
