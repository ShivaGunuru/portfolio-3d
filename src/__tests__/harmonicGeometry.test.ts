import { describe, expect, it } from 'vitest'

import {
  HARMONIC_A,
  HARMONIC_B,
  MORPH_FIT_STEPS,
  buildHarmonicField,
  buildMorphFitTable,
  harmonicFitScaleAt,
  harmonicRadius,
  sampleMorphFit,
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

/** The widest radius of a single parameter set, on the same grid the fit uses. */
function maxRadius(m: readonly number[]): number {
  let largest = 0
  for (let i = 0; i < 64; i++) {
    for (let j = 0; j < 64; j++) {
      const r = harmonicRadius((i / 64) * Math.PI * 2, (j / 64) * Math.PI, m)
      if (r > largest) largest = r
    }
  }
  return largest
}

describe('per-morph fit', () => {
  it('scales a shape so its widest radius lands on the target', () => {
    const scale = harmonicFitScaleAt(HARMONIC_A, HARMONIC_B, 0, 1.55)
    expect(maxRadius(HARMONIC_A) * scale).toBeCloseTo(1.55, 5)
  })

  it('fits the far endpoint too', () => {
    const scale = harmonicFitScaleAt(HARMONIC_A, HARMONIC_B, 1, 1.55)
    expect(maxRadius(HARMONIC_B) * scale).toBeCloseTo(1.55, 5)
  })

  it('fits both endpoints to the same maximum radius', () => {
    // Guards that buildMorphFitTable builds each endpoint entry per-morph
    // (via harmonicFitScaleAt at that entry's own morph value) rather than
    // sharing one scale across the whole table. With one fit spanning the
    // morph, the sphere end came out at roughly half the linear size of the
    // star end and the object visibly swelled as the page scrolled. This is
    // the only test that exercises the table's endpoints against each other,
    // so an off-by-one in the loop bound or a wrong MORPH_FIT_STEPS would
    // break it.
    const table = buildMorphFitTable(HARMONIC_A, HARMONIC_B)
    const first = maxRadius(HARMONIC_A) * table[0]
    const last = maxRadius(HARMONIC_B) * table[MORPH_FIT_STEPS]
    expect(first).toBeCloseTo(last, 5)
  })

  it('builds a table of positive, finite scales', () => {
    const table = buildMorphFitTable(HARMONIC_A, HARMONIC_B)
    expect(table).toHaveLength(MORPH_FIT_STEPS + 1)
    for (const value of table) {
      expect(Number.isFinite(value)).toBe(true)
      expect(value).toBeGreaterThan(0)
    }
  })

  it('samples the table exactly at its endpoints', () => {
    const table = buildMorphFitTable(HARMONIC_A, HARMONIC_B)
    expect(sampleMorphFit(table, 0)).toBeCloseTo(table[0], 6)
    expect(sampleMorphFit(table, 1)).toBeCloseTo(table[MORPH_FIT_STEPS], 6)
  })

  it('clamps out-of-range morph values instead of reading past the table', () => {
    const table = buildMorphFitTable(HARMONIC_A, HARMONIC_B)
    expect(sampleMorphFit(table, -0.5)).toBeCloseTo(table[0], 6)
    expect(sampleMorphFit(table, 1.5)).toBeCloseTo(table[MORPH_FIT_STEPS], 6)
  })

  it('never samples outside the range the table covers', () => {
    const table = buildMorphFitTable(HARMONIC_A, HARMONIC_B)
    const low = Math.min(...table)
    const high = Math.max(...table)
    for (let i = 0; i <= 100; i++) {
      const value = sampleMorphFit(table, i / 100)
      expect(value).toBeGreaterThanOrEqual(low - 1e-6)
      expect(value).toBeLessThanOrEqual(high + 1e-6)
    }
  })
})
