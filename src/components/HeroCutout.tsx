import { useEffect, useRef, type RefObject } from 'react'

import type { HeroCutoutData } from '../hooks/useHeroCutout'

interface HeroCutoutProps {
  data: HeroCutoutData
  /** 0..1, driven by the section's scroll-pin progress. Maps directly to a
   *  baked frame index: nothing here reinterprets it. */
  progress: RefObject<number>
  /** Hold on one representative frame, no per-frame stepping. */
  still: boolean
  className?: string
}

/**
 * Steps through the baked Hero cutout sprite sheet as the user scrolls.
 *
 * Plain 2D canvas, not WebGL: there is no shader effect left to justify a
 * GPU pipeline once the visual is "the real subject, no effects." Motion is
 * scroll-scrubbed by drawing whichever single baked frame is nearest the
 * current progress, never a blend of two, which is what real scroll-scrubbed
 * video does and avoids the double-exposure ghosting a crossfade produces
 * wherever the pose changed between frames.
 */
export function HeroCutout({ data, progress, still, className }: HeroCutoutProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const lastFrame = useRef(-1)
  const rafRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { image, frames, frameCount, columns, frameWidth, frameHeight } = data
    const aspect = frameWidth / frameHeight

    let displayWidth = 0
    let displayHeight = 0
    let dpr = 1

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      displayWidth = rect.width
      displayHeight = rect.height
      canvas.width = Math.max(1, Math.round(displayWidth * dpr))
      canvas.height = Math.max(1, Math.round(displayHeight * dpr))
      lastFrame.current = -1 // force a redraw at the new size
    }

    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    resize()

    const draw = (frameIndex: number) => {
      if (frameIndex === lastFrame.current) return
      lastFrame.current = frameIndex

      // object-fit: contain, centred, in CSS pixel space.
      const containerAspect = displayWidth / displayHeight
      let drawW = displayWidth
      let drawH = displayHeight
      if (containerAspect > aspect) {
        drawH = displayHeight
        drawW = drawH * aspect
      } else {
        drawW = displayWidth
        drawH = drawW / aspect
      }
      const dx = (displayWidth - drawW) / 2
      const dy = (displayHeight - drawH) / 2

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, displayWidth, displayHeight)
      // Per-frame bitmaps keep each draw's texture small; see useHeroCutout.
      const frame = frames?.[frameIndex]
      if (frame) {
        ctx.drawImage(frame, dx, dy, drawW, drawH)
      } else {
        const col = frameIndex % columns
        const row = Math.floor(frameIndex / columns)
        ctx.drawImage(image, col * frameWidth, row * frameHeight, frameWidth, frameHeight, dx, dy, drawW, drawH)
      }
    }

    const tick = () => {
      const p = still ? 0.5 : progress.current
      const frameIndex = Math.min(frameCount - 1, Math.max(0, Math.round(p * (frameCount - 1))))
      draw(frameIndex)
      rafRef.current = requestAnimationFrame(tick)
    }
    // Called directly, not just scheduled: a tab that mounts this while
    // backgrounded (opened in a background tab, not yet switched to) never
    // gets a rAF callback until it's foregrounded, since there is nothing to
    // sync to. The first paint can't wait on that; only the frame-by-frame
    // updates after it need the loop.
    tick()

    return () => {
      ro.disconnect()
      cancelAnimationFrame(rafRef.current)
    }
  }, [data, progress, still])

  // No bottom fade. The hard edge where the source clip cuts the subject off
  // mid-chest is covered by the Hero's role band instead (see useHeroCamera,
  // which places this box so the cut sits inside the band). A fade only ever
  // hid that edge; the band makes it part of the design.
  return <canvas ref={canvasRef} className={className} />
}
