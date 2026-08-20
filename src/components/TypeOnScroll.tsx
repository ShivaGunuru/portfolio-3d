import { useLayoutEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'

gsap.registerPlugin(ScrollTrigger)

interface TypeOnScrollProps {
  text: string
  className?: string
  /** Delay after the trigger fires, before the pointer starts moving. */
  delay?: number
}

/** Seconds per character. 88 characters, this project's typical hook length,
 *  lands around 1.5s: fast enough to read as typing rather than as waiting. */
const SECONDS_PER_CHAR = 0.017

/** Offset of the first character's left edge, relative to the paragraph.
 *  The paragraph is `position: relative`, so it is the offset parent of the
 *  character spans and their offsets are already relative to it. */
function firstCharX(chars: HTMLSpanElement[]): number {
  return chars[0]?.offsetLeft ?? 0
}

/** Offset of the first character's top edge, relative to the paragraph.
 *  Nudged down so the pointer's tip, not its body, sits on the line. */
function firstCharY(chars: HTMLSpanElement[]): number {
  return (chars[0]?.offsetTop ?? 0) + 2
}

/**
 * Types a line out on scroll, led by a pointer that moves in, clicks the
 * insertion point, and hands over to a blinking caret.
 *
 * **The text is always really in the DOM, and is only ever hidden once the
 * animation is certain to run.** Characters are wrapped in spans and hidden
 * with `color: transparent`, never removed, never injected by script, and
 * never hidden from a stylesheet, and none of that happens until the
 * ScrollTrigger actually fires. So the copy is crawlable, it stays in the
 * accessibility tree throughout (which `visibility: hidden` or
 * `display: none` would not allow), and a trigger that never fires leaves a
 * fully readable line rather than a blank one. Same rule the rest of the site
 * follows, for the same reason.
 *
 * Transparent characters keep their layout box, so the line occupies its final
 * size from the first frame and nothing reflows as it fills in.
 */
export function TypeOnScroll({ text, className, delay = 0 }: TypeOnScrollProps) {
  const ref = useRef<HTMLParagraphElement>(null)
  const reducedMotion = usePrefersReducedMotion()

  useLayoutEffect(() => {
    const el = ref.current
    if (!el || reducedMotion) return

    // A drawn mouse pointer is a lie on a touch device, where there is no
    // cursor to imitate. Those visitors get the typing without it.
    const finePointer = window.matchMedia('(pointer: fine)').matches

    const ctx = gsap.context(() => {
      // Runs only once the line is about to be seen, never at mount. See the
      // component doc comment for why that ordering is load-bearing.
      const build = () => {
        // --- split into characters ---------------------------------------
        const chars: HTMLSpanElement[] = []
        const frag = document.createDocumentFragment()
        for (const ch of text) {
          const span = document.createElement('span')
          // A plain space, never a non-breaking one. An earlier revision used
          // U+00A0 here to stop spaces collapsing, which they were never
          // going to do: collapsing applies to *sequences* of whitespace, and
          // each space here is alone inside its own span. What it did do was
          // make the whole line unbreakable, so it ran straight out of its
          // grid column instead of wrapping.
          span.textContent = ch
          span.style.color = 'transparent'
          frag.append(span)
          chars.push(span)
        }

        const caret = document.createElement('span')
        caret.setAttribute('aria-hidden', 'true')
        caret.className = 'inline-block w-[0.08em] bg-current align-[-0.1em]'
        caret.style.height = '1em'
        caret.style.opacity = '0'

        el.replaceChildren(frag, caret)

        // --- pointer ------------------------------------------------------
        let pointer: HTMLSpanElement | null = null
        if (finePointer) {
          pointer = document.createElement('span')
          pointer.setAttribute('aria-hidden', 'true')
          pointer.className = 'pointer-events-none absolute z-10 text-fg'
          // Anchored to the paragraph's own top-left corner. Without this an
          // absolutely-positioned element keeps its static position, which
          // for one appended after the text is wherever the text flow happens
          // to end, so every transform below would be measured from the end
          // of the last line instead of from the paragraph's origin. Measured
          // before the fix: the pointer settled 256px right of its target.
          pointer.style.left = '0'
          pointer.style.top = '0'
          pointer.style.opacity = '0'
          pointer.innerHTML = `
            <svg width="17" height="20" viewBox="0 0 17 20" fill="none" aria-hidden="true">
              <path d="M1 1L1 15.5L4.8 12.2L7.4 18.2L10.2 17L7.6 11.1L12.5 11L1 1Z"
                    fill="currentColor" stroke="var(--color-bg)" stroke-width="1.2"
                    stroke-linejoin="round" />
            </svg>`
          el.append(pointer)
        }

        const tl = gsap.timeline({ delay })

        if (pointer) {
          const target = pointer
          tl.set(target, {
            // Offset from the insertion point, so the move reads as an
            // approach rather than an appearance.
            x: () => firstCharX(chars) - 64,
            y: () => firstCharY(chars) + 40,
          })
            .to(target, { opacity: 1, duration: 0.18, ease: 'power1.out' })
            .to(target, {
              x: () => firstCharX(chars),
              y: () => firstCharY(chars),
              duration: 0.5,
              // Decelerates into the target the way a hand-guided pointer
              // does, rather than arriving at constant speed.
              ease: 'power3.out',
            })
            // The click itself: a quick press and release, no bounce.
            .to(target, { scale: 0.82, duration: 0.09, ease: 'power2.in' }, '>-0.02')
            .to(target, { scale: 1, duration: 0.12, ease: 'power2.out' })
        }

        // The caret lands as the click resolves, so the click reads as the
        // thing that placed it.
        tl.set(caret, { opacity: 1 })

        if (pointer) {
          tl.to(pointer, { opacity: 0, duration: 0.22, ease: 'power1.out' }, '<')
        }

        const state = { n: 0 }
        tl.to(state, {
          n: chars.length,
          duration: chars.length * SECONDS_PER_CHAR,
          ease: 'none',
          onUpdate: () => {
            const upto = Math.round(state.n)
            for (let i = 0; i < chars.length; i++) {
              chars[i].style.color = i < upto ? '' : 'transparent'
            }
            // Keeping the caret immediately after the last revealed character
            // lets the browser's own line breaking carry it onto the next
            // line, instead of tracking a coordinate that would be wrong as
            // soon as the text wraps.
            const next = chars[upto]
            if (next) el.insertBefore(caret, next)
            else el.insertBefore(caret, pointer)
          },
        })

        // Blink only once typing has stopped: a caret that blinks while
        // characters are still arriving reads as a rendering glitch.
        tl.to(caret, {
          opacity: 0,
          duration: 0.5,
          repeat: 5,
          yoyo: true,
          ease: 'steps(1)',
        }).to(caret, { opacity: 0, duration: 0.2 })
      }

      ScrollTrigger.create({
        trigger: el,
        start: 'top 82%',
        once: true,
        onEnter: build,
      })
    }, el)

    return () => {
      ctx.revert()
      // `ctx.revert()` restores the tweens, not the DOM `build` created, so
      // the original text is put back explicitly.
      el.textContent = text
    }
  }, [text, delay, reducedMotion])

  return (
    <p ref={ref} className={`relative ${className ?? ''}`}>
      {text}
    </p>
  )
}
