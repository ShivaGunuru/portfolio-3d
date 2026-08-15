import { Color } from 'three'

export interface PortraitPointData {
  /** Base positions. Doubles as the `position` attribute for bounds. */
  positions: Float32Array
  /** Per-point rgb, already in linear working space. */
  colors: Float32Array
  /** Per-point noise seeds: x and z in -1..1, y in 0..1. */
  randoms: Float32Array
  /**
   * Per-point tone, 0..1, normalised across the subject only.
   *
   * This is what makes the cloud read as a face rather than an evenly lit
   * blob. Absolute luminance is useless here: a subject can be darker than
   * its own backdrop overall, so the range that matters is the one inside the
   * subject, from hair and jacket at the bottom to skin and shirt at the top.
   * The shader drives point size and opacity from it, so tonal structure
   * survives into the render instead of every point being equally present.
   */
  lumas: Float32Array
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
  /**
   * Per-step colour tolerance for the background flood fill, 0..1. Raise it if
   * backdrop survives around the subject; lower it if the fill leaks into the
   * subject through a soft edge.
   */
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
    // A face needs more points than an abstract form to stay legible: features
    // are carried by fine tonal detail rather than by silhouette alone.
    maxPoints = 34000,
    sampleWidth = 430,
    height = 5.1,
    depth = 1.15,
    colorMode = 'palette',
    baseColor = '#B9B4E8',
    accentColor = '#E8A33D',
    // Cropped to head and upper shoulders. A full head-and-chest crop spends
    // close to half its points on jacket, which carries almost no recognition
    // while diluting the density available for the face.
    keepTop = 0.7,
    backgroundTolerance = 0.055,
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

  // --- background separation -------------------------------------------------
  // A studio backdrop is almost never one flat value: it carries a lighting
  // falloff and usually a vignette. Comparing each pixel against a reference
  // colour, however carefully that reference is modelled, keeps failing at the
  // extremes of the gradient, because the darkest corner of the backdrop can
  // sit further from the reference than the subject does.
  //
  // A flood fill inward from the border sidesteps that entirely. It never
  // compares a pixel to a global value, only to its immediate neighbour, so it
  // walks a smooth gradient of any depth and stops where the image changes
  // abruptly, which is exactly where the subject begins.
  const topBand = Math.max(1, Math.round(h * 0.05))
  let gR = 0
  let gG = 0
  let gB = 0
  let gN = 0
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

  const isBackground = new Uint8Array(w * h)
  const stack: number[] = []

  /**
   * How far a pixel may sit from the backdrop reference and still be treated
   * as backdrop at all.
   *
   * This bound is what keeps the flood fill honest. Local continuity alone is
   * not enough: subject interiors are smooth, so once the fill crosses a soft
   * edge anywhere it walks straight through the face and hollows the subject
   * out, leaving only an outline. Requiring every filled pixel to also remain
   * plausibly backdrop-coloured means a soft edge can leak at most a pixel or
   * two before the fill runs into tones no backdrop has.
   */
  const backdropBound = 0.30

  const plausiblyBackdrop = (x: number, y: number) => {
    const i = at(x, y)
    const dr = (px[i] - gR) / 255
    const dg = (px[i + 1] - gG) / 255
    const db = (px[i + 2] - gB) / 255
    return Math.sqrt(dr * dr + dg * dg + db * db) < backdropBound
  }

  const push = (x: number, y: number) => {
    const idx = y * w + x
    if (isBackground[idx]) return
    if (!plausiblyBackdrop(x, y)) return
    isBackground[idx] = 1
    stack.push(idx)
  }

  // Seeded from the top and sides only. The subject's shoulders run off the
  // bottom of a head-and-shoulders crop, so seeding there would let the fill
  // climb straight up into the jacket.
  for (let x = 0; x < w; x++) push(x, 0)
  for (let y = 0; y < h; y++) {
    push(0, y)
    push(w - 1, y)
  }

  // Per-step tolerance. Small, because a backdrop gradient changes only
  // slightly between adjacent pixels while a subject edge changes sharply.
  const step = backgroundTolerance

  while (stack.length > 0) {
    const idx = stack.pop() as number
    const y = (idx / w) | 0
    const x = idx - y * w
    const i0 = idx * 4

    const visit = (nx: number, ny: number) => {
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) return
      const nIdx = ny * w + nx
      if (isBackground[nIdx]) return
      if (!plausiblyBackdrop(nx, ny)) return
      const i1 = nIdx * 4
      const dr = (px[i0] - px[i1]) / 255
      const dg = (px[i0 + 1] - px[i1 + 1]) / 255
      const db = (px[i0 + 2] - px[i1 + 2]) / 255
      if (Math.sqrt(dr * dr + dg * dg + db * db) > step) return
      isBackground[nIdx] = 1
      stack.push(nIdx)
    }

    visit(x - 1, y)
    visit(x + 1, y)
    visit(x, y - 1)
    visit(x, y + 1)
  }

  const rowLimit = Math.min(h, Math.round(h * keepTop))

  // Collect candidates first, then thin them down to maxPoints. Thinning by a
  // stride afterwards keeps the distribution even; rejecting during the walk
  // would bias toward whichever region was scanned first.
  const candidates: Array<{ u: number; v: number; i: number; luma: number }> = []

  for (let y = 0; y < rowLimit; y++) {
    for (let x = 0; x < w; x++) {
      const i = at(x, y)
      const a = px[i + 3]
      if (a < 8) continue
      if (isBackground[y * w + x]) continue

      candidates.push({
        u: x / (w - 1),
        v: y / (h - 1),
        i,
        luma: luminance(px[i], px[i + 1], px[i + 2]),
      })
    }
  }

  // Tone range of the subject alone. Percentiles rather than min and max, so a
  // single specular highlight or one crushed shadow cannot flatten everything
  // else into the middle of the range.
  const sortedLuma = candidates.map((c) => c.luma).sort((a, b) => a - b)
  const at5 = sortedLuma[Math.floor(sortedLuma.length * 0.05)] ?? 0
  const at95 = sortedLuma[Math.floor(sortedLuma.length * 0.95)] ?? 1
  const lumaSpan = Math.max(0.05, at95 - at5)

  const stride = Math.max(1, Math.ceil(candidates.length / maxPoints))
  const count = Math.floor(candidates.length / stride)

  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const randoms = new Float32Array(count * 3)
  const lumas = new Float32Array(count)

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
    // Normalised across the subject's own range, not absolute.
    const luma = Math.min(1, Math.max(0, (candidates[n * stride].luma - at5) / lumaSpan))

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

    lumas[n] = luma

    randoms[n3] = Math.random() * 2 - 1
    randoms[n3 + 1] = Math.random()
    randoms[n3 + 2] = Math.random() * 2 - 1
  }

  return { positions, colors, randoms, lumas, count }
}
