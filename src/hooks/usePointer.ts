import { useEffect, useRef, type RefObject } from 'react'

export interface PointerState {
  /** Cursor in normalised device coordinates, -1..1. */
  x: number
  y: number
  /** 0 when there is no usable cursor, 1 when there is. Eased, not binary. */
  active: number
}

/**
 * Tracks the cursor for a single 3D stage, in coordinates local to that
 * stage's own container element rather than the whole window.
 *
 * Each stage's canvas is a small box inside its section's layout, not a
 * page-filling background, so NDC has to be computed against that box's own
 * bounding rect. Getting this wrong doesn't error, it just silently offsets
 * the hit region: the interaction still happens, but wherever the cursor
 * would be if the box were the full window, not where the cursor visually is.
 *
 * Listening on `window` rather than on the canvas itself is still correct
 * even with a local rect: the canvas is `pointer-events: none` so it cannot
 * swallow clicks on the links underneath it, which also means it never
 * receives pointer events of its own.
 *
 * State lives in a ref, not React state: this updates every mouse move and
 * must never trigger a re-render.
 */
export function usePointer(
  enabled: boolean,
  containerRef: RefObject<HTMLElement | null>,
) {
  const pointer = useRef<PointerState>({ x: 0, y: 0, active: 0 })
  /** Where `active` is heading. The shader eases toward it. */
  const target = useRef(0)

  useEffect(() => {
    if (!enabled) {
      pointer.current.active = 0
      target.current = 0
      return
    }

    const onMove = (event: PointerEvent) => {
      // A coarse pointer is a finger. Touch has no hover, so no glow.
      if (event.pointerType === 'touch') {
        target.current = 0
        return
      }

      const el = containerRef.current
      if (!el) {
        target.current = 0
        return
      }

      const rect = el.getBoundingClientRect()
      const localX = event.clientX - rect.left
      const localY = event.clientY - rect.top

      // Outside this stage's own box: no interaction, even if the cursor is
      // elsewhere on the page (over text, or over a different stage).
      if (localX < 0 || localX > rect.width || localY < 0 || localY > rect.height) {
        target.current = 0
        return
      }

      pointer.current.x = (localX / rect.width) * 2 - 1
      pointer.current.y = -((localY / rect.height) * 2 - 1)
      target.current = 1
    }

    const onLeave = () => {
      target.current = 0
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    document.addEventListener('pointerleave', onLeave)
    window.addEventListener('blur', onLeave)

    return () => {
      window.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerleave', onLeave)
      window.removeEventListener('blur', onLeave)
    }
  }, [enabled, containerRef])

  return { pointer, target }
}
