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
 * GPU pipeline once the visual is "the real subject, background removed, no
 * effects." Motion is scroll-scrubbed by drawing whichever single baked
 * frame is nearest the current progress, never a blend of two, which is
 * what real scroll-scrubbed video does and avoids the double-exposure
 * ghosting a crossfade produces wherever the pose changed between frames.
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

    const { image, frameCount, columns, frameWidth, frameHeight } = data
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

      const col = frameIndex % columns
      const row = Math.floor(frameIndex / columns)

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, displayWidth, displayHeight)
      ctx.drawImage(
        image,
        col * frameWidth,
        row * frameHeight,
        frameWidth,
        frameHeight,
        dx,
        dy,
        drawW,
        drawH,
      )
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

  return (
    <canvas
      ref={canvasRef}
      className={className}
      // Eases the bottom edge out instead of ending on the sharp horizontal
      // line the source video's own frame boundary cuts the subject off at.
      // A mask, not a second baked alpha ramp: it composes with whatever
      // alpha the sprite already has (background pixels stay at zero, only
      // the subject's own bottom edge fades) rather than needing the bake
      // to know anything about where the canvas will place the frame.
      style={{
        maskImage: 'linear-gradient(to bottom, black 0%, black 72%, transparent 96%)',
        WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 72%, transparent 96%)',
      }}
    />
  )
}
