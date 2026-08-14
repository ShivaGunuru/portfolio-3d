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
    // Fonts are self-hosted but still load asynchronously (font-display:
    // swap): the first paint uses a fallback, then the real font swaps in and
    // reflows the page. Hero's headline is set in Syne at a large clamped
    // size, so that swap visibly changes Hero's total height. Every pinned
    // stage's ScrollTrigger measures its boundaries as soon as it mounts,
    // which can be before this swap happens -- without a refresh afterward,
    // those boundaries stay pinned to the fallback font's (slightly smaller)
    // layout, so a nav click's pin-boundary clamp lands just short of where
    // the pin actually releases under the real, final layout.
    document.fonts.ready.then(() => ScrollTrigger.refresh())

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

      // No header-clearance offset here: every nav target (#work, #about,
      // #contact) is a section with its own 120px top padding (pt-30),
      // which already clears the 64px fixed header with room to spare.
      // Subtracting a header offset on top of that padding used to leave a
      // section landing ~200px short of its heading, with the tail of the
      // previous section still peeking out under the header, which read as
      // the scroll having stopped short.
      let targetY = target.getBoundingClientRect().top + window.scrollY

      // A section that immediately follows a pinned one (Work after Hero,
      // Contact after About) sits exactly at that pin's release point, so a
      // computed target at or near that point can land inside the pin's
      // still-active range. Scrolling there shows the pinned section frozen
      // on screen, overlapping the real target underneath it. Clamp past any
      // pin the computed target would otherwise land inside.
      //
      // The +32 is deliberate slack, not just the exact end value: landing
      // precisely at a computed boundary is fragile against the boundary
      // itself being off by even a few pixels (a font swap reflowing the
      // pinned section after ScrollTrigger already measured it, sub-pixel
      // rounding, and so on), any of which puts the "exact" landing spot back
      // inside the pin. Both target sections already carry their own 120px of
      // top padding, so a little extra costs nothing visually.
      for (const trigger of ScrollTrigger.getAll()) {
        if (trigger.pin && targetY > trigger.start && targetY < trigger.end) {
          targetY = trigger.end + 32
        }
      }

      // `lock` holds the programmatic animation through to completion even if
      // Lenis picks up incoming scroll input mid-flight, e.g. residual wheel or
      // trackpad momentum still arriving right after the click. Without it,
      // that input reads as "the user wants to scroll" and cuts the tween
      // short wherever it happened to be, landing well short of the section.
      lenis.scrollTo(targetY, { lock: true })
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
