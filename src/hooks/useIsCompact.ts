import { useEffect, useState } from 'react'

/** The breakpoint below which every pinned visual on the site is dropped. */
const COMPACT_QUERY = '(max-width: 768px)'

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
