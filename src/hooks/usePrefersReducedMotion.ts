import { useSyncExternalStore } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

function subscribe(onChange: () => void) {
  const mql = window.matchMedia(QUERY)
  mql.addEventListener('change', onChange)
  return () => mql.removeEventListener('change', onChange)
}

function getSnapshot() {
  return window.matchMedia(QUERY).matches
}

/**
 * Server snapshot assumes reduced motion. If this is ever prerendered, the
 * still frame is the safe first paint — motion can start after hydration,
 * but motion that has to be yanked away cannot be un-shown.
 */
function getServerSnapshot() {
  return true
}

/**
 * Live — reacts if the OS preference changes mid-session rather than only
 * reading it once at mount.
 */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

/** Imperative read, for use outside React (Three.js loops, GSAP setup). */
export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia(QUERY).matches
}
