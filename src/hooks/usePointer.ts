import { useEffect, useRef } from 'react'

export interface PointerState {
  /** Cursor in normalised device coordinates, -1..1. */
  x: number
  y: number
  /** 0 when there is no usable cursor, 1 when there is. Eased, not binary. */
  active: number
}

/**
 * Tracks the cursor for the 3D layer.
 *
 * Listening on `window` rather than on the canvas is deliberate. The canvas is
 * `pointer-events: none` so it cannot swallow clicks on the links underneath
 * it, which also means it never receives pointer events of its own. Watching
 * the window gives the scene the cursor position without putting a
 * click-blocking surface over the whole page.
 *
 * State lives in a ref, not React state: this updates every mouse move and must
 * never trigger a re-render.
 */
export function usePointer(enabled: boolean) {
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
      pointer.current.x = (event.clientX / window.innerWidth) * 2 - 1
      pointer.current.y = -((event.clientY / window.innerHeight) * 2 - 1)
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
  }, [enabled])

  return { pointer, target }
}
