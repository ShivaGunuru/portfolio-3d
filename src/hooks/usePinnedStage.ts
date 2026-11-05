import { useEffect, useRef, type RefObject } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

import { useIsCompact, useIsPhone } from './useIsCompact'
import { usePrefersReducedMotion } from './usePrefersReducedMotion'

gsap.registerPlugin(ScrollTrigger)

interface UsePinnedStageOptions {
  /** Extra scroll distance the pin consumes, as a percentage of viewport height. */
  distance?: number
  /**
   * What replaces the GSAP pin on an upright phone.
   *  - `sticky`: the section holds with CSS `position: sticky` inside a taller
   *    parent, and this only reads progress. The caller's markup provides both.
   *  - `track` (default): no hold at all. Progress runs while the section's
   *    last screenful passes by, for a section too tall to hold on a phone.
   */
  phone?: 'sticky' | 'track'
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
 * A GSAP pin is never used on an upright phone. Touch scrolling runs on the
 * compositor thread and a JS pin corrects the position after the fact, so it
 * lags the finger and jumps when the address bar moves. `position: sticky` is
 * applied by the compositor itself.
 *
 * Skipped entirely under `prefers-reduced-motion` or on compact screens (where
 * the stage this drives is not rendered at all): progress is held at 1, the
 * settled end state, and the section scrolls normally.
 */
export function usePinnedStage(
  sectionRef: RefObject<HTMLElement | null>,
  { distance = 100, phone = 'track' }: UsePinnedStageOptions = {},
) {
  const reducedMotion = usePrefersReducedMotion()
  const isCompact = useIsCompact()
  const isPhone = useIsPhone()
  const skip = reducedMotion || isCompact
  const progress = useRef(skip ? 1 : 0)

  useEffect(() => {
    const el = sectionRef.current
    if (!el || skip) {
      progress.current = 1
      return
    }

    progress.current = 0

    const ctx = gsap.context(() => {
      const onUpdate = (self: ScrollTrigger) => {
        progress.current = self.progress
      }

      if (isPhone) {
        const parent = el.parentElement
        if (phone === 'sticky' && parent) {
          ScrollTrigger.create({
            trigger: parent,
            start: 'top top',
            // Exactly how long the section stays stuck, whatever the address
            // bar is doing.
            end: () => `+=${parent.offsetHeight - el.offsetHeight}`,
            scrub: true,
            invalidateOnRefresh: true,
            onUpdate,
          })
        } else {
          ScrollTrigger.create({
            trigger: el,
            start: 'bottom bottom+=500',
            end: 'bottom top+=100',
            scrub: true,
            invalidateOnRefresh: true,
            onUpdate,
          })
        }
        return
      }

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
        onUpdate,
      })
    }, el)

    return () => ctx.revert()
  }, [skip, isPhone, phone, sectionRef, distance])

  return progress
}
