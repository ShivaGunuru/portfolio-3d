import { useEffect, useState } from 'react'

import desktopManifest from '../assets/hero-cutout.json'
import phoneManifest from '../assets/hero-cutout-phone.json'
// `?url` gives the hashed, cacheable asset URL rather than inlining a
// multi-megabyte sprite sheet into a JS chunk.
import desktopSpriteUrl from '../assets/hero-cutout.webp?url'
import phoneSpriteUrl from '../assets/hero-cutout-phone.webp?url'
import { PHONE_QUERY } from './useIsCompact'

export interface HeroCutoutData {
  /** The whole sheet; set only when per-frame bitmaps are unavailable. */
  image: HTMLImageElement | null
  /** One decoded bitmap per frame, sliced once at load: see sliceFrames(). */
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

/**
 * Slices the sheet into one ImageBitmap per frame, once, and keeps them.
 *
 * Two failures this avoids, both measured:
 *  - Drawn straight from an <img>, the browser may discard the sheet's decoded
 *    pixels while the Hero is off screen and re-decode all of it mid-scroll on
 *    the way back up.
 *  - Drawn from ONE bitmap of the whole sheet, every frame needs the entire
 *    sheet as a GPU texture. At 96 frames that is ~26 megapixels (~105 MB),
 *    more than the GPU image cache keeps, so it was re-uploaded on every draw:
 *    52 of 64 frames dropped. A frame bitmap is ~1 MB, so even an evicted one
 *    re-uploads in well under a millisecond.
 *
 * Decode ONCE, from the blob, and crop from the decoded sheet. Never crop from
 * an <img>: createImageBitmap with an image element and a crop decodes the whole image again
 * on the main thread for every call, which froze the page for 75s on desktop
 * and 20s on a phone-sized screen, long enough that the preloader's own 6s cap
 * could not fire. From a blob the decode happens off the main thread, and one
 * crop per await keeps the page responsive between them.
 */
async function sliceFrames(blob: Blob, manifest: typeof desktopManifest): Promise<ImageBitmap[]> {
  const sheet = await createImageBitmap(blob)
  const frames: ImageBitmap[] = []
  for (let i = 0; i < manifest.frameCount; i++) {
    frames.push(
      await createImageBitmap(
        sheet,
        (i % manifest.columns) * manifest.frameWidth,
        Math.floor(i / manifest.columns) * manifest.frameHeight,
        manifest.frameWidth,
        manifest.frameHeight,
      ),
    )
  }
  sheet.close()
  return frames
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`useHeroCutout: failed to load ${url}`))
    img.src = url
  })
}

function load(): Promise<HeroCutoutData> {
  if (!cached) {
    // Half the frames on phones, for memory: see src/dev/make-phone-sprite.py.
    // The frame size is the same, so the reserved box does not depend on this.
    const phone = window.matchMedia(PHONE_QUERY).matches
    const manifest = phone ? phoneManifest : desktopManifest
    const spriteUrl = phone ? phoneSpriteUrl : desktopSpriteUrl
    cached = (async () => {
      const response = await fetch(spriteUrl)
      if (!response.ok) throw new Error(`useHeroCutout: failed to load ${spriteUrl}`)
      const blob = await response.blob()

      let frames: ImageBitmap[] | null = null
      let image: HTMLImageElement | null = null
      try {
        frames = await sliceFrames(blob, manifest)
      } catch {
        // No usable createImageBitmap: draw crops from the sheet instead.
        image = await loadImage(URL.createObjectURL(blob))
      }

      return {
        image,
        frames,
        frameCount: manifest.frameCount,
        columns: manifest.columns,
        rows: manifest.rows,
        frameWidth: manifest.frameWidth,
        frameHeight: manifest.frameHeight,
        bottomCutFraction: manifest.bottomCutFraction,
      }
    })()
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
