import { useEffect, useState } from 'react'

/**
 * Where the Hero and About visuals are dropped: short screens, and narrow ones
 * held sideways. Neither can hold the poster: a landscape phone (844x390) once
 * got it, with the copy 266px under the band.
 *
 * This is the single source for the breakpoint. The CSS side is the `poster`
 * custom variant in index.css, which must stay its exact complement; the
 * breakpoints test checks the two against each other. 767.98, not 768,
 * because `max-width: 768px` and CSS's `min-width: 768px` are both true at
 * exactly 768, which once left the iPad mini with the poster's band but no
 * portrait and no pin.
 */
export const COMPACT_QUERY = '(max-height: 540px), (max-width: 767.98px) and (orientation: landscape)'

/**
 * Upright phones: they get the whole Hero sequence, on a lighter path (a
 * 48-frame sprite, `position: sticky` instead of a GSAP pin, fewer About
 * points). In CSS this is `poster:max-md:`.
 */
export const PHONE_QUERY = '(max-width: 767.98px) and (orientation: portrait) and (min-height: 540.02px)'

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)

  useEffect(() => {
    const mql = window.matchMedia(query)
    const sync = () => setMatches(mql.matches)
    sync()
    mql.addEventListener('change', sync)
    return () => mql.removeEventListener('change', sync)
  }, [query])

  return matches
}

export function useIsCompact(): boolean {
  return useMediaQuery(COMPACT_QUERY)
}

export function useIsPhone(): boolean {
  return useMediaQuery(PHONE_QUERY)
}
