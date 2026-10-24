import { useEffect, type RefObject } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

import cutoutManifest from '../assets/hero-cutout.json'
import lensStill from '../assets/hero-lens-still.json'
import {
  cameraTransform,
  coverZoom,
  heroPhases,
  isInsideLens,
  pushZoom,
  stripOffset,
  titleReveal,
} from '../hero/heroTimeline'

gsap.registerPlugin(ScrollTrigger)

export interface HeroCameraRefs {
  /** Everything that zooms together: back name, content grid, portrait, band. */
  camera: RefObject<HTMLDivElement | null>
  /** The portrait's reserved box (HeroCutoutStage). */
  box: RefObject<HTMLDivElement | null>
  backName: RefObject<HTMLDivElement | null>
  band: RefObject<HTMLDivElement | null>
  bandRun: RefObject<HTMLDivElement | null>
  still: RefObject<HTMLImageElement | null>
  card: RefObject<HTMLDivElement | null>
}

interface HeroCameraOptions {
  /** The Hero pin's 0..1 progress. */
  progress: RefObject<number>
  /** Written here every frame; the cutout canvas reads it to pick a frame. */
  posterProgress: RefObject<number>
  /** False under reduced motion or on compact screens: the poster is placed but nothing moves. */
  active: boolean
  /** Re-runs setup when the layout crosses the compact breakpoint, which mounts or unmounts the portrait box. */
  compact: boolean
}

/** Where the chest cut sits inside the band, measured down from its top edge. */
const CUT_IN_BAND = 0.3
/** In the stacked (portrait) layout: clear space kept between the copy and the top of the portrait box. */
const STACK_CLEARANCE = 24
/** Never shrink the stacked portrait below this, however long the copy runs. */
const STACK_MIN_WIDTH = 320
/**
 * Drift over the whole poster phase, as a fraction of the viewport's width.
 * Three layers, three speeds, so the poster reads as depth: the name behind
 * and the portrait in the middle drift left at different rates, and the band
 * in front counters to the right. The portrait's drift is deliberately the
 * smallest. It is what the eye is on, and much more would carry the raised
 * hand into the headline column.
 */
/**
 * The camera layer is promoted to its own GPU layer (will-change: transform)
 * only while its zoom is below this.
 *
 * Promotion fixes the early push: unpromoted, the whole Hero, every glyph of
 * the giant name included, re-rasterises at a new size each frame, and that
 * dropped 0-4 frames per pass at about 1.3-1.6x. But a promoted layer keeps
 * the raster scale it had when (re)promoted. Promoted for the whole push, it
 * reappeared on the way back up at ~40x, was rasterised at that scale, and
 * kept it: every scroll after that dropped 40+ frames per pass through the
 * Hero until Chrome re-rasterised during idle. Measured: 40 drops with
 * permanent promotion on that path, 4 without. Promoting only at low zoom
 * keeps the first fix and caps the raster scale the second one can get stuck
 * at.
 */
const PROMOTE_MAX_ZOOM = 2.5
const NAME_DRIFT = 0.16
const PORTRAIT_DRIFT = 0.035
const BAND_DRIFT = 0.22

/** Sums offsets up the offsetParent chain. Unlike getBoundingClientRect, this
 *  ignores transforms, so it measures the unzoomed layout even mid-push. */
function offsetWithin(el: HTMLElement, ancestor: HTMLElement) {
  let x = 0
  let y = 0
  let node: HTMLElement | null = el
  while (node && node !== ancestor) {
    x += node.offsetLeft
    y += node.offsetTop
    node = node.offsetParent as HTMLElement | null
  }
  return { x, y }
}

/**
 * Drives the Hero's pinned sequence: poster drift, the push into the lens,
 * the ink title card, and the bands that open onto Work.
 *
 * All per-frame work is direct style writes in one rAF loop, each skipped when
 * its value has not changed. Nothing here re-renders React.
 */
export function useHeroCamera(
  refs: HeroCameraRefs,
  { progress, posterProgress, active, compact }: HeroCameraOptions,
) {
  useEffect(() => {
    const camera = refs.camera.current
    const box = refs.box.current
    const band = refs.band.current
    // No box means the compact layout, where the Hero visual is not rendered.
    if (!camera || !box || !band) return

    const backName = refs.backName.current
    const bandRun = refs.bandRun.current
    const still = refs.still.current
    const card = refs.card.current

    const layout = { width: 0, height: 0, lensX: 0, lensY: 0, cover: 1 }
    const written = new Map<string, string>()
    const write = (el: HTMLElement | null, key: string, prop: string, value: string) => {
      if (!el || written.get(key) === value) return
      written.set(key, value)
      el.style.setProperty(prop, value)
    }

    // Places the portrait so its chest cut sits inside the band, then works
    // out where the lens is and how far the push must zoom to cover the
    // viewport. Everything that depends on the crop comes from the two
    // manifests, never from a hand-tuned number, because both are
    // regenerated whenever the clip is re-baked or the still re-extracted.
    const measure = () => {
      box.style.top = '0px'
      box.style.width = ''

      // Stacked layout (one grid column, on portrait screens): the portrait
      // gets whatever height is left between the bottom of the copy and the
      // cut line's place in the band, and its width follows from the frame's
      // aspect ratio. CSS cannot size it, because the copy's height depends on
      // how the headline wraps at that particular width.
      const grid = box.parentElement
      const text = grid?.firstElementChild as HTMLElement | null
      const stacked = !!grid && getComputedStyle(grid).gridTemplateColumns.trim().split(/\s+/).length === 1
      if (stacked && text) {
        const textBottom = offsetWithin(text, camera).y + text.offsetHeight
        const cutTarget = band.offsetTop + band.offsetHeight * CUT_IN_BAND
        const roomH = (cutTarget - textBottom - STACK_CLEARANCE) / cutoutManifest.bottomCutFraction
        const aspect = cutoutManifest.frameWidth / cutoutManifest.frameHeight
        const width = Math.max(STACK_MIN_WIDTH, Math.min(box.offsetWidth, roomH * aspect))
        box.style.width = `${width}px`
      }

      const { x, y } = offsetWithin(box, camera)
      const boxW = box.offsetWidth
      const boxH = box.offsetHeight
      const cutY = y + boxH * cutoutManifest.bottomCutFraction
      const dy = band.offsetTop + band.offsetHeight * CUT_IN_BAND - cutY
      box.style.top = `${dy}px`

      layout.width = camera.offsetWidth
      layout.height = camera.offsetHeight
      layout.lensX = x + lensStill.lens.x * boxW
      layout.lensY = y + dy + lensStill.lens.y * boxH
      layout.cover = coverZoom(layout.width, layout.height, lensStill.lens.r * boxH)

      // The back name sits behind the head: its top lines up just under the
      // top of the portrait box.
      if (backName) backName.style.top = `${y + dy + boxH * 0.06}px`
      written.clear()
    }

    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(camera)
    ScrollTrigger.addEventListener('refresh', measure)
    let alive = true
    document.fonts.ready.then(() => {
      if (alive) measure()
    })

    const teardownLayout = () => {
      alive = false
      ro.disconnect()
      ScrollTrigger.removeEventListener('refresh', measure)
      box.style.top = ''
      box.style.transform = ''
      box.style.width = ''
    }

    if (!active) return teardownLayout

    // Bands open as Work scrolls up behind the card: from Work's top touching
    // the bottom of the viewport to it reaching 35% from the top.
    const work = document.getElementById('work')
    const bandsTrigger = work
      ? ScrollTrigger.create({
          trigger: work,
          start: 'top bottom',
          end: 'top 35%',
          scrub: true,
          invalidateOnRefresh: true,
        })
      : null

    const strips = card ? [...card.querySelectorAll<HTMLElement>('[data-lens-strip]')] : []
    const titles = card ? [...card.querySelectorAll<HTMLElement>('[data-lens-title]')] : []
    const titlesPerStrip = strips.length ? titles.length / strips.length : 0

    let canvas: HTMLCanvasElement | null = null

    // The still may only replace the canvas once it is DECODED. It sits
    // hidden until the push, and a browser does not decode a hidden image
    // until it first has to paint it, so the first push after every reload
    // swapped the canvas out for an image that was not ready: measured, the
    // page froze for ~700ms right there with nothing drawn. That was the
    // character vanishing at one point and only on the first scroll. Decode
    // ahead of time, gate the swap on it, and keep the canvas on screen until
    // then. The decode is re-requested on every approach, because the browser
    // may discard a decoded image again while the Hero is off screen;
    // decode() on an image that is still decoded resolves at once.
    let stillReady = false
    let decoding = false
    const ensureStillDecoded = () => {
      if (!still || stillReady || decoding) return
      decoding = true
      still
        .decode()
        .then(() => {
          stillReady = true
        })
        .catch(() => {})
        .finally(() => {
          decoding = false
        })
    }
    ensureStillDecoded()

    let raf = 0
    const frame = () => {
      const { poster, push, titles: titlePhase } = heroPhases(progress.current ?? 0)
      posterProgress.current = poster

      write(backName, 'name', 'transform', `translateX(${-poster * NAME_DRIFT * layout.width}px)`)
      write(bandRun, 'run', 'transform', `translateX(${(poster - 1) * BAND_DRIFT * layout.width}px)`)
      // A transform, so the drift is compositor-only: `left` would re-run
      // layout every frame. Safe now that the portrait is a real cut-out;
      // under the old multiply blend a transform here started a stacking
      // context and broke the blend.
      const portraitShift = -poster * PORTRAIT_DRIFT * layout.width
      write(box, 'portrait', 'transform', `translate3d(${portraitShift}px, 0, 0)`)

      const zoom = pushZoom(push, layout.cover)
      const inside = push > 0 && isInsideLens(zoom, layout.cover)
      if (push > 0) {
        // The lens was measured with the portrait undrifted; aim at where it
        // actually is now.
        const { tx, ty, scale } = cameraTransform({
          ...layout,
          lensX: layout.lensX + portraitShift,
          zoom,
          push,
        })
        write(camera, 'camera', 'transform', `translate(${tx}px, ${ty}px) scale(${scale})`)
      } else {
        write(camera, 'camera', 'transform', 'none')
      }
      write(camera, 'cameraLayer', 'will-change', zoom < PROMOTE_MAX_ZOOM ? 'transform' : 'auto')
      // Hard swaps, never fades: the still replaces the canvas the moment the
      // push starts (same pose, so the swap is invisible), and the whole
      // camera layer drops out once the lens covers the screen.
      //
      // The still is hidden explicitly once inside, not left to the camera's
      // `hidden`: visibility is the one hiding property a child can override,
      // and the still's own inline `visible` kept the zoomed lens on screen
      // underneath the opening bands.
      // Far from the push, assume the browser may have discarded the decode;
      // nearing it, make sure it is back before the swap needs it.
      if (poster < 0.3) stillReady = false
      else if (poster > 0.5) ensureStillDecoded()
      const showStill = push > 0 && !inside && stillReady
      write(still, 'still', 'visibility', showStill ? 'visible' : 'hidden')
      // The still REPLACES the frame canvas; it must never sit on top of it.
      // Both used to be visible at once under a multiply blend, which
      // multiplied the image by itself (every colour value squared: a 160
      // skin tone came out near 100). That was the face going dark as the
      // zoom began. The canvas mounts once the sprite loads, so look it up
      // lazily.
      canvas ??= box.querySelector('canvas')
      write(canvas, 'canvasVis', 'visibility', showStill || inside ? 'hidden' : 'visible')
      write(camera, 'cameraVis', 'visibility', inside ? 'hidden' : 'visible')

      const bands = bandsTrigger ? bandsTrigger.progress : 1
      const cardOn = inside && bands < 1
      // display, not visibility. A visibility-hidden card stays in rendering,
      // and once its 6 strips and 24 title copies have been animated, Chrome
      // keeps each as its own composited layer for a while. Measured: after
      // scrolling back up through the card, every scrollTo Lenis made cost
      // enough to drop 40-47 frames per pass through the Hero, even sitting at
      // the top; with the card out of rendering, 1. display: none removes it,
      // layers and all, whenever it is not on screen.
      write(card, 'card', 'display', cardOn ? 'block' : 'none')
      if (cardOn) {
        titles.forEach((el, i) => {
          const rise = titleReveal(titlePhase, i % titlesPerStrip)
          write(el, `title${i}`, 'transform', `translateY(${(1 - rise) * 100}%)`)
        })
        strips.forEach((el, i) => {
          write(el, `strip${i}`, 'transform', `translateX(${stripOffset(bands, i)}%)`)
        })
      }

      raf = requestAnimationFrame(frame)
    }
    frame()

    return () => {
      cancelAnimationFrame(raf)
      bandsTrigger?.kill()
      teardownLayout()
      camera.style.transform = ''
      camera.style.willChange = ''
      camera.style.visibility = ''
      if (still) still.style.visibility = ''
      if (canvas) canvas.style.visibility = ''
      if (card) card.style.display = ''
    }
    // Deliberately only these two. Hero builds a new `refs` wrapper object on
    // every render, so listing it would tear this down and rebuild it on any
    // re-render; the RefObjects inside it, and the two progress refs, are
    // stable for the component's lifetime.
  }, [active, compact])
}
