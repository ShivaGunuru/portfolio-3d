import { Color } from 'three'

export interface HarmonicPointData {
  /** Spherical seeds: theta, phi, and a per-point random in 0..1. */
  seeds: Float32Array
  /** Per-point rgb, already in linear working space. */
  colors: Float32Array
  /** Extra noise seeds: x and z in -1..1, y in 0..1. */
  randoms: Float32Array
  count: number
}

/**
 * The two spherical-harmonic parameter sets the field morphs between.
 *
 * Each is eight exponents driving the classic
 * `r = sin(m0 phi)^m1 + cos(m2 phi)^m3 + sin(m4 theta)^m5 + cos(m6 theta)^m7`.
 * Small integer changes swing the form wildly, which is the point: the whole
 * shape is four numbers per axis, and scroll interpolates between two sets of
 * them rather than playing back a baked animation.
 *
 * These particular values were chosen by rendering candidates and comparing
 * them, not picked off a list. The first is open and lobed so it reads as a
 * form rather than a ball; the second is denser and more folded, so the morph
 * has somewhere to travel.
 */
export const HARMONIC_A = [2, 6, 3, 6, 5, 6, 2, 6] as const
export const HARMONIC_B = [8, 6, 2, 3, 4, 6, 1, 1] as const

/**
 * The exponents matter more than the frequencies.
 *
 * Values near 1 make every term a broad lobe, and the four terms sum into
 * something close to a sphere: the first pass at this rendered as a fuzzy ball
 * filling the whole frame. High exponents push `pow(abs(sin(x)), m)` toward
 * zero everywhere except near the peaks, which is what carves the surface into
 * distinct lobes and hollows. A is compact and crystalline, B is elongated
 * with radiating arms, so the morph between them is a genuine reorganisation
 * rather than a wobble.
 *
 * Both were chosen by rendering candidates and comparing frame coverage and
 * structure, not taken from a list.
 */

/** Evaluates the same radius the shader does, for fitting and inspection. */
export function harmonicRadius(
  theta: number,
  phi: number,
  m: readonly number[],
): number {
  const term = (base: number, exponent: number) =>
    Math.pow(Math.abs(base), Math.max(exponent, 0.05))
  return Math.max(
    0.12,
    term(Math.sin(m[0] * phi), m[1]) +
      term(Math.cos(m[2] * phi), m[3]) +
      term(Math.sin(m[4] * theta), m[5]) +
      term(Math.cos(m[6] * theta), m[7]),
  )
}

/**
 * World scale that fits the form to `target` units at its widest.
 *
 * Sampled across the morph, not just at the endpoints: interpolating the
 * exponents can push the surface wider midway than at either end, and a fixed
 * scale picked from the endpoints alone would let it overflow the frame
 * halfway through the scroll.
 */
export function harmonicFitScale(
  a: readonly number[],
  b: readonly number[],
  target = 1.55,
  steps = 5,
): number {
  let largest = 0
  for (let s = 0; s <= steps; s++) {
    const t = s / steps
    const m = a.map((value, i) => value + (b[i] - value) * t)
    for (let i = 0; i < 64; i++) {
      for (let j = 0; j < 64; j++) {
        const r = harmonicRadius(
          (i / 64) * Math.PI * 2,
          (j / 64) * Math.PI,
          m,
        )
        if (r > largest) largest = r
      }
    }
  }
  return target / largest
}

/**
 * Distributes points over a sphere with a Fibonacci lattice.
 *
 * Uniform random spherical coordinates bunch at the poles, which shows up as
 * two bright knots once the harmonic stretches the surface. The golden-angle
 * lattice spaces points evenly, so density stays even wherever the form goes.
 *
 * Only the seeds are computed here. Every actual position is derived in the
 * vertex shader from these angles and the current morph, so no buffer is ever
 * rewritten as the shape changes.
 */
export function buildHarmonicField(
  count: number,
  baseColor: string,
  accentColor: string,
  accentRatio = 0.14,
): HarmonicPointData {
  const seeds = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const randoms = new Float32Array(count * 3)

  const base = new Color(baseColor)
  const accent = new Color(accentColor)
  const tmp = new Color()

  const golden = Math.PI * (3 - Math.sqrt(5))

  for (let i = 0; i < count; i++) {
    const i3 = i * 3

    // Even in cos(phi) gives equal area per band.
    const y = 1 - (i / (count - 1)) * 2
    const phi = Math.acos(Math.min(1, Math.max(-1, y)))
    const theta = (golden * i) % (Math.PI * 2)

    seeds[i3] = theta
    seeds[i3 + 1] = phi
    seeds[i3 + 2] = Math.random()

    // Accent points are scattered rather than banded, so the highlight reads
    // as sparkle through the volume instead of a stripe across it.
    const isAccent = Math.random() < accentRatio
    tmp.copy(isAccent ? accent : base)
    colors[i3] = tmp.r
    colors[i3 + 1] = tmp.g
    colors[i3 + 2] = tmp.b

    randoms[i3] = Math.random() * 2 - 1
    randoms[i3 + 1] = Math.random()
    randoms[i3 + 2] = Math.random() * 2 - 1
  }

  return { seeds, colors, randoms, count }
}
