/**
 * Separates a subject from a studio backdrop in an RGBA pixel buffer.
 *
 * Extracted from the original portrait sampler so the same, hard-won
 * algorithm can be reused by the video bake tool without duplicating it. Two
 * earlier approaches failed before this one, and the reasons matter for
 * anyone tuning the constants below:
 *
 *  - Comparing every pixel to one averaged backdrop colour misreads the dark
 *    end of a vignette or lighting falloff as subject, because a real studio
 *    backdrop is a gradient, not a flat value, and its darkest corner can sit
 *    further from the average than the subject does.
 *
 *  - A flood fill with only local step continuity (compare each pixel to its
 *    already-filled neighbour) follows a gradient of any depth correctly, but
 *    once it crosses a soft edge anywhere it walks straight through the
 *    subject's interior, which is also smooth, and hollows it into an outline.
 *
 * This combines both checks: a pixel is only ever filled if it is both
 * locally continuous with its filled neighbour AND still plausibly
 * backdrop-coloured relative to a fixed reference sampled from a strip of the
 * image known to be backdrop. Local continuity handles the gradient; the
 * global bound is what stops the fill from leaking through a soft edge.
 */

export interface BackgroundSeparationOptions {
  /**
   * Per-step colour tolerance, 0..1, for the local-continuity test between a
   * filled pixel and its neighbour. Raise it if backdrop survives around the
   * subject; lower it if the fill leaks into the subject through a soft edge.
   */
  stepTolerance?: number
  /**
   * How far a pixel may sit from the backdrop reference and still be treated
   * as backdrop at all, 0..1. This is the bound that prevents the fill from
   * hollowing out the subject once it crosses a soft edge.
   */
  backdropBound?: number
  /** Height of the top strip averaged to build the backdrop reference colour. */
  referenceBand?: number
  /**
   * Which borders to seed the fill from. A head-and-shoulders crop should
   * exclude 'bottom': the subject's shoulders or chest usually run off that
   * edge, so seeding there lets the fill climb straight up into clothing.
   */
  seedEdges?: {
    top?: boolean
    bottom?: boolean
    left?: boolean
    right?: boolean
  }
}

/**
 * Returns a `width * height` mask, 1 where a pixel is classified as backdrop,
 * 0 where it is subject. `data` is a flat RGBA buffer, e.g. from
 * `ImageData.data`.
 */
export function separateBackground(
  data: Uint8ClampedArray | Uint8Array,
  width: number,
  height: number,
  {
    stepTolerance = 0.055,
    backdropBound = 0.3,
    referenceBand = 0.05,
    seedEdges = { top: true, bottom: false, left: true, right: true },
  }: BackgroundSeparationOptions = {},
): Uint8Array {
  const at = (x: number, y: number) => (y * width + x) * 4

  const topBand = Math.max(1, Math.round(height * referenceBand))
  let gR = 0
  let gG = 0
  let gB = 0
  let gN = 0
  for (let y = 0; y < topBand; y++) {
    for (let x = 0; x < width; x++) {
      const i = at(x, y)
      gR += data[i]
      gG += data[i + 1]
      gB += data[i + 2]
      gN++
    }
  }
  gR /= gN
  gG /= gN
  gB /= gN

  const isBackground = new Uint8Array(width * height)
  const stack: number[] = []

  const plausiblyBackdrop = (x: number, y: number) => {
    const i = at(x, y)
    const dr = (data[i] - gR) / 255
    const dg = (data[i + 1] - gG) / 255
    const db = (data[i + 2] - gB) / 255
    return Math.sqrt(dr * dr + dg * dg + db * db) < backdropBound
  }

  const push = (x: number, y: number) => {
    const idx = y * width + x
    if (isBackground[idx]) return
    if (!plausiblyBackdrop(x, y)) return
    isBackground[idx] = 1
    stack.push(idx)
  }

  if (seedEdges.top) for (let x = 0; x < width; x++) push(x, 0)
  if (seedEdges.bottom) for (let x = 0; x < width; x++) push(x, height - 1)
  for (let y = 0; y < height; y++) {
    if (seedEdges.left) push(0, y)
    if (seedEdges.right) push(width - 1, y)
  }

  while (stack.length > 0) {
    const idx = stack.pop() as number
    const y = (idx / width) | 0
    const x = idx - y * width
    const i0 = idx * 4

    const visit = (nx: number, ny: number) => {
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) return
      const nIdx = ny * width + nx
      if (isBackground[nIdx]) return
      if (!plausiblyBackdrop(nx, ny)) return
      const i1 = nIdx * 4
      const dr = (data[i0] - data[i1]) / 255
      const dg = (data[i0 + 1] - data[i1 + 1]) / 255
      const db = (data[i0 + 2] - data[i1 + 2]) / 255
      if (Math.sqrt(dr * dr + dg * dg + db * db) > stepTolerance) return
      isBackground[nIdx] = 1
      stack.push(nIdx)
    }

    visit(x - 1, y)
    visit(x + 1, y)
    visit(x, y - 1)
    visit(x, y + 1)
  }

  return isBackground
}

/** Rec. 709 luma, 0..1. */
export function luminance(r: number, g: number, b: number): number {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
}
