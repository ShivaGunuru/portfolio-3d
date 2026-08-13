import { useEffect, useRef } from 'react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

/** Section ids, in document order. Phase runs 0 at the first, 3 at the last. */
export const PHASE_SECTIONS = ['hero', 'work', 'about', 'contact'] as const

/**
 * Maps scroll position onto a continuous 0..3 value, one unit per section.
 *
 * Section offsets are measured once and cached, then recomputed only on
 * ScrollTrigger refresh (resize, font load, layout change). Reading
 * getBoundingClientRect every frame would force a synchronous layout on each
 * one, which is exactly the kind of per-frame reflow that makes scroll-linked
 * 3D stutter.
 *
 * The returned value is a ref rather than state: it changes every frame and
 * belongs to the render loop, not to React.
 */
export function useScrollPhase() {
  const phase = useRef(0)
  const offsets = useRef<number[]>([])

  useEffect(() => {
    const measure = () => {
      offsets.current = PHASE_SECTIONS.map((id) => {
        const el = document.getElementById(id)
        if (!el) return 0
        return el.getBoundingClientRect().top + window.scrollY
      })
    }

    measure()

    // ScrollTrigger already refreshes on resize and on load; piggy-backing on
    // it keeps our measurements in step with its own.
    ScrollTrigger.addEventListener('refresh', measure)
    window.addEventListener('resize', measure)

    return () => {
      ScrollTrigger.removeEventListener('refresh', measure)
      window.removeEventListener('resize', measure)
    }
  }, [])

  /**
   * Call once per frame. Lenis scrolls the window natively, so `scrollY` is
   * already the smoothed position and no Lenis instance is needed here.
   */
  const sample = () => {
    const tops = offsets.current
    if (tops.length < 2) return 0

    // Bias the sample point down the viewport so a section "counts" once it is
    // meaningfully on screen rather than the instant its top edge appears.
    const y = window.scrollY + window.innerHeight * 0.42

    let p = 0
    for (let i = 0; i < tops.length - 1; i++) {
      if (y >= tops[i]) {
        const span = Math.max(1, tops[i + 1] - tops[i])
        p = i + Math.min(1, (y - tops[i]) / span)
      }
    }
    phase.current = p
    return p
  }

  return { phase, sample }
}
