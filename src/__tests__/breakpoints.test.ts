import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { COMPACT_QUERY, PHONE_QUERY } from '../hooks/useIsCompact'

/**
 * The poster Hero is switched on in two places: CSS (the `poster` variant in
 * index.css) lays it out, and JS (COMPACT_QUERY) mounts the portrait, the pin
 * and the lens card. If the two ever disagree there is a band of screen sizes
 * that gets half a Hero, which is exactly what happened at 768px when CSS
 * said `min-width: 768px` and JS said `max-width: 768px`.
 */
const css = readFileSync(fileURLToPath(new URL('../index.css', import.meta.url)), 'utf8')

/** Evaluates a comma-separated media query for one screen. */
function matches(query: string, width: number, height: number): boolean {
  return query.split(',').some((part) =>
    [...part.matchAll(/\(([a-z-]+):\s*([\w.]+?)(?:px)?\)/g)].every(([, feature, value]) => {
      if (feature === 'min-width') return width >= Number(value)
      if (feature === 'max-width') return width <= Number(value)
      if (feature === 'min-height') return height >= Number(value)
      if (feature === 'max-height') return height <= Number(value)
      if (feature === 'orientation') return value === 'portrait' ? height >= width : width > height
      throw new Error(`unknown feature ${feature}`)
    }),
  )
}

describe('breakpoints', () => {
  const variant = css.match(/@custom-variant poster \{\s*@media ([^{]+)\{/)?.[1] ?? ''

  it('declares the poster variant', () => {
    expect(variant).not.toBe('')
  })

  it('makes the poster variant the complement of the compact query', () => {
    // Either side of each boundary, so an overlap shows up, as at 768 when CSS
    // and JS both claimed it. The boundaries themselves sit 0.02px apart, which
    // no real screen lands inside.
    const widths = [320, 390, 540, 767, 767.98, 768, 800, 1024, 1440]
    const heights = [320, 390, 540, 540.02, 568, 767, 768, 800, 844, 1024]
    for (const w of widths) {
      for (const h of heights) {
        expect([w, h, matches(variant, w, h)]).toEqual([w, h, !matches(COMPACT_QUERY, w, h)])
      }
    }
  })

  it('gives the poster to upright phones and tablets, never to landscape phones', () => {
    for (const [w, h] of [[390, 844], [360, 640], [768, 1024], [1440, 900]]) {
      expect(matches(COMPACT_QUERY, w, h)).toBe(false)
    }
    for (const [w, h] of [[844, 390], [640, 360], [667, 375]]) {
      expect(matches(COMPACT_QUERY, w, h)).toBe(true)
    }
  })

  it('counts a screen as a phone only inside the poster layout', () => {
    expect(matches(PHONE_QUERY, 390, 844)).toBe(true)
    expect(matches(PHONE_QUERY, 768, 1024)).toBe(false)
    expect(matches(PHONE_QUERY, 844, 390)).toBe(false)
    expect(matches(PHONE_QUERY, 390, 500)).toBe(false)
  })
})
