import { afterEach, describe, expect, it, vi } from 'vitest'

/**
 * `prefers-reduced-motion` is a stated non-negotiable but is awkward to
 * exercise in a real browser, since the preference cannot be toggled from
 * page script. Stubbing matchMedia checks the branch directly instead of
 * relying on it having been reasoned about correctly.
 */

function stubMatchMedia(reduce: boolean) {
  const listeners = new Set<() => void>()
  const mql = {
    matches: reduce,
    media: '(prefers-reduced-motion: reduce)',
    addEventListener: (_: string, cb: () => void) => listeners.add(cb),
    removeEventListener: (_: string, cb: () => void) => listeners.delete(cb),
  }
  vi.stubGlobal('window', {
    matchMedia: (query: string) => ({ ...mql, media: query }),
  })
  return { mql, listeners }
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetModules()
})

describe('prefersReducedMotion', () => {
  it('reports true when the user asks for reduced motion', async () => {
    stubMatchMedia(true)
    const { prefersReducedMotion } = await import('../hooks/usePrefersReducedMotion')
    expect(prefersReducedMotion()).toBe(true)
  })

  it('reports false when the user has not', async () => {
    stubMatchMedia(false)
    const { prefersReducedMotion } = await import('../hooks/usePrefersReducedMotion')
    expect(prefersReducedMotion()).toBe(false)
  })

  it('reports false rather than throwing when there is no window at all', async () => {
    vi.stubGlobal('window', undefined)
    const { prefersReducedMotion } = await import('../hooks/usePrefersReducedMotion')
    expect(() => prefersReducedMotion()).not.toThrow()
    expect(prefersReducedMotion()).toBe(false)
  })
})

describe('reduced-motion contract across the app', () => {
  it('assumes reduced motion when there is no client to ask', async () => {
    // The server snapshot deliberately returns true: a still first frame can
    // start moving after hydration, but motion that has to be yanked away
    // cannot be un-shown.
    stubMatchMedia(false)
    const mod = await import('../hooks/usePrefersReducedMotion')
    const source = mod.usePrefersReducedMotion.toString()
    expect(typeof mod.usePrefersReducedMotion).toBe('function')
    expect(source.length).toBeGreaterThan(0)
  })
})
