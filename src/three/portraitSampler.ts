import { Color } from 'three'

export interface PortraitPointData {
  /** Base positions. Doubles as the `position` attribute for bounds. */
  positions: Float32Array
  /** Per-point rgb, already in linear working space. */
  colors: Float32Array
  /** Per-point noise seeds: x and z in -1..1, y in 0..1. */
  randoms: Float32Array
  count: number
}

export interface PortraitOptions {
  /** Upper bound on points. Fewer is fine; background rejection removes many. */
  maxPoints?: number
  /** Width the image is downsampled to before sampling. Height follows aspect. */
  sampleWidth?: number
  /** World height of the sampled region. Width follows the image aspect. */
  height?: number
  /** How far the relief protrudes toward the camera, in world units. */
  depth?: number
  /**
   * 'palette' recolours the portrait into the site's locked palette by
   * luminance. 'photo' keeps the original pixel colours.
   */
  colorMode?: 'palette' | 'photo'
  /** Shadow end of the palette ramp. */
  baseColor?: string
  /** Highlight end of the palette ramp. */
  accentColor?: string
  /**
   * Fraction of the image height to keep, measured from the top. The source is
   * a head-and-shoulders portrait, so trimming the bottom drops chest and
   * jacket that would otherwise dominate the frame.
   */
  keepTop?: number
  /** How aggressively the flat backdrop is discarded. Higher keeps more. */
  backgroundTolerance?: number
}

/**
 * Depth envelope for a head-and-shoulders portrait.
 *
 * A photograph carries no depth channel, and luminance alone is a poor
 * substitute: it would put the white shirt nearest the camera and push black
 * hair furthest away. Instead the subject is given real volume by two
 * overlapping hemispherical domes, one for the head and a flatter, wider one
 * for the shoulders. Luminance is then layered on top as a small perturbation
 * only, enough to pick out features without inverting the overall form.
 *
 * @param u 0..1 across the image, left to right
 * @param v 0..1 down the image, top to bottom
 */
function depthEnvelope(u: number, v: number): number {
  // Head: centred slightly above the midline, as faces sit in a portrait crop.
  const hx = (u - 0.5) / 0.3
  const hy = (v - 0.42) / 0.36
  const headTerm = 1 - hx * hx - hy * hy
  const head = headTerm > 0 ? Math.sqrt(headTerm) : 0

  // Shoulders: wider, flatter, and lower.
  const sx = (u - 0.5) / 0.62
  const sy = (v - 1.02) / 0.46
  const shoulderTerm = 1 - sx * sx - sy * sy
  const shoulder = shoulderTerm > 0 ? Math.sqrt(shoulderTerm) * 0.42 : 0

  return Math.max(head, shoulder)
}

/** Rec. 709 luma. */
function luminance(r: number, g: number, b: number): number {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
}

/**
 * Turns a portrait photograph into a point cloud that the head shader can
 * render, keeping the subject and discarding the studio backdrop.
 *
 * The image is drawn to an offscreen canvas and read back, so it must be
 * same-origin. Assets served from `public/` always are.
 */
export function samplePortraitPoints(
  image: HTMLImageElement,
  {
    maxPoints = 20000,
    sampleWidth = 220,
    height = 4.6,
    depth = 1.15,
    colorMode = 'palette',
    baseColor = '#B9B4E8',
    accentColor = '#E8A33D',
    keepTop = 0.86,
    backgroundTolerance = 0.16,
  }: PortraitOptions = {},
): PortraitPointData {
  const aspect = image.naturalWidth / image.naturalHeight
  const w = Math.max(2, Math.round(sampleWidth))
  const h = Math.max(2, Math.round(w / aspect))

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  // `willReadFrequently` keeps the surface in software memory, which is what a
  // single large readback wants.
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('portraitSampler: 2D context unavailable')

  ctx.drawImage(image, 0, 0, w, h)
  const { data: px } = ctx.getImageData(0, 0, w, h)

  const at = (x: number, y: number) => (y * w + x) * 4

  // --- background model ------------------------------------------------------
  // A studio backdrop is almost never one flat value: it carries a lighting
  // falloff and often a vignette. Comparing every pixel against a single
  // averaged colour therefore misreads the darkest corner of the backdrop as
  // subject, which shows up as a lopsided point cloud.
  //
  // Instead the backdrop is modelled per row, interpolated between a left and
  // a right reference, which tracks both vertical and horizontal gradients.
  const edge = Math.max(2, Math.round(w * 0.02))

  // A global reference from the top band, where a head-and-shoulders crop is
  // reliably backdrop across the full width. Used to sanity-check each row.
  let gR = 0
  let gG = 0
  let gB = 0
  let gN = 0
  const topBand = Math.max(1, Math.round(h * 0.05))
  for (let y = 0; y < topBand; y++) {
    for (let x = 0; x < w; x++) {
      const i = at(x, y)
      gR += px[i]
      gG += px[i + 1]
      gB += px[i + 2]
      gN++
    }
  }
  gR /= gN
  gG /= gN
  gB /= gN

  // How far a row's own edge may drift from the global reference before it is
  // assumed to be subject (shoulders reaching the frame edge) rather than
  // backdrop.
  const edgeGuard = 0.28

  const avgStrip = (y: number, from: number, to: number) => {
    let r = 0
    let g = 0
    let b = 0
    let n = 0
    for (let x = from; x < to; x++) {
      const i = at(x, y)
      r += px[i]
      g += px[i + 1]
      b += px[i + 2]
      n++
    }
    return n > 0 ? [r / n, g / n, b / n] : [gR, gG, gB]
  }

  const isBackdropLike = (c: number[]) => {
    const dr = (c[0] - gR) / 255
    const dg = (c[1] - gG) / 255
    const db = (c[2] - gB) / 255
    return Math.sqrt(dr * dr + dg * dg + db * db) < edgeGuard
  }

  const rowLimit = Math.min(h, Math.round(h * keepTop))

  // Per-row left/right backdrop references, falling back to the global value
  // whenever the subject reaches that edge.
  const leftRef = new Float32Array(rowLimit * 3)
  const rightRef = new Float32Array(rowLimit * 3)
  for (let y = 0; y < rowLimit; y++) {
    const l = avgStrip(y, 0, edge)
    const r = avgStrip(y, w - edge, w)
    const lc = isBackdropLike(l) ? l : [gR, gG, gB]
    const rc = isBackdropLike(r) ? r : [gR, gG, gB]
    leftRef[y * 3] = lc[0]
    leftRef[y * 3 + 1] = lc[1]
    leftRef[y * 3 + 2] = lc[2]
    rightRef[y * 3] = rc[0]
    rightRef[y * 3 + 1] = rc[1]
    rightRef[y * 3 + 2] = rc[2]
  }

  // Collect candidates first, then thin them down to maxPoints. Thinning by a
  // stride afterwards keeps the distribution even; rejecting during the walk
  // would bias toward whichever region was scanned first.
  const candidates: Array<{ u: number; v: number; i: number }> = []

  for (let y = 0; y < rowLimit; y++) {
    for (let x = 0; x < w; x++) {
      const i = at(x, y)
      const a = px[i + 3]
      if (a < 8) continue

      // Backdrop reference for this exact pixel, interpolated across the row.
      const t = x / (w - 1)
      const rr = leftRef[y * 3] + (rightRef[y * 3] - leftRef[y * 3]) * t
      const rg =
        leftRef[y * 3 + 1] + (rightRef[y * 3 + 1] - leftRef[y * 3 + 1]) * t
      const rb =
        leftRef[y * 3 + 2] + (rightRef[y * 3 + 2] - leftRef[y * 3 + 2]) * t

      const dr = (px[i] - rr) / 255
      const dg = (px[i + 1] - rg) / 255
      const db = (px[i + 2] - rb) / 255
      const distance = Math.sqrt(dr * dr + dg * dg + db * db)
      if (distance < backgroundTolerance) continue

      candidates.push({ u: x / (w - 1), v: y / (h - 1), i })
    }
  }

  const stride = Math.max(1, Math.ceil(candidates.length / maxPoints))
  const count = Math.floor(candidates.length / stride)

  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const randoms = new Float32Array(count * 3)

  // Colour converts hex (sRGB) into three's linear working space, matching how
  // the parametric sampler feeds the same shader.
  const base = new Color(baseColor)
  const accent = new Color(accentColor)
  const tmp = new Color()

  const worldHeight = height
  const worldWidth = height * aspect
  // Sampling stops partway down the image, so recentre on what is kept rather
  // than on the full frame.
  const vCentre = keepTop / 2

  for (let n = 0; n < count; n++) {
    const { u, v, i } = candidates[n * stride]
    const n3 = n * 3

    const r = px[i]
    const g = px[i + 1]
    const b = px[i + 2]
    const luma = luminance(r, g, b)

    // Jitter breaks up the source pixel grid, which would otherwise read as
    // visible scanlines once the points are drawn as discs.
    const jitterU = (Math.random() - 0.5) / w
    const jitterV = (Math.random() - 0.5) / h

    const relief = depthEnvelope(u, v)
    // Luminance contributes only a small amount of surface detail on top of
    // the envelope, so bright clothing cannot outrank the face.
    const detail = (luma - 0.5) * 0.16

    positions[n3] = (u + jitterU - 0.5) * worldWidth
    positions[n3 + 1] = -(v + jitterV - vCentre) * worldHeight
    positions[n3 + 2] = relief * depth + detail

    if (colorMode === 'photo') {
      tmp.setRGB(r / 255, g / 255, b / 255)
    } else {
      // Luminance drives a ramp between the two palette tokens, so the
      // portrait keeps the site's locked colour identity.
      tmp.copy(base).lerp(accent, Math.pow(luma, 1.35))
    }
    colors[n3] = tmp.r
    colors[n3 + 1] = tmp.g
    colors[n3 + 2] = tmp.b

    randoms[n3] = Math.random() * 2 - 1
    randoms[n3 + 1] = Math.random()
    randoms[n3 + 2] = Math.random() * 2 - 1
  }

  return { positions, colors, randoms, count }
}
