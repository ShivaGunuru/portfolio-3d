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
/** Drift over the whole poster phase, as a fraction of the viewport's width. */
const NAME_DRIFT = 0.16
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

    let raf = 0
    const frame = () => {
      const { poster, push, titles: titlePhase } = heroPhases(progress.current ?? 0)
      posterProgress.current = poster

      write(backName, 'name', 'transform', `translateX(${-poster * NAME_DRIFT * layout.width}px)`)
      write(bandRun, 'run', 'transform', `translateX(${(poster - 1) * BAND_DRIFT * layout.width}px)`)

      const zoom = pushZoom(push, layout.cover)
      const inside = push > 0 && isInsideLens(zoom, layout.cover)
      if (push > 0) {
        const { tx, ty, scale } = cameraTransform({ ...layout, zoom, push })
        write(camera, 'camera', 'transform', `translate(${tx}px, ${ty}px) scale(${scale})`)
      } else {
        write(camera, 'camera', 'transform', 'none')
      }
      // Hard swaps, never fades: the still replaces the canvas the moment the
      // push starts (same pose, so the swap is invisible), and the whole
      // camera layer drops out once the lens covers the screen.
      //
      // The still is hidden explicitly once inside, not left to the camera's
      // `hidden`: visibility is the one hiding property a child can override,
      // and the still's own inline `visible` kept the zoomed lens on screen
      // underneath the opening bands.
      write(still, 'still', 'visibility', push > 0 && !inside ? 'visible' : 'hidden')
      write(camera, 'cameraVis', 'visibility', inside ? 'hidden' : 'visible')

      const bands = bandsTrigger ? bandsTrigger.progress : 1
      const cardOn = inside && bands < 1
      write(card, 'card', 'visibility', cardOn ? 'visible' : 'hidden')
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
      camera.style.visibility = ''
      if (still) still.style.visibility = ''
      if (card) card.style.visibility = ''
    }
    // Deliberately only these two. Hero builds a new `refs` wrapper object on
    // every render, so listing it would tear this down and rebuild it on any
    // re-render; the RefObjects inside it, and the two progress refs, are
    // stable for the component's lifetime.
  }, [active, compact])
}
