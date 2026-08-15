import { Fragment, useRef } from 'react'

import { about } from '../../content/site'
import { usePinnedStage } from '../../hooks/usePinnedStage'
import { Stage } from '../../three/Stage'
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

export function About() {
  const sectionRef = useRef<HTMLElement>(null)
  const progress = usePinnedStage(sectionRef)

  return (
    <section
      id="about"
      aria-labelledby="about-heading"
      ref={sectionRef}
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

        <Stage
          progress={progress}
          mode="turn"
          className="aspect-square w-full max-w-xl justify-self-center"
        />
      </div>
    </section>
  )
}
