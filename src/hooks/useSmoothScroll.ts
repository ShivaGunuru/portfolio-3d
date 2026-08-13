import { useEffect } from 'react'
import Lenis from 'lenis'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

import { usePrefersReducedMotion } from './usePrefersReducedMotion'

gsap.registerPlugin(ScrollTrigger)

/**
 * Runs Lenis and GSAP on ONE requestAnimationFrame loop, and keeps
 * ScrollTrigger in sync with the smoothed scroll position.
 *
 * Three wires do that job:
 *
 *  1. `lenis.on('scroll', ScrollTrigger.update)`: Lenis animates scroll
 *     position itself, so the browser's native scroll event is not a reliable
 *     signal. ScrollTrigger has to be told when Lenis moves, or triggers fire
 *     against a stale position.
 *
 *  2. `gsap.ticker.add(...)`: GSAP's ticker drives `lenis.raf()`. Lenis is
 *     deliberately never given its own `requestAnimationFrame` loop; two loops
 *     means two slightly different clocks and visible jitter between
 *     scroll-linked tweens and the scroll itself. GSAP's ticker is in
 *     milliseconds, Lenis expects milliseconds too, but the ticker hands out
 *     seconds, hence `time * 1000`.
 *
 *  3. `lagSmoothing(0)`: GSAP normally "catches up" after a long frame by
 *     adjusting its clock. That desynchronises it from Lenis, which does not
 *     do the same. Disabling it keeps both on identical time.
 *
 * Under `prefers-reduced-motion: reduce`, Lenis is never constructed at all.
 * Native scrolling is what that preference asks for, and ScrollTrigger works
 * against native scroll without any of the above.
 */
export function useSmoothScroll(): void {
  const reducedMotion = usePrefersReducedMotion()

  useEffect(() => {
    if (reducedMotion) {
      // Native scroll. Make sure ScrollTrigger is measuring against it.
      ScrollTrigger.refresh()
      return
    }

    const lenis = new Lenis({
      // Matches the reference feel: quick to respond, slow to settle.
      duration: 1.1,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      // Touch devices already have good native inertia, and hijacking it costs
      // battery for no perceived gain, part of the lighter mobile experience.
      syncTouch: false,
    })

    lenis.on('scroll', ScrollTrigger.update)

    const raf = (time: number) => {
      lenis.raf(time * 1000)
    }

    gsap.ticker.add(raf)
    gsap.ticker.lagSmoothing(0)

    // Anchor links must go through Lenis, or the browser's native jump fights
    // the smoothed position and ScrollTrigger ends up measuring mid-flight.
    const onAnchorClick = (event: MouseEvent) => {
      const anchor = (event.target as HTMLElement | null)?.closest?.(
        'a[href^="#"]',
      ) as HTMLAnchorElement | null
      if (!anchor) return

      const id = anchor.getAttribute('href')
      if (!id || id === '#') return

      const target = document.querySelector(id)
      if (!target) return

      event.preventDefault()
      lenis.scrollTo(target as HTMLElement, { offset: -96 })
      // Keep the URL and focus behaviour of a real anchor.
      history.pushState(null, '', id)
    }

    document.addEventListener('click', onAnchorClick)

    return () => {
      document.removeEventListener('click', onAnchorClick)
      lenis.off('scroll', ScrollTrigger.update)
      gsap.ticker.remove(raf)
      gsap.ticker.lagSmoothing(500, 33)
      lenis.destroy()
    }
  }, [reducedMotion])
}
