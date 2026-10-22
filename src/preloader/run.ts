import { loadHeroCutout } from '../hooks/useHeroCutout'
import { COMPACT_QUERY } from '../hooks/useIsCompact'
import { waitForGate } from './gate'

const MIN_MS = 1200
const MAX_MS = 6000
/**
 * Backstop for the reveal's transitionend: the last band starts 5 x 70ms late
 * and slides for 900ms, so 1600ms leaves comfortable slack. transitionend can
 * legitimately never arrive (a backgrounded tab, a band already off-screen),
 * and the overlay must be removed regardless.
 */
const REVEAL_FALLBACK_MS = 1600

let revealed: Promise<void> = Promise.resolve()

/** Resolves once the overlay is gone, or immediately if there never was one. */
export function whenRevealed(): Promise<void> {
  return revealed
}

export function isPreloading(): boolean {
  return document.getElementById('preloader') !== null
}

function windowLoaded(): Promise<void> {
  if (document.readyState === 'complete') return Promise.resolve()
  return new Promise((resolve) =>
    window.addEventListener('load', () => resolve(), { once: true }),
  )
}

function reveal(el: HTMLElement): Promise<void> {
  return new Promise((resolve) => {
    const done = () => {
      el.remove()
      resolve()
    }
    const bands = el.querySelectorAll('.preloader-band')
    bands[bands.length - 1]?.addEventListener('transitionend', done, { once: true })
    window.setTimeout(done, REVEAL_FALLBACK_MS)
    el.classList.add('is-leaving')
  })
}

/**
 * Wires the static overlay from index.html to what it waits for. Called from
 * main.tsx before React renders, so asset loading starts as early as it can.
 */
export function startPreloader(): void {
  const el = document.getElementById('preloader')
  if (!el) return

  document.fonts.ready.then(() => el.classList.add('has-fonts'))

  const tasks: Promise<unknown>[] = [document.fonts.ready, windowLoaded()]
  // Same breakpoint as HeroCutoutStage. On compact screens the Hero visual never
  // mounts, so waiting for its sprite would delay the reveal for nothing and
  // spend a phone's data on a multi-megabyte image it will never show.
  if (!window.matchMedia(COMPACT_QUERY).matches) {
    tasks.push(loadHeroCutout())
  }

  revealed = waitForGate(tasks, {
    minMs: MIN_MS,
    maxMs: MAX_MS,
    onProgress: (p) => el.style.setProperty('--p', String(p)),
  }).then(() => reveal(el))
}
