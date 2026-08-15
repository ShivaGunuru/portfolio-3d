import { useRef } from 'react'

import { hero, site } from '../../content/site'
import { usePinnedStage } from '../../hooks/usePinnedStage'
import { Stage } from '../../three/Stage'
import { Reveal } from '../Reveal'

export function Hero() {
  const sectionRef = useRef<HTMLElement>(null)
  const progress = usePinnedStage(sectionRef)

  return (
    <section
      id="hero"
      aria-labelledby="hero-heading"
      ref={sectionRef}
      className="relative flex min-h-svh flex-col justify-center overflow-hidden"
    >
      <div className="page-shell relative z-10 grid w-full items-center gap-16 md:grid-cols-2">
        <Reveal
          className="flex max-w-160 flex-col gap-6 sm:gap-[26px]"
          stagger={0.1}
          delay={0.15}
        >
          <p className="font-mono text-xs tracking-[0.2em] text-accent uppercase">
            {hero.eyebrow}
          </p>

          <h1
            id="hero-heading"
            className="font-display text-[clamp(2.5rem,5.4vw,4.875rem)] leading-[0.98] font-extrabold tracking-[-0.025em] text-balance"
          >
            {hero.headline}
          </h1>

          <p className="max-w-130 text-lg leading-relaxed font-light text-muted text-pretty sm:text-[19px]">
            {hero.subline}
          </p>

          <div className="mt-1.5 flex flex-wrap items-center gap-5 font-mono text-xs tracking-[0.14em] uppercase">
            <a
              href={hero.cta.href}
              className="border border-dim px-[22px] py-[13px] transition-colors hover:border-accent hover:text-accent"
            >
              {hero.cta.label}
            </a>
            <a
              href={`mailto:${site.email}`}
              className="text-muted normal-case transition-colors hover:text-accent"
            >
              {site.email}
            </a>
          </div>
        </Reveal>

        <Stage
          progress={progress}
          mode="assemble"
          className="aspect-square w-full max-w-xl justify-self-center"
        />
      </div>
    </section>
  )
}
