import { useEffect, useState } from 'react'

import manifest from '../assets/hero-cutout.json'
// `?url` gives the hashed, cacheable asset URL rather than inlining a
// multi-megabyte sprite sheet into a JS chunk.
import spriteUrl from '../assets/hero-cutout.webp?url'

export interface HeroCutoutData {
  /** The whole sheet; drawn from only when per-frame bitmaps are unavailable. */
  image: HTMLImageElement
  /** One decoded bitmap per frame, sliced once at load: see load(). */
  frames: ImageBitmap[] | null
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
      img.onload = async () => {
        // Slice the sheet into one ImageBitmap per frame, once, and keep them.
        // Two failures this avoids, both measured:
        //  - Drawn straight from the <img>, the browser may discard the
        //    sheet's decoded pixels while the Hero is off screen and re-decode
        //    all of it mid-scroll on the way back up.
        //  - Drawn from ONE bitmap of the whole sheet, every frame needs the
        //    entire sheet as a GPU texture. At 96 frames that is ~26
        //    megapixels (~105 MB), more than the GPU image cache keeps, so it
        //    was re-uploaded on every draw: 52 of 64 frames dropped. A frame
        //    bitmap is ~1 MB, so even an evicted one re-uploads in well under
        //    a millisecond.
        // Bitmaps stay decoded while referenced. Falls back to drawing from
        // the sheet where createImageBitmap is unavailable.
        let frames: ImageBitmap[] | null = null
        try {
          frames = await Promise.all(
            Array.from({ length: manifest.frameCount }, (_, i) =>
              createImageBitmap(
                img,
                (i % manifest.columns) * manifest.frameWidth,
                Math.floor(i / manifest.columns) * manifest.frameHeight,
                manifest.frameWidth,
                manifest.frameHeight,
              ),
            ),
          )
        } catch {
          frames = null
        }
        resolve({
          image: img,
          frames,
          frameCount: manifest.frameCount,
          columns: manifest.columns,
          rows: manifest.rows,
          frameWidth: manifest.frameWidth,
          frameHeight: manifest.frameHeight,
          bottomCutFraction: manifest.bottomCutFraction,
        })
      }
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
