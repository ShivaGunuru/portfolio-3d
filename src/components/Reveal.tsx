import { useLayoutEffect, useRef, type ReactNode } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'

gsap.registerPlugin(ScrollTrigger)

interface RevealProps {
  children: ReactNode
  /** Stagger between direct children. Set 0 to move the block as one unit. */
  stagger?: number
  /** Delay before the group starts, in seconds. */
  delay?: number
  className?: string
  /** Render as something other than a div, e.g. 'ul' inside a list context. */
  as?: 'div' | 'ul' | 'section'
}

/**
 * Fades and lifts its children into place as they scroll into view.
 *
 * Under `prefers-reduced-motion` the elements are simply never hidden: no
 * opacity tween, no transform, no ScrollTrigger. That is different from playing
 * the animation instantly, because content must not depend on JavaScript
 * having run in order to be visible.
 *
 * The same reasoning drives `immediateRender: false` plus a `from` tween rather
 * than setting opacity 0 in CSS. If the tween is hidden in a stylesheet and the
 * script fails, the text is invisible forever. Here the DOM is visible by
 * default and JavaScript only ever animates it.
 */
export function Reveal({
  children,
  stagger = 0.08,
  delay = 0,
  className,
  as: Tag = 'div',
}: RevealProps) {
  const container = useRef<HTMLElement>(null)
  const reducedMotion = usePrefersReducedMotion()

  useLayoutEffect(() => {
    const el = container.current
    if (!el || reducedMotion) return

    const targets = stagger > 0 ? Array.from(el.children) : [el]
    if (targets.length === 0) return

    const ctx = gsap.context(() => {
      gsap.from(targets, {
        opacity: 0,
        y: 24,
        duration: 0.8,
        ease: 'power2.out',
        stagger,
        delay,
        immediateRender: false,
        scrollTrigger: {
          trigger: el,
          // Fire a little before the block is fully on screen, so the motion
          // has finished by the time it is in comfortable reading position.
          start: 'top 85%',
          once: true,
        },
      })
    }, el)

    return () => ctx.revert()
  }, [reducedMotion, stagger, delay])

  return (
    <Tag ref={container as never} className={className}>
      {children}
    </Tag>
  )
}
