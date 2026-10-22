/**
 * The Hero's pinned sequence, as pure functions of scroll progress.
 *
 * DOM-free so the timing and camera maths are tested directly
 * (heroTimeline.test.ts) rather than by scrubbing a browser. useHeroCamera is
 * the only caller; it measures the layout and writes the styles.
 *
 *   0    to 0.55  poster: frames scrub, the name and the band drift
 *   0.55 to 0.9   push: the whole Hero scales into the left lens
 *   0.84 to 1     titles: inside the lens, the project titles rise in
 *
 * The bands that open onto Work are not in here: they run after the pin,
 * driven by #work scrolling into view (see useHeroCamera).
 */

/** Pin length, as a percentage of viewport height. Was 100 for the poster alone. */
export const HERO_PIN_DISTANCE = 250

const POSTER_END = 0.55
const PUSH_START = 0.55
const PUSH_END = 0.9
const TITLES_START = 0.84

/**
 * The push zooms this far past the point where the lens covers the viewport.
 * Capping it relative to that point, rather than at a fixed zoom, is what
 * makes the cut to ink land at the same moment for every viewport size and
 * lens size. A fixed cap either stops short of covering (the cut never
 * happens) or overshoots and spends the end of the push on solid black.
 */
const COVER_OVERSHOOT = 1.15

/** Lens half-height times this must exceed the viewport's half-diagonal. The
 *  lens is a wide ellipse with a rim, so a little over 0.5 covers it. */
const COVER_FACTOR = 0.62

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const seg = (p: number, a: number, b: number) => clamp01((p - a) / (b - a))
const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

export interface HeroPhases {
  /** 0..1 through the poster, linear: it maps straight onto frame index. */
  poster: number
  /** 0..1 through the push, eased. */
  push: number
  /** 0..1 through the title rise, linear; each title eases on its own. */
  titles: number
}

export function heroPhases(p: number): HeroPhases {
  return {
    poster: seg(p, 0, POSTER_END),
    push: easeInOutCubic(seg(p, PUSH_START, PUSH_END)),
    titles: seg(p, TITLES_START, 1),
  }
}

/** Zoom at which a lens of `lensRadiusPx` (half-height, at zoom 1) covers a `width` x `height` viewport. */
export function coverZoom(width: number, height: number, lensRadiusPx: number): number {
  return (Math.hypot(width, height) * COVER_FACTOR) / Math.max(1, lensRadiusPx)
}

/**
 * Exponential, so the push reads as constant speed. Linear zoom would crawl
 * at the start and lurch at the end, because each step is a smaller fraction
 * of a scale that keeps growing.
 */
export function pushZoom(push: number, cover: number): number {
  return Math.exp(Math.log(cover * COVER_OVERSHOOT) * clamp01(push))
}

export function isInsideLens(zoom: number, cover: number): boolean {
  return zoom >= cover
}

export interface CameraInput {
  /** The lens point in the camera layer's own, unscaled coordinates. */
  lensX: number
  lensY: number
  width: number
  height: number
  zoom: number
  push: number
}

/**
 * Scales about the lens while drawing it toward the viewport centre, so the
 * dive ends dead centre instead of off to the side where the lens started.
 * The pull finishes early in the push (1.6x faster) so the centring is done
 * before the zoom gets steep, which keeps the lens from sliding sideways
 * across the screen at high magnification.
 *
 * Apply as `translate(tx, ty) scale(scale)` with `transform-origin: 0 0`.
 */
export function cameraTransform({ lensX, lensY, width, height, zoom, push }: CameraInput) {
  const pull = Math.min(1, clamp01(push) * 1.6)
  const ax = lensX + (width / 2 - lensX) * pull
  const ay = lensY + (height / 2 - lensY) * pull
  return { tx: ax - lensX * zoom, ty: ay - lensY * zoom, scale: zoom }
}
