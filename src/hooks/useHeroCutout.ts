import { useEffect, useState } from 'react'

import manifest from '../assets/hero-cutout.json'
// `?url` gives the hashed, cacheable asset URL rather than inlining a
// multi-megabyte sprite sheet into a JS chunk.
import spriteUrl from '../assets/hero-cutout.png?url'

export interface HeroCutoutData {
  image: HTMLImageElement
  frameCount: number
  columns: number
  rows: number
  frameWidth: number
  frameHeight: number
  /** See `bakeHeroCutout`: where the subject's hard bottom edge sits. */
  bottomCutFraction: number
}

export type HeroCutoutStatus = 'loading' | 'ready' | 'unavailable'

// Memoised at module scope, matching every other baked-asset loader in this
// project: a remount (e.g. React StrictMode's dev double-invoke) should not
// re-fetch a multi-megabyte sprite sheet.
let cached: Promise<HeroCutoutData> | null = null

/**
 * Exported so the preloader can start the fetch before React even renders.
 * The memoisation above means the hook then picks up the same promise
 * rather than starting a second download.
 */
export function loadHeroCutout(): Promise<HeroCutoutData> {
  return load()
}

function load(): Promise<HeroCutoutData> {
  if (!cached) {
    cached = new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () =>
        resolve({
          image: img,
          frameCount: manifest.frameCount,
          columns: manifest.columns,
          rows: manifest.rows,
          frameWidth: manifest.frameWidth,
          frameHeight: manifest.frameHeight,
          bottomCutFraction: manifest.bottomCutFraction,
        })
      img.onerror = () => reject(new Error(`useHeroCutout: failed to load ${spriteUrl}`))
      img.src = spriteUrl
    })
  }
  return cached
}

/**
 * Loads the baked Hero cutout sprite sheet.
 *
 * Failure degrades to `unavailable` rather than throwing: the Hero visual is
 * decorative, so losing it must never be able to take the page down with it.
 */
export function useHeroCutout() {
  const [data, setData] = useState<HeroCutoutData | null>(null)
  const [status, setStatus] = useState<HeroCutoutStatus>('loading')

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
