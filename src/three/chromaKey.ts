/**
 * Green-screen keyer: turns a green-backdrop RGBA frame into a soft alpha
 * matte, and removes the green spill the backdrop casts onto the subject.
 *
 * This is a separate path from `backgroundSeparation.ts`, not a replacement
 * for it. That module solves a harder problem, pulling a subject off an
 * ordinary studio backdrop whose colour overlaps the subject's own, and it
 * needs a flood fill, a backdrop reference and several guards to do it. None
 * of that is necessary here: a key green backdrop is a colour nothing on a
 * person is, so a per-pixel test is enough.
 *
 * Two properties follow from that and both matter:
 *
 *  - **No reference, so no drift.** Every frame is keyed by the same fixed
 *    function of its own pixels, with nothing averaged or sampled from the
 *    footage. A frame's exposure can wander without moving the threshold, so
 *    there is no mechanism by which the matte can flicker between frames.
 *    The flood-fill path had to average one backdrop reference across the
 *    whole clip to get the same guarantee.
 *
 *  - **Alpha is continuous, not a blurred binary mask.** Greenness falls off
 *    smoothly across an antialiased edge, so ramping alpha across that
 *    falloff reconstructs the true soft edge instead of approximating it by
 *    eroding and blurring a hard mask, which is what the flood-fill path has
 *    to do.
 *
 * Measured on this project's green clip: backdrop greenness 0.992, every
 * sampled subject region at or below 0.04 (white shirt -0.02, jacket -0.016,
 * hair -0.075, skin -0.141, beard -0.192), with almost no pixel mass in
 * between. The defaults below sit inside that gap with a wide margin at both
 * ends.
 */

export interface ChromaKeyOptions {
  /**
   * Greenness at or below which a pixel is fully subject (alpha 1). Set above
   * the greenest thing on the subject, with margin.
   */
  keyLow?: number
  /**
   * Greenness at or above which a pixel is fully backdrop (alpha 0). Set below
   * the backdrop's own greenness, with margin. Pixels between the two ramp
   * smoothly, which is where soft edges come from.
   */
  keyHigh?: number
  /**
   * How completely to neutralise green spill on surviving pixels, 0..1. Green
   * bounces off a backdrop this saturated onto hair and shoulders, and once
   * the backdrop is gone that tint has nothing to justify it and reads as a
   * green rim. 1 clamps green fully to the next-highest channel.
   */
  despill?: number
}

/**
 * Greenness: how far green leads the strongest of the other two channels,
 * normalised to 0..1. Negative for anything that is not green-dominant.
 *
 * Deliberately compares against `max(r, b)` rather than against the average
 * or against each channel separately: a pixel only reads as key green when
 * green beats *both* others, which is exactly what distinguishes backdrop
 * from a yellowish skin tone (red high, green mid) or a cyan-ish highlight
 * (blue high, green mid).
 */
export function greenness(r: number, g: number, b: number): number {
  return (g - Math.max(r, b)) / 255
}

export interface ChromaKeyResult {
  /** `width * height`, 0 = backdrop, 1 = subject, fractional across an edge. */
  alpha: Float32Array
}

/**
 * Keys `data` in place: despills every pixel that survives, and returns the
 * matte. `data` is a flat RGBA buffer, e.g. from `ImageData.data`.
 */
export function chromaKey(
  data: Uint8ClampedArray | Uint8Array,
  width: number,
  height: number,
  { keyLow = 0.08, keyHigh = 0.32, despill = 1 }: ChromaKeyOptions = {},
): ChromaKeyResult {
  const count = width * height
  const alpha = new Float32Array(count)
  const span = Math.max(1e-6, keyHigh - keyLow)

  for (let i = 0; i < count; i++) {
    const p = i * 4
    const r = data[p]
    const g = data[p + 1]
    const b = data[p + 2]

    const gn = greenness(r, g, b)

    let a: number
    if (gn <= keyLow) a = 1
    else if (gn >= keyHigh) a = 0
    else {
      // Smoothstep rather than a straight ramp: it flattens out at both ends,
      // so the matte does not show a visible crease where the ramp meets
      // fully-opaque or fully-clear.
      const t = (gn - keyLow) / span
      a = 1 - t * t * (3 - 2 * t)
    }
    alpha[i] = a

    if (a > 0 && despill > 0) {
      const limit = Math.max(r, b)
      if (g > limit) data[p + 1] = g + (limit - g) * despill
    }
  }

  return { alpha }
}
