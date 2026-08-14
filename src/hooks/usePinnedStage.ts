import { useEffect, useRef, useState, type RefObject } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

import { usePrefersReducedMotion } from './usePrefersReducedMotion'

gsap.registerPlugin(ScrollTrigger)

interface UsePinnedStageOptions {
  /** Extra scroll distance the pin consumes, as a percentage of viewport height. */
  distance?: number
}

/**
 * Pins `sectionRef`'s element in place and turns the scroll gesture that would
 * otherwise move past it into a 0..1 progress value instead. Once progress
 * reaches 1, the section unpins and normal scrolling continues to whatever
 * comes next.
 *
 * `scrub: true` (not a numeric lerp value) is deliberate: Lenis already
 * smooths the underlying scroll position, so this stays a direct 1:1 mapping
 * rather than compounding a second layer of lag on top of Lenis's.
 *
 * Skipped entirely under `prefers-reduced-motion` or on narrow viewports
 * (where the 3D stage this drives is not rendered at all): progress is held
 * at 1, the settled end state, and the section scrolls normally.
 */
export function usePinnedStage(
  sectionRef: RefObject<HTMLElement | null>,
  { distance = 100 }: UsePinnedStageOptions = {},
) {
  const reducedMotion = usePrefersReducedMotion()
  const [isCompact, setIsCompact] = useState(() =>
    window.matchMedia('(max-width: 768px)').matches,
  )
  const skip = reducedMotion || isCompact
  const progress = useRef(skip ? 1 : 0)

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 768px)')
    const sync = () => setIsCompact(mql.matches)
    mql.addEventListener('change', sync)
    return () => mql.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    const el = sectionRef.current
    if (!el || skip) {
      progress.current = 1
      return
    }

    progress.current = 0

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: el,
        start: 'top top',
        end: `+=${distance}%`,
        pin: true,
        scrub: true,
        // Reduces the visual snap when a pin engages right at the top of the
        // page, where Hero's does from the very first scroll pixel.
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          progress.current = self.progress
        },
      })
    }, el)

    return () => ctx.revert()
  }, [skip, sectionRef, distance])

  return progress
}
