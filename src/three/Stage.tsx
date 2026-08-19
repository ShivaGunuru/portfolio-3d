import { Suspense, lazy, useEffect, useState, type RefObject } from 'react'

import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'

/**
 * Deferred so that three.js, which is by far the heaviest dependency, is not
 * part of the initial download. The 3D layer is decorative: the page's text
 * must paint without waiting on it.
 */
const HeadStage = lazy(() =>
  import('./HeadStage').then((m) => ({ default: m.HeadStage })),
)

interface StageProps {
  progress: RefObject<number>
  /** Applied to the reserved box, not to the canvas. */
  className?: string
}

/**
 * Reserves the 3D stage's layout box and only then loads the scene into it.
 *
 * Two things make this safe rather than merely lazy:
 *
 *  - The wrapper element is rendered immediately at its final size, so the
 *    canvas arriving later cannot shift anything. Lazy-loading the whole
 *    stage, wrapper included, would collapse the grid column until the chunk
 *    resolved and then push the layout sideways on arrival.
 *
 *  - Nothing is imported at all below 768px, so a phone never downloads
 *    three.js. That is the difference between a lighter mobile experience and
 *    a desktop scene that merely renders nothing after paying for itself.
 */
export function Stage({ progress, className }: StageProps) {
  const reducedMotion = usePrefersReducedMotion()
  const [isCompact, setIsCompact] = useState(() =>
    window.matchMedia('(max-width: 768px)').matches,
  )
  // Held back until the browser is idle, so the 3D chunk never competes with
  // fonts, copy and first paint for bandwidth.
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
      const handle = w.requestIdleCallback(() => setMayLoad(true), {
        timeout: 2000,
      })
      return () => w.cancelIdleCallback?.(handle)
    }

    // Safari has no requestIdleCallback; a short timer is close enough.
    const t = window.setTimeout(() => setMayLoad(true), 400)
    return () => window.clearTimeout(t)
  }, [isCompact])

  // Below the breakpoint the stage does not exist at all, and neither does its
  // reserved space: the sections collapse to a single column there.
  if (isCompact) return null

  return (
    <div className={className} aria-hidden="true">
      {mayLoad && (
        <Suspense fallback={null}>
          <HeadStage
            progress={progress}
            className="h-full w-full"
            reducedMotion={reducedMotion}
          />
        </Suspense>
      )}
    </div>
  )
}
