import { useRef, type CSSProperties } from 'react'

import { hero, marquee, site } from '../../content/site'
import { HERO_PIN_DISTANCE } from '../../hero/heroTimeline'
import { useHeroCamera } from '../../hooks/useHeroCamera'
import { useIsCompact } from '../../hooks/useIsCompact'
import { usePinnedStage } from '../../hooks/usePinnedStage'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'
import { HeroCutoutStage } from '../HeroCutoutStage'
import { HeroLensCard } from '../HeroLensCard'
import { Reveal } from '../Reveal'

/** One run of the band: long enough to span its 200vw box plus the drift. */
const BAND_RUN = Array.from({ length: 14 }, () => `${site.role} ${marquee.separator} `).join('')

/**
 * The Hero is one pinned sequence (see src/hero/heroTimeline.ts): a poster
 * lock-up, then a camera push into the left lens of the sunglasses, then an
 * ink card of the project titles whose bands open onto Work.
 *
 * Layer order inside the camera: the back name is painted first, so the
 * portrait (a true cut-out with a transparent background) sits in front of
 * it with ordinary blending. The name shows only around the subject, never
 * through them.
 */
export function Hero() {
  const sectionRef = useRef<HTMLElement>(null)
  const progress = usePinnedStage(sectionRef, { distance: HERO_PIN_DISTANCE })
  const posterProgress = useRef(0)
  const reducedMotion = usePrefersReducedMotion()
  const compact = useIsCompact()
  const active = !reducedMotion && !compact

  const cameraRef = useRef<HTMLDivElement>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const backNameRef = useRef<HTMLDivElement>(null)
  const bandRef = useRef<HTMLDivElement>(null)
  const bandRunRef = useRef<HTMLDivElement>(null)
  const stillRef = useRef<HTMLImageElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  useHeroCamera(
    {
      camera: cameraRef,
      box: boxRef,
      backName: backNameRef,
      band: bandRef,
      bandRun: bandRunRef,
      still: stillRef,
      card: cardRef,
    },
    { progress, posterProgress, active, compact },
  )

  return (
    // Negative margins undo main's side padding so the band and the back name
    // can run edge to edge; the grid puts the padding back. They sit on this
    // wrapper, not on the section, because the section is what gets pinned:
    // GSAP moves a pinned element's margins onto its pin spacer and fixes its
    // width at the content width, which silently cut both layers off a
    // gutter short of the right edge.
    <div className="-mx-6 sm:-mx-gutter">
    <section
      id="hero"
      aria-labelledby="hero-heading"
      ref={sectionRef}
      className="relative min-h-svh overflow-hidden poster:h-svh"
      style={{ '--band-h': 'clamp(5rem, 15svh, 9rem)' } as CSSProperties}
    >
      {/* Its own GPU layer in the poster layout (will-change), so the camera
          push is scaled by the compositor instead of re-rasterising the whole
          Hero, every glyph of the giant name included, at a new size each
          frame. Measured over a scroll through the sequence: 0-4 dropped
          frames per run without it, all early in the push, and 0 in every run
          with it, at identical sharpness (the zoom is limited by the still's
          own resolution, not by the layer). */}
      <div
        ref={cameraRef}
        className="flex min-h-svh origin-top-left flex-col justify-center poster:absolute poster:inset-0 poster:block poster:min-h-0 poster:will-change-transform"
      >
        <div
          ref={backNameRef}
          aria-hidden="true"
          className="pointer-events-none absolute left-0 hidden font-display text-[clamp(9rem,30svh,22rem)] leading-[0.8] font-extrabold tracking-[-0.03em] whitespace-nowrap text-poster uppercase poster:block"
        >
          {site.name}
          {'   '}
          {site.name}
        </div>

        {/* The grid stops at the band's top edge, so the band can never sit
            over the headline or the call to action. On portrait screens
            (tablets held upright) two columns squeezed the portrait into a
            corner, 361px wide on an iPad Air with half the screen empty above
            it, so there it stacks: copy on top, portrait beneath it, sized by
            useHeroCamera to fill the room left above the band. */}
        <div className="page-shell grid w-full items-center gap-16 px-6 pt-24 pb-16 sm:px-gutter poster:absolute poster:inset-x-0 poster:top-0 poster:bottom-(--band-h) poster:grid-cols-[1fr_1.2fr] poster:pt-20 poster:pb-6 poster:portrait:grid-cols-1 poster:portrait:content-start poster:portrait:gap-8">
          <Reveal className="flex max-w-160 flex-col gap-6 sm:gap-[26px]" stagger={0.1} delay={0.15}>
            <p className="font-mono text-xs tracking-[0.2em] text-dim uppercase">{hero.eyebrow}</p>

            {/* On desktop the headline is sized by viewport height as well as
                width: the whole column has to fit above the band, and Syne is
                wide enough that the width-only size wrapped this line to seven
                lines (501px of headline at 1366x768), pushing the subline and
                the call to action under the band. */}
            <h1
              id="hero-heading"
              className="font-display text-[clamp(2.5rem,5.4vw,4.875rem)] leading-[0.98] font-extrabold tracking-[-0.025em] text-balance poster:text-[clamp(2rem,min(4.2vw,6.8svh),4.25rem)] poster:portrait:text-[clamp(2.25rem,6.2vw,4.25rem)]"
            >
              {hero.headline}
            </h1>

            <p className="max-w-130 text-lg leading-relaxed font-light text-muted text-pretty sm:text-[19px]">
              {hero.subline}
            </p>

            <div className="mt-1.5 flex flex-wrap items-center gap-5 font-mono text-xs tracking-[0.14em] uppercase">
              <a
                href={hero.cta.href}
                className="rounded-full bg-fg px-8 py-4 text-bg transition-opacity hover:opacity-80"
              >
                {hero.cta.label}
              </a>
              <a
                href={`mailto:${site.email}`}
                className="py-1 text-muted normal-case transition-colors hover:text-accent"
              >
                {site.email}
              </a>
            </div>
          </Reveal>

          {/* No background on this box: the frames are cut out, so the back
              name and the page show through around the subject. */}
          <HeroCutoutStage
            progress={posterProgress}
            boxRef={boxRef}
            stillRef={stillRef}
            className="w-full max-w-2xl justify-self-center poster:portrait:max-w-[46rem]"
          />
        </div>

        {/* 200vw wide and starting half a viewport off-screen, so neither end
            ever comes into view while the camera pushes in. */}
        <div
          ref={bandRef}
          aria-hidden="true"
          className="absolute bottom-0 -left-[50vw] hidden h-(--band-h) w-[200vw] items-center overflow-hidden bg-fg poster:flex"
        >
          <div
            ref={bandRunRef}
            className="shrink-0 font-display text-[calc(var(--band-h)*0.58)] leading-none font-extrabold tracking-[-0.02em] whitespace-nowrap text-bg uppercase"
          >
            {BAND_RUN}
          </div>
        </div>
      </div>

      {active && <HeroLensCard cardRef={cardRef} />}
    </section>
    </div>
  )
}
