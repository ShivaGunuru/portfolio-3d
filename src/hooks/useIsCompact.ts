import { useEffect, useState } from 'react'

/**
 * Where every pinned visual on the site is dropped: narrow screens, and short
 * ones. Width alone used to decide this, which handed landscape phones
 * (844x390 and the like) the full desktop Hero on a screen too short to hold
 * it: the copy overflowed the band by 266px.
 *
 * This is the single source for the breakpoint. The CSS side is the `poster`
 * custom variant in index.css, which must stay its exact complement; the
 * breakpoints test checks the two against each other. 767.98, not 768,
 * because `max-width: 768px` and CSS's `min-width: 768px` are both true at
 * exactly 768, which once left the iPad mini with the poster's band but no
 * portrait and no pin.
 */
export const COMPACT_QUERY = '(max-width: 767.98px), (max-height: 540px)'

export function useIsCompact(): boolean {
  const [compact, setCompact] = useState(() => window.matchMedia(COMPACT_QUERY).matches)

  useEffect(() => {
    const mql = window.matchMedia(COMPACT_QUERY)
    const sync = () => setCompact(mql.matches)
    mql.addEventListener('change', sync)
    return () => mql.removeEventListener('change', sync)
  }, [])

  return compact
}
