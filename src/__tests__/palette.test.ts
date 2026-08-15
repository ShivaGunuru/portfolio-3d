import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * Contrast is checked against the stylesheet rather than a copy of the values,
 * so editing a token in src/index.css is what this test actually guards. Two
 * tokens (`dim` and `faint`) previously shipped below AA, the sign-off at
 * 1.96:1 and effectively invisible; this keeps that from recurring silently.
 */
const cssPath = fileURLToPath(new URL('../index.css', import.meta.url))
const css = readFileSync(cssPath, 'utf8')

function token(name: string): string {
  const match = css.match(new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{6})`))
  if (!match) throw new Error(`token --color-${name} not found in src/index.css`)
  return match[1]
}

function channel(value: number): number {
  return value <= 0.03928
    ? value / 12.92
    : Math.pow((value + 0.055) / 1.055, 2.4)
}

function luminance(hex: string): number {
  const n = Number.parseInt(hex.slice(1), 16)
  return (
    0.2126 * channel(((n >> 16) & 255) / 255) +
    0.7152 * channel(((n >> 8) & 255) / 255) +
    0.0722 * channel((n & 255) / 255)
  )
}

function contrast(a: string, b: string): number {
  const la = luminance(a)
  const lb = luminance(b)
  const [hi, lo] = la > lb ? [la, lb] : [lb, la]
  return (hi + 0.05) / (lo + 0.05)
}

/** Every token rendered as text, all of it at normal (not large) sizes. */
const TEXT_TOKENS = ['fg', 'body', 'muted', 'dim', 'faint', 'accent'] as const

describe('palette contrast', () => {
  const bg = token('bg')

  it.each(TEXT_TOKENS)('%s meets WCAG AA (4.5:1) against the page background', (name) => {
    expect(contrast(token(name), bg)).toBeGreaterThanOrEqual(4.5)
  })

  it('keeps the emphasis ladder ordered, so hierarchy survives the fix', () => {
    const ladder = ['faint', 'dim', 'muted', 'body', 'fg'] as const
    const ratios = ladder.map((n) => contrast(token(n), bg))
    const ascending = ratios.every((r, i) => i === 0 || r > ratios[i - 1])
    expect(ascending, `ratios were ${ratios.map((r) => r.toFixed(2)).join(' < ')}`).toBe(true)
  })

  it('exposes the head tokens the 3D layer reads via getComputedStyle', () => {
    // HeadStage resolves these by name at runtime; a rename would fail there
    // silently and fall back to a hardcoded default.
    expect(() => token('head-fg')).not.toThrow()
    expect(() => token('head-glow')).not.toThrow()
  })
})
