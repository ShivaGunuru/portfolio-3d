import { describe, expect, it } from 'vitest'

import {
  HARMONIC_A,
  HARMONIC_B,
  buildHarmonicField,
} from '../three/harmonicGeometry'

describe('harmonic parameter sets', () => {
  it('keeps every exponent in the range that produces a closed silhouette', () => {
    // The exponents are the odd indices. The previous sets used 6 almost
    // throughout, which carves lobes so hard that equal-area sphere sampling
    // stretches them into thin radiating sprays: a firework, not an object.
    for (const set of [HARMONIC_A, HARMONIC_B]) {
      for (const index of [1, 3, 5, 7]) {
        expect(set[index]).toBeLessThanOrEqual(4)
        expect(set[index]).toBeGreaterThanOrEqual(2)
      }
    }
  })

  it('has eight numbers in each set', () => {
    expect(HARMONIC_A).toHaveLength(8)
    expect(HARMONIC_B).toHaveLength(8)
  })
})

describe('buildHarmonicField', () => {
  it('gives every point the same colour', () => {
    // The field used to recolour 14% of points to the accent, which read as
    // sparkle on a near-black page and as dirt on a white one. A single
    // colour across the whole buffer is the guard against that returning.
    const { colors, count } = buildHarmonicField(2000, '#1a1a1a')
    const [r, g, b] = [colors[0], colors[1], colors[2]]
    for (let i = 0; i < count; i++) {
      expect(colors[i * 3]).toBe(r)
      expect(colors[i * 3 + 1]).toBe(g)
      expect(colors[i * 3 + 2]).toBe(b)
    }
  })

  it('fills every buffer to the requested count', () => {
    const data = buildHarmonicField(500, '#1a1a1a')
    expect(data.count).toBe(500)
    expect(data.seeds).toHaveLength(1500)
    expect(data.colors).toHaveLength(1500)
    expect(data.randoms).toHaveLength(1500)
  })
})
