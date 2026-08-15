import { Color } from 'three'

/**
 * Parametric stand-in for a head volume, ported from
 * docs/direction/project/head-stage.js.
 *
 * A sphere is squashed front-to-back, tapered at the crown, and then has three
 * Gaussian bumps added along +z for the nose, chin and brow. A real scan mesh
 * would drop in here later; the sampling below does not care where the points
 * come from.
 *
 * @param u azimuth, 0..2PI
 * @param v polar angle, 0..PI
 */
export function headSurface(u: number, v: number): [number, number, number] {
  const sv = Math.sin(v)
  const cv = Math.cos(v)

  let r = 1
  if (cv < 0) r *= 1 - 0.42 * Math.pow(-cv, 1.7)
  if (cv > 0.75) r *= 1 - 0.12 * (cv - 0.75)

  const y = cv * 1.24
  const x = sv * Math.cos(u) * 0.9 * r
  let z = sv * Math.sin(u) * 1.0 * r

  // Angle relative to "facing forward", wrapped to -PI..PI.
  let au = u - Math.PI / 2
  while (au > Math.PI) au -= 2 * Math.PI
  while (au < -Math.PI) au += 2 * Math.PI

  const gauss = (a: number, spread: number) => Math.exp(-(a * a) / spread)

  z += 0.22 * gauss(au, 0.1) * gauss(y - 0.02, 0.02) // nose
  z += 0.14 * gauss(au, 0.6) * gauss(y + 0.72, 0.05) // chin
  z += 0.05 * gauss(au, 0.35) * gauss(y - 0.42, 0.02) // brow

  return [x, y, z]
}

export interface HeadPointData {
  /** Base positions. Doubles as the `position` attribute for bounds. */
  positions: Float32Array
  /** Per-point rgb, already in linear working space. */
  colors: Float32Array
  /** Per-point noise seeds: x and z in -1..1, y in 0..1. */
  randoms: Float32Array
  /**
   * Per-point tone, matching the portrait sampler's attribute so both share
   * one shader. The parametric head has no photographic tone of its own, so
   * this carries a gentle depth cue instead: points nearer the viewer read
   * slightly brighter, which gives the volume some form.
   */
  lumas: Float32Array
  count: number
}

/**
 * Samples the surface into flat typed arrays ready for BufferAttributes.
 *
 * Points are distributed by area rather than by even parameter steps: `v` uses
 * acos(1 - 2r) so the poles do not bunch up. A small inward shrink gives the
 * cloud some volume instead of a hollow shell.
 */
export function sampleHeadPoints(
  count: number,
  baseColor: string,
  accentColor: string,
  /** Fraction of points that take the accent colour. */
  accentRatio = 0.12,
): HeadPointData {
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const randoms = new Float32Array(count * 3)
  const lumas = new Float32Array(count)

  // Color converts hex (sRGB) into three's linear working space, which is what
  // the shader needs to do arithmetic in.
  const base = new Color(baseColor)
  const accent = new Color(accentColor)

  for (let i = 0; i < count; i++) {
    const u = Math.random() * Math.PI * 2
    const v = Math.acos(1 - 2 * Math.random())
    const [x, y, z] = headSurface(u, v)

    // Squared random biases most points toward the surface, a few inward.
    const shrink = 1 - Math.random() * Math.random() * 0.22

    const i3 = i * 3
    positions[i3] = x * shrink
    positions[i3 + 1] = y * shrink
    positions[i3 + 2] = z * shrink

    const c = Math.random() < accentRatio ? accent : base
    colors[i3] = c.r
    colors[i3 + 1] = c.g
    colors[i3 + 2] = c.b

    // z runs roughly -1..1.24 on this surface; map it into 0..1 so points
    // facing the camera are brighter than those on the far side.
    lumas[i] = Math.min(1, Math.max(0, (z * shrink + 1.1) / 2.3))

    randoms[i3] = Math.random() * 2 - 1
    randoms[i3 + 1] = Math.random()
    randoms[i3 + 2] = Math.random() * 2 - 1
  }

  return { positions, colors, randoms, lumas, count }
}
