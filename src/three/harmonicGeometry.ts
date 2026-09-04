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
 * Each is eight numbers driving the classic
 * `r = sin(m0 phi)^m1 + cos(m2 phi)^m3 + sin(m4 theta)^m5 + cos(m6 theta)^m7`,
 * where the even indices are frequencies and the odd ones are exponents.
 *
 * A is a sphere and B is a four-pointed star, so scroll reads as a system
 * resolving out of an undifferentiated ball into structure. Rendered at morph
 * 0, 0.25, 0.5, 0.75 and 1, the sequence runs sphere, rounded cube,
 * four-petal, cross, star, and every step in it has a closed silhouette.
 *
 * The exponents are the load-bearing part, and they are deliberately low.
 * An earlier pair used 6 almost throughout on the theory that high exponents
 * carve distinct lobes, which they do. What that missed is what happens when
 * hard lobes meet equal-area sphere sampling: the lobes stretch into thin
 * radiating sprays of scattered points, and the result reads as a firework
 * rather than an object. That is most of why this field looked amateurish.
 * Values in the 2 to 4 range keep the surface closed and legible.
 */
export const HARMONIC_A = [2, 2, 2, 2, 2, 2, 2, 2] as const
export const HARMONIC_B = [2, 4, 3, 4, 2, 4, 3, 4] as const

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
 * Fits the single shape the morph is showing at `morph`, rather than the whole
 * range between two sets.
 *
 * `harmonicFitScale` exists for the two-set case and walks five steps between
 * them. Handed the same set twice, which is what a per-morph fit would have to
 * do, all five steps evaluate identical parameters and it performs six
 * redundant scans of the same shape. This does the interpolation once and
 * scans once, at the same 64x64 angular resolution, so it is roughly six times
 * cheaper with no loss of accuracy.
 */
export function harmonicFitScaleAt(
  a: readonly number[],
  b: readonly number[],
  morph: number,
  target = 1.55,
): number {
  // The same easing the vertex shader applies, so the fit describes the shape
  // that is actually on screen rather than one the shader never draws.
  const eased = morph * morph * (3 - 2 * morph)
  const m = a.map((value, i) => value + (b[i] - value) * eased)

  let largest = 0
  for (let i = 0; i < 64; i++) {
    for (let j = 0; j < 64; j++) {
      const r = harmonicRadius((i / 64) * Math.PI * 2, (j / 64) * Math.PI, m)
      if (r > largest) largest = r
    }
  }
  return target / largest
}

/** Table resolution. 16 steps means 17 entries, morph 0 through 1 inclusive. */
export const MORPH_FIT_STEPS = 16

/**
 * Precomputes the fit scale across the morph.
 *
 * A single scale spanning the whole morph makes an endpoint with a smaller
 * radius render smaller, so the form swells as it reorganises instead of
 * simply changing shape. Fitting per frame is not an option either: one fit
 * measured 2.37ms, against a 16.7ms frame budget. Building the table costs
 * about 7ms once, on a chunk that is already deferred until the browser is
 * idle, and each frame then interpolates between two numbers.
 */
export function buildMorphFitTable(
  a: readonly number[],
  b: readonly number[],
  target = 1.55,
): Float32Array {
  const table = new Float32Array(MORPH_FIT_STEPS + 1)
  for (let i = 0; i <= MORPH_FIT_STEPS; i++) {
    table[i] = harmonicFitScaleAt(a, b, i / MORPH_FIT_STEPS, target)
  }
  return table
}

/** Reads a table from `buildMorphFitTable`, interpolating between entries. */
export function sampleMorphFit(table: Float32Array, morph: number): number {
  const clamped = Math.min(1, Math.max(0, morph))
  const position = clamped * MORPH_FIT_STEPS
  const index = Math.min(MORPH_FIT_STEPS - 1, Math.floor(position))
  const fraction = position - index
  return table[index] + (table[index + 1] - table[index]) * fraction
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
): HarmonicPointData {
  const seeds = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const randoms = new Float32Array(count * 3)

  // One colour for the whole field. An earlier revision scattered accent
  // points through the volume at a 14% ratio so the highlight would "read as
  // sparkle through the volume". That held while the page was near-black. On
  // white, randomly placed coloured specks read as dirt: scanner dust, or
  // compression artifacts. Emphasis is now entirely the cursor's job, which
  // is the difference between a highlight that means something and one that
  // is just noise.
  const base = new Color(baseColor)

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

    colors[i3] = base.r
    colors[i3 + 1] = base.g
    colors[i3 + 2] = base.b

    randoms[i3] = Math.random() * 2 - 1
    randoms[i3 + 1] = Math.random()
    randoms[i3 + 2] = Math.random() * 2 - 1
  }

  return { seeds, colors, randoms, count }
}
