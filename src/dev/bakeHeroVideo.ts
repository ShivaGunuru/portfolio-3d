import { Color } from 'three'

import { luminance, separateBackground } from '../three/backgroundSeparation'

/**
 * Bakes a sequence of video frames into a scroll-scrubbable particle field.
 *
 * This is dev-only tooling, not shipped code, but it is real committed source
 * rather than a throwaway script: run it again with a new frame set any time
 * the hero video changes. See `src/dev/bake.html` for how to run it.
 *
 * The core problem this solves: background separation (see
 * `backgroundSeparation.ts`) is far too slow to run per scroll tick, roughly
 * 175ms per frame measured against this project's actual source video. So
 * every frame is separated once, offline, and packed into a compact
 * per-frame "tone" texture the runtime just samples and interpolates.
 *
 * The harder problem is that point POSITIONS cannot be recomputed per frame:
 * an independently-thinned candidate list from each frame has no
 * correspondence to any other frame's list, so there is nothing to
 * interpolate between. Instead this establishes one FIXED grid of sample
 * positions, evaluated identically across every frame, and takes the union of
 * every position that is ever classified as subject in any frame. A slot the
 * subject never reaches in a given frame just gets tone 0 (invisible) for
 * that frame; nothing about its position changes. Measured on this video:
 * three widely-spaced sample frames already needed 58% more coverage than any
 * single frame alone, because the subject's pose visibly shifts over the
 * clip. A fixed grid from one reference frame would have left real gaps.
 */

export interface BakeConfig {
  /** Frame image URLs, in playback order. */
  frameUrls: string[]
  /** Grid resolution the video is sampled at. Height follows the frame aspect. */
  sampleWidth?: number
  /**
   * World height of the sampled region. Smaller compresses the same point
   * count into a tighter area, raising additive-blend density directly.
   * 3.4 is tuned, not arbitrary: even after fitting world-space to the
   * subject's own bounding box (see the boxAspect comment below), a
   * multi-frame union is inherently more spread than a single static portrait
   * crop, because it has to hold every sampled pose's extent at once. Density
   * only reached the portrait's working range (~5250/sq-unit) at 3.4; 5.6
   * measured 1217, 4.0 measured 2399. Don't raise this without re-checking
   * rendered face brightness, not just point count.
   */
  worldHeight?: number
  /** How far the relief protrudes toward the camera, in world units. */
  depth?: number
  /** Fraction of height kept from the top, 1 = no crop. */
  keepTop?: number
  /** Fraction of the kept height over which the bottom dissolves rather than cutting. */
  fadeBand?: number
  /** Upper bound on the final unified point count. */
  maxPoints?: number
  /** Per-step tolerance for the background flood fill. */
  backgroundTolerance?: number
  /** Global bound on how far a filled pixel may sit from the backdrop reference. */
  backdropBound?: number
  baseColor?: string
  accentColor?: string
  /**
   * Upper bound on the tone texture's width, kept well under any real GPU's
   * MAX_TEXTURE_SIZE (the WebGL-guaranteed floor is 2048; this project's
   * target hardware comfortably exceeds that, but there is no reason to push
   * it). Point counts above this tile into extra rows per frame instead of
   * widening the texture indefinitely.
   */
  textureMaxWidth?: number
  onProgress?: (frameIndex: number, total: number) => void
}

export interface BakedVideoField {
  /** count*3, computed once, identical across every frame. */
  positions: Float32Array
  /** count*3, computed once from each point's mean visible tone. */
  colors: Float32Array
  /** count*3 noise seeds, computed once. */
  randoms: Float32Array
  /**
   * Single-channel, `textureWidth * textureHeight`. 0 means "not part of the
   * subject in this frame"; 1..255 is normalised tone. Row-major, tiled:
   * frame `f`'s data occupies rows `[f * rowsPerFrame, (f+1) * rowsPerFrame)`,
   * and point `i` sits at column `i % textureWidth`, row offset
   * `floor(i / textureWidth)` within that block.
   */
  toneTexture: Uint8Array
  textureWidth: number
  textureHeight: number
  rowsPerFrame: number
  frameCount: number
  count: number
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`bakeHeroVideo: failed to load ${url}`))
    img.src = url
  })
}

export async function bakeHeroVideo({
  frameUrls,
  sampleWidth = 480,
  worldHeight = 3.4,
  depth = 1.3,
  keepTop = 1.0,
  fadeBand = 0.12,
  maxPoints = 42000,
  backgroundTolerance = 0.055,
  backdropBound = 0.3,
  baseColor = '#B9B4E8',
  accentColor = '#E8A33D',
  textureMaxWidth = 4096,
  onProgress,
}: BakeConfig): Promise<BakedVideoField> {
  if (frameUrls.length === 0) throw new Error('bakeHeroVideo: no frames given')

  const first = await loadImage(frameUrls[0])
  const aspect = first.naturalWidth / first.naturalHeight
  const w = Math.max(2, Math.round(sampleWidth))
  const h = Math.max(2, Math.round(w / aspect))

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('bakeHeroVideo: 2D context unavailable')

  const frameCount = frameUrls.length
  // Per frame: is each of the w*h grid pixels background, and its luma.
  // Held for the whole bake, which is why this tool is dev-only -- at
  // 50 frames * 480*270 this is a few tens of MB, unremarkable for a page
  // that exists to run once and be closed, not something to ship at runtime.
  const frameIsBackground: Uint8Array[] = new Array(frameCount)
  const frameLuma: Uint8Array[] = new Array(frameCount)

  for (let f = 0; f < frameCount; f++) {
    const img = f === 0 ? first : await loadImage(frameUrls[f])
    ctx.clearRect(0, 0, w, h)
    ctx.drawImage(img, 0, 0, w, h)
    const { data } = ctx.getImageData(0, 0, w, h)

    const isBg = separateBackground(data, w, h, {
      stepTolerance: backgroundTolerance,
      backdropBound,
      // The subject's shoulders/chest run off the bottom in every frame of
      // this clip, so seeding the bottom edge would let the fill climb into
      // clothing exactly like the original portrait sampler avoided.
      seedEdges: { top: true, bottom: false, left: true, right: true },
    })
    const luma = new Uint8Array(w * h)
    for (let i = 0; i < w * h; i++) {
      luma[i] = Math.round(luminance(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]) * 255)
    }

    frameIsBackground[f] = isBg
    frameLuma[f] = luma
    onProgress?.(f + 1, frameCount)
  }

  // --- union of every pixel that is ever subject --------------------------
  const rowLimit = Math.min(h, Math.round(h * keepTop))
  const fadeRows = Math.max(1, Math.round(h * fadeBand))
  const fadeStart = rowLimit - fadeRows

  interface Slot {
    x: number
    y: number
    u: number
    v: number
    fade: number
    pixelIndex: number
  }
  const slots: Slot[] = []

  for (let y = 0; y < rowLimit; y++) {
    let fade = 1
    if (y > fadeStart) {
      const t = Math.min(1, (y - fadeStart) / fadeRows)
      fade = 1 - t * t * (3 - 2 * t)
    }
    for (let x = 0; x < w; x++) {
      const pixelIndex = y * w + x
      let everSubject = false
      for (let f = 0; f < frameCount; f++) {
        if (!frameIsBackground[f][pixelIndex]) {
          everSubject = true
          break
        }
      }
      if (!everSubject) continue
      // Same dissolve-by-thinning logic as the static sampler: decide once
      // per slot, not per frame, so a slot's presence is stable and only its
      // tone flickers with the video.
      if (fade < 1 && Math.random() > fade) continue
      slots.push({ x, y, u: x / (w - 1), v: y / (h - 1), fade, pixelIndex })
    }
  }

  const stride = Math.max(1, Math.ceil(slots.length / maxPoints))
  const kept: Slot[] = []
  for (let i = 0; i < slots.length; i += stride) kept.push(slots[i])
  const count = kept.length

  // --- depth envelope, fitted to where this video's subject actually sits -
  // Unlike the static portrait's two hand-placed domes (tuned for one 3:4
  // headshot crop), this centres on the union's own mass, so it adapts to
  // whatever the source video's framing turns out to be rather than assuming
  // a composition it might not have.
  let cx = 0
  let cy = 0
  for (const s of kept) {
    cx += s.u
    cy += s.v
  }
  cx /= count
  cy /= count
  let extentX = 0.001
  let extentY = 0.001
  for (const s of kept) {
    extentX = Math.max(extentX, Math.abs(s.u - cx))
    extentY = Math.max(extentY, Math.abs(s.v - cy))
  }

  const depthEnvelope = (u: number, v: number) => {
    const dx = (u - cx) / (extentX * 1.15)
    const dy = (v - cy) / (extentY * 1.15)
    const term = 1 - dx * dx - dy * dy
    return term > 0 ? Math.sqrt(term) : 0
  }

  // --- tight bounding box, for the world-space mapping below ---------------
  // A video frame is wide (this source is 16:9) and the subject occupies only
  // its centre, with blank backdrop either side. Mapping image-space directly
  // onto world-space at the frame's own aspect ratio was the first attempt,
  // and it spread the same point count across roughly six times the area a
  // 3:4 portrait crop needed for a similar subject, which cut additive
  // density -- and with it, brightness -- by about the same factor: measured
  // face brightness topped out around 18 at a point size large enough that
  // the equivalent portrait setup reached 94-120. Point size was not the
  // problem; the coordinate space was. Fitting world-space to the subject's
  // own bounding box, not the frame's, is the fix.
  let minU = 1
  let maxU = 0
  let minV = 1
  let maxV = 0
  for (const s of kept) {
    if (s.u < minU) minU = s.u
    if (s.u > maxU) maxU = s.u
    if (s.v < minV) minV = s.v
    if (s.v > maxV) maxV = s.v
  }
  const subjectMarginU = (maxU - minU) * 0.08
  const subjectMarginV = (maxV - minV) * 0.08
  const boxU0 = Math.max(0, minU - subjectMarginU)
  const boxU1 = Math.min(1, maxU + subjectMarginU)
  const boxV0 = Math.max(0, minV - subjectMarginV)
  const boxV1 = Math.min(1, maxV + subjectMarginV)
  const boxAspect = (boxU1 - boxU0) / (boxV1 - boxV0)

  // --- global tone range, so brightness does not flicker between frames ---
  // A per-frame percentile range would let ordinary lighting shifts between
  // frames masquerade as brightness changes. One range computed across every
  // frame's subject pixels keeps tone meaning the same thing throughout.
  const allVisibleLumas: number[] = []
  for (const s of kept) {
    for (let f = 0; f < frameCount; f++) {
      if (!frameIsBackground[f][s.pixelIndex]) {
        allVisibleLumas.push(frameLuma[f][s.pixelIndex] / 255)
      }
    }
  }
  allVisibleLumas.sort((a, b) => a - b)
  const at5 = allVisibleLumas[Math.floor(allVisibleLumas.length * 0.05)] ?? 0
  const at95 = allVisibleLumas[Math.floor(allVisibleLumas.length * 0.95)] ?? 1
  const lumaSpan = Math.max(0.05, at95 - at5)
  const normalise = (luma: number) => Math.min(1, Math.max(0, (luma - at5) / lumaSpan))

  // --- fixed per-point data, computed once ---------------------------------
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const randoms = new Float32Array(count * 3)

  const base = new Color(baseColor)
  const accent = new Color(accentColor)
  const tmp = new Color()

  // Fit to the subject's own box, at its own aspect, not the frame's.
  const worldWidth = worldHeight * boxAspect

  for (let n = 0; n < count; n++) {
    const s = kept[n]
    const n3 = n * 3

    const jitterU = (Math.random() - 0.5) / w
    const jitterV = (Math.random() - 0.5) / h
    const relief = depthEnvelope(s.u, s.v)

    // Renormalise from the subject's box to 0..1 before mapping to world
    // space, instead of using raw frame-relative u,v.
    const bu = (s.u - boxU0) / (boxU1 - boxU0)
    const bv = (s.v - boxV0) / (boxV1 - boxV0)

    positions[n3] = (bu + jitterU - 0.5) * worldWidth
    positions[n3 + 1] = -(bv + jitterV - 0.5) * worldHeight
    positions[n3 + 2] = relief * depth

    // Colour is fixed per point, from its mean tone across frames where it is
    // visible. Per-frame variation lives entirely in the tone texture; giving
    // colour a second per-frame channel would double the texture for a
    // difference the palette ramp is too coarse to show anyway.
    let sum = 0
    let n_ = 0
    for (let f = 0; f < frameCount; f++) {
      if (!frameIsBackground[f][s.pixelIndex]) {
        sum += normalise(frameLuma[f][s.pixelIndex] / 255)
        n_++
      }
    }
    const meanTone = n_ > 0 ? sum / n_ : 0.5
    tmp.copy(base).lerp(accent, Math.pow(meanTone, 1.35))
    colors[n3] = tmp.r
    colors[n3 + 1] = tmp.g
    colors[n3 + 2] = tmp.b

    randoms[n3] = Math.random() * 2 - 1
    randoms[n3 + 1] = Math.random()
    randoms[n3 + 2] = Math.random() * 2 - 1
  }

  // --- per-frame tone texture, tiled to stay within a safe texture width --
  const textureWidth = Math.min(count, textureMaxWidth)
  const rowsPerFrame = Math.ceil(count / textureWidth)
  const textureHeight = rowsPerFrame * frameCount
  const toneTexture = new Uint8Array(textureWidth * textureHeight)

  for (let n = 0; n < count; n++) {
    const s = kept[n]
    const col = n % textureWidth
    const rowInFrame = Math.floor(n / textureWidth)
    for (let f = 0; f < frameCount; f++) {
      const texRow = f * rowsPerFrame + rowInFrame
      const texel = texRow * textureWidth + col
      if (frameIsBackground[f][s.pixelIndex]) {
        toneTexture[texel] = 0
      } else {
        const t = normalise(frameLuma[f][s.pixelIndex] / 255) * s.fade
        // 0 is reserved for "not subject this frame", so visible tone is
        // floored at 1 to stay distinguishable from it.
        toneTexture[texel] = Math.max(1, Math.round(t * 255))
      }
    }
  }

  return {
    positions,
    colors,
    randoms,
    toneTexture,
    textureWidth,
    textureHeight,
    rowsPerFrame,
    frameCount,
    count,
  }
}
