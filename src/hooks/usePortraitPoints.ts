import { useEffect, useState } from 'react'

import {
  samplePortraitPoints,
  type PortraitOptions,
  type PortraitPointData,
} from '../three/portraitSampler'

export type PortraitStatus = 'loading' | 'ready' | 'unavailable'

/**
 * Loads a portrait photograph and samples it into a point cloud.
 *
 * Failure is a first-class outcome, not an exception: if the file is absent or
 * cannot be decoded, this reports `unavailable` and the caller falls back to
 * the parametric head. That keeps the site working when the photo has not been
 * added yet, which matters because the 3D layer is decorative and must never
 * be able to take the page down with it.
 */
/** Loads one URL, resolving to null rather than rejecting if it fails. */
function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image()
    // Same-origin assets do not need this, but it keeps the canvas untainted
    // if the portrait is ever moved to a CDN.
    image.crossOrigin = 'anonymous'
    image.decoding = 'async'
    image.onload = () => resolve(image)
    image.onerror = () => resolve(null)
    image.src = url
  })
}

export function usePortraitPoints(
  /**
   * One URL, or several tried in order until one loads. Passing a list means
   * saving the photo as .jpg or .png both work, instead of the wrong extension
   * silently falling back to the parametric head with no explanation.
   */
  sources: string | readonly string[] | undefined,
  options: PortraitOptions = {},
) {
  const [data, setData] = useState<PortraitPointData | null>(null)
  const [status, setStatus] = useState<PortraitStatus>(
    sources ? 'loading' : 'unavailable',
  )

  // Serialised so callers can pass inline literals without re-triggering the
  // effect on every render.
  const optionsKey = JSON.stringify(options)
  const sourcesKey = JSON.stringify(
    typeof sources === 'string' ? [sources] : (sources ?? []),
  )

  useEffect(() => {
    const list: string[] = JSON.parse(sourcesKey)
    if (list.length === 0) {
      setData(null)
      setStatus('unavailable')
      return
    }

    let cancelled = false
    setStatus('loading')

    void (async () => {
      for (const url of list) {
        const image = await loadImage(url)
        if (cancelled) return
        if (!image) continue

        try {
          const sampled = samplePortraitPoints(image, JSON.parse(optionsKey))
          if (cancelled) return
          // Sampling down to almost nothing means background rejection ate the
          // subject. Treat that as unusable rather than rendering a near-empty
          // cloud that looks broken.
          if (sampled.count < 500) continue
          setData(sampled)
          setStatus('ready')
          return
        } catch {
          // Try the next candidate.
        }
      }
      if (!cancelled) {
        setData(null)
        setStatus('unavailable')
      }
    })()

    return () => {
      cancelled = true
    }
  }, [sourcesKey, optionsKey])

  return { data, status }
}
