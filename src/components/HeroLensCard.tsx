import type { RefObject } from 'react'
import { createPortal } from 'react-dom'

import { projects, work } from '../content/site'

/** Same count as the preloader, so the site opens and changes chapter with the same move. */
const STRIPS = 6

function Card() {
  return (
    <div className="page-shell flex h-full flex-col justify-center gap-[3svh] px-6 sm:px-gutter">
      <p className="font-mono text-xs tracking-[0.2em] text-edge uppercase">
        ↳ {work.eyebrow} {'·'} {work.meta}
      </p>
      <ul className="flex flex-col gap-[1.4svh]">
        {projects.map((project) => (
          <li key={project.id} className="overflow-hidden">
            {/* One line per title, sized by width as well as height so the
                longest ("Feature-Benefit Translator") fits a 769px window;
                height-only sizing wrapped titles and pushed the last one off
                the bottom. Starts below its line; useHeroCamera raises it. An inline
                transform rather than a translate utility, because Tailwind's
                translate utilities set the separate `translate` property,
                which would stack on top of the transform written each frame. */}
            <span
              data-lens-title
              className="block font-display text-[clamp(1.5rem,min(3.3vw,6.4svh),5rem)] leading-[1.06] font-extrabold tracking-[-0.02em] whitespace-nowrap text-bg uppercase"
              style={{ transform: 'translateY(100%)' }}
            >
              {project.title}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * The view inside the lens: ink, the Work label, the four project titles.
 *
 * Fixed and portalled to `body`, not part of the Hero, because its bands open
 * after the Hero's pin has released, while #work scrolls up behind it. Inside
 * the pin there would be nothing but empty Hero to reveal.
 *
 * Each strip holds a full-height copy of the card, offset so the six copies
 * line up into one picture. That way the strips can slide apart and carry
 * their slice of the text with them. All six are aria-hidden: the real,
 * accessible project headings are in the Work section underneath.
 */
export function HeroLensCard({ cardRef }: { cardRef: RefObject<HTMLDivElement | null> }) {
  return createPortal(
    <div ref={cardRef} aria-hidden="true" className="pointer-events-none fixed inset-0 z-40 hidden">
      {Array.from({ length: STRIPS }, (_, i) => (
        <div
          key={i}
          data-lens-strip
          className="absolute inset-x-0 overflow-hidden bg-fg shadow-[0_1px_0_var(--color-fg)]"
          style={{ top: `${(i * 100) / STRIPS}%`, height: `${100 / STRIPS}%` }}
        >
          <div className="absolute inset-x-0" style={{ top: `${-i * 100}%`, height: `${STRIPS * 100}%` }}>
            <Card />
          </div>
        </div>
      ))}
    </div>,
    document.body,
  )
}
