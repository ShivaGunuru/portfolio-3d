import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { COMPACT_QUERY } from '../hooks/useIsCompact'

/**
 * The poster Hero is switched on in two places: CSS (the `poster` variant in
 * index.css) lays it out, and JS (COMPACT_QUERY) mounts the portrait, the pin
 * and the lens card. If the two ever disagree there is a band of screen sizes
 * that gets half a Hero, which is exactly what happened at 768px when CSS
 * said `min-width: 768px` and JS said `max-width: 768px`.
 */
const css = readFileSync(fileURLToPath(new URL('../index.css', import.meta.url)), 'utf8')

function px(query: string, feature: string): number {
  const match = query.match(new RegExp(`${feature}:\\s*([\\d.]+)px`))
  if (!match) throw new Error(`no ${feature} in: ${query}`)
  return Number(match[1])
}

describe('breakpoints', () => {
  const variant = css.match(/@custom-variant poster \(@media ([^;]+)\);/)?.[1] ?? ''

  it('declares the poster variant', () => {
    expect(variant).not.toBe('')
  })

  it('makes the poster variant the exact complement of the compact query', () => {
    // Compact is "narrow OR short"; poster must be "wide AND tall", with the
    // boundaries meeting and not overlapping.
    expect(COMPACT_QUERY).toMatch(/,/)
    expect(variant).toMatch(/\band\b/)
    const gap = (a: number, b: number) => b - a
    expect(gap(px(COMPACT_QUERY, 'max-width'), px(variant, 'min-width'))).toBeGreaterThan(0)
    expect(gap(px(COMPACT_QUERY, 'max-width'), px(variant, 'min-width'))).toBeLessThan(0.1)
    expect(gap(px(COMPACT_QUERY, 'max-height'), px(variant, 'min-height'))).toBeGreaterThan(0)
    expect(gap(px(COMPACT_QUERY, 'max-height'), px(variant, 'min-height'))).toBeLessThan(0.1)
  })
})
