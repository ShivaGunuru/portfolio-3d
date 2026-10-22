import { describe, expect, it } from 'vitest'

import {
  cameraTransform,
  coverZoom,
  heroPhases,
  isInsideLens,
  pushZoom,
} from '../hero/heroTimeline'

describe('heroPhases', () => {
  it('starts with everything at rest', () => {
    expect(heroPhases(0)).toEqual({ poster: 0, push: 0, titles: 0 })
  })

  it('finishes the poster exactly where the push begins', () => {
    expect(heroPhases(0.55)).toMatchObject({ poster: 1, push: 0 })
  })

  it('completes the push before the pin ends, leaving room for the titles', () => {
    expect(heroPhases(0.9).push).toBe(1)
    expect(heroPhases(0.84).titles).toBe(0)
    expect(heroPhases(1)).toEqual({ poster: 1, push: 1, titles: 1 })
  })

  it('clamps progress outside 0..1', () => {
    expect(heroPhases(-0.5)).toEqual(heroPhases(0))
    expect(heroPhases(1.5)).toEqual(heroPhases(1))
  })
})

describe('push zoom', () => {
  const cover = coverZoom(1440, 900, 24)

  it('starts at 1x', () => {
    expect(pushZoom(0, cover)).toBe(1)
  })

  it('crosses the cover zoom before the push ends, so the cut to ink always happens', () => {
    expect(pushZoom(1, cover)).toBeGreaterThan(cover)
    expect(isInsideLens(pushZoom(0.9, cover), cover)).toBe(false)
    expect(isInsideLens(pushZoom(1, cover), cover)).toBe(true)
  })

  it('needs more zoom to cover a bigger viewport or a smaller lens', () => {
    expect(coverZoom(1920, 1080, 24)).toBeGreaterThan(coverZoom(1440, 900, 24))
    expect(coverZoom(1440, 900, 12)).toBeGreaterThan(coverZoom(1440, 900, 24))
  })
})

describe('cameraTransform', () => {
  const lens = { lensX: 980, lensY: 310, width: 1440, height: 900 }

  it('is the identity before the push starts', () => {
    expect(cameraTransform({ ...lens, zoom: 1, push: 0 })).toEqual({ tx: 0, ty: 0, scale: 1 })
  })

  it('lands the lens on the viewport centre once the push is complete', () => {
    const { tx, ty, scale } = cameraTransform({ ...lens, zoom: 40, push: 1 })
    expect(lens.lensX * scale + tx).toBeCloseTo(lens.width / 2)
    expect(lens.lensY * scale + ty).toBeCloseTo(lens.height / 2)
  })
})
