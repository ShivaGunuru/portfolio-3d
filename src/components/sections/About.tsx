import { Fragment, useEffect, useRef } from 'react'
import { exploded } from '@lucasmarkes/hairline'

import { about } from '../../content/site'
import { Reveal } from '../Reveal'
import { SectionHeading } from '../SectionHeading'

/**
 * The handle appears mid-sentence in the source copy. Splitting on it keeps the
 * paragraph a single string in src/content/site.ts, so the copy stays one
 * traceable unit rather than being chopped into fragments across JSX.
 */
function withHandleLink(paragraph: string) {
  const { text, href } = about.handle
  if (!paragraph.includes(text)) return paragraph

  const [before, after] = paragraph.split(text)
  return (
    <Fragment>
      {before}
      <a
        href={href}
        target="_blank"
        rel="noreferrer noopener"
        className="text-fg underline decoration-edge underline-offset-4 transition-colors hover:text-accent hover:decoration-accent"
      >
        {text}
      </a>
      {after}
    </Fragment>
  )
}

/**
 * The plain-JS entry, not `@lucasmarkes/hairline/react`: the React entry pulls
 * in all 33 figures (main bundle 158 KB to 280 KB), while this one keeps only
 * the figure used.
 */
function ExplodedFigure() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!ref.current) return
    const figure = exploded(ref.current, { play: true, intensity: 0.6 })
    return () => figure.destroy()
  }, [])
  // aspect-[5/4] reserves the figure's box before it draws: no layout shift.
  return <div ref={ref} className="hairline-figure aspect-[5/4] w-full max-w-xl justify-self-center" />
}

export function About() {
  return (
    <section
      id="about"
      aria-labelledby="about-heading"
      className="page-shell relative z-10 overflow-hidden py-30"
    >
      <SectionHeading
        id="about-heading"
        label={about.eyebrow}
        meta={about.meta}
      />

      <div className="grid items-center gap-16 md:grid-cols-2">
        <Reveal className="flex max-w-165 flex-col gap-[30px]" stagger={0.1}>
          <p className="font-display text-[clamp(1.5rem,2.4vw,2rem)] leading-[1.25] font-semibold tracking-[-0.015em] text-pretty">
            {about.lead}
          </p>

          {about.body.map((paragraph) => (
            <p
              key={paragraph.slice(0, 40)}
              className="text-[17px] leading-[1.65] font-light text-body text-pretty"
            >
              {withHandleLink(paragraph)}
            </p>
          ))}
        </Reveal>

        {/* An app window in four layers (Hairline's Exploded): moving across
            opens the gap, moving down picks a layer. `play` walks it on its own
            until the pointer arrives, which is the only way a phone, with no
            hover, sees it move. Colours come from the hairline-* properties in
            index.css. It reserves its own 5:4 box, so nothing shifts on load. */}
        <ExplodedFigure />
      </div>
    </section>
  )
}
