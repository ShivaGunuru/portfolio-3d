import { Suspense, lazy, useEffect, useRef, useState, type RefObject } from 'react'

import { PHONE_QUERY, useIsCompact } from '../hooks/useIsCompact'
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
 *  - Nothing is imported at all on compact screens, which never show it, and
 *    an upright phone imports three.js only when this box nears the viewport,
 *    so a visitor who never reaches About never pays for it.
 */
export function Stage({ progress, className }: StageProps) {
  const reducedMotion = usePrefersReducedMotion()
  const isCompact = useIsCompact()
  // Held back until the browser is idle, so the 3D chunk never competes with
  // fonts, copy and first paint for bandwidth.
  const [mayLoad, setMayLoad] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isCompact) return

    if (window.matchMedia(PHONE_QUERY).matches) {
      const box = boxRef.current
      if (!box) return
      const io = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setMayLoad(true)
        },
        { rootMargin: '100% 0px' },
      )
      io.observe(box)
      return () => io.disconnect()
    }

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
    <div ref={boxRef} className={className} aria-hidden="true">
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
