import { useEffect, useState } from 'react'

import manifest from '../assets/hero-field.json'
// `?url` gives the hashed, cacheable asset URL rather than inlining a 3.2MB
// file into a JS chunk, which is what a plain import would do past Vite's
// inlining threshold anyway, just less predictably.
import heroFieldUrl from '../assets/hero-field.bin?url'

export interface HeroFieldData {
  /** count*3, world positions, fixed across every frame. */
  positions: Float32Array
  /** count*3, fixed per point. */
  colors: Float32Array
  /** count*3 noise seeds, fixed per point. */
  randoms: Float32Array
  /** textureWidth*textureHeight, single channel, tiled one block per frame. */
  toneTexture: Uint8Array
  count: number
  frameCount: number
  textureWidth: number
  textureHeight: number
  rowsPerFrame: number
}

export type HeroFieldStatus = 'loading' | 'ready' | 'unavailable'

/**
 * Slices the four sections back out of the packed binary in the same fixed
 * order `bakeHeroVideo.ts` wrote them: positions, colors, randoms, tone
 * texture. The manifest's byte counts double as the offsets, which is why
 * baking and loading must never drift out of sync on that ordering.
 */
function unpack(buffer: ArrayBuffer): HeroFieldData {
  let offset = 0
  const positions = new Float32Array(buffer, offset, manifest.positionsBytes / 4)
  offset += manifest.positionsBytes
  const colors = new Float32Array(buffer, offset, manifest.colorsBytes / 4)
  offset += manifest.colorsBytes
  const randoms = new Float32Array(buffer, offset, manifest.randomsBytes / 4)
  offset += manifest.randomsBytes
  const toneTexture = new Uint8Array(buffer, offset, manifest.toneTextureBytes)
  offset += manifest.toneTextureBytes

  return {
    positions,
    colors,
    randoms,
    toneTexture,
    count: manifest.count,
    frameCount: manifest.frameCount,
    textureWidth: manifest.textureWidth,
    textureHeight: manifest.textureHeight,
    rowsPerFrame: manifest.rowsPerFrame,
  }
}

// Memoised at module scope. Only Hero uses this asset, but a remount (e.g.
// React StrictMode's dev double-invoke) should not re-fetch 3.2MB.
let cached: Promise<HeroFieldData> | null = null

function load(): Promise<HeroFieldData> {
  if (!cached) {
    cached = fetch(heroFieldUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`useHeroField: ${res.status} fetching ${heroFieldUrl}`)
        return res.arrayBuffer()
      })
      .then(unpack)
  }
  return cached
}

/**
 * Loads the baked Hero video-particle field.
 *
 * Failure degrades to `unavailable` rather than throwing, matching how the
 * portrait loader (and everything else touching the 3D layer) treats a
 * missing or bad asset: the 3D layer is decorative, so losing it must never
 * be able to take the page down with it.
 */
export function useHeroField() {
  const [data, setData] = useState<HeroFieldData | null>(null)
  const [status, setStatus] = useState<HeroFieldStatus>('loading')

  useEffect(() => {
    let cancelled = false
    load()
      .then((d) => {
        if (cancelled) return
        setData(d)
        setStatus('ready')
      })
      .catch(() => {
        if (!cancelled) setStatus('unavailable')
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { data, status }
}
