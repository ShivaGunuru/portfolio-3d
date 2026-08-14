import { marquee } from '../content/site'

/**
 * How many times the word list repeats inside a single run.
 *
 * One run has to be at least as wide as the viewport, or the loop shows a gap
 * at the seam on wide screens. Four repetitions of three words clears any
 * display comfortably at the largest clamped font size, and the cost of the
 * extra spans is nil.
 */
const RUN_REPEATS = 4

/** One run, with a trailing separator so run-to-run joins look like any other
 *  gap between words rather than two words colliding. */
const RUN_TEXT = Array.from({ length: RUN_REPEATS })
  .flatMap(() => marquee.words)
  .map((word) => `${word} ${marquee.separator} `)
  .join('')

/**
 * The band that closes the page: three words drifting rightward forever,
 * glowing, with an occasional chromatic glitch.
 *
 * It renders outside `<main>` on purpose. `main` carries the page's horizontal
 * padding, and this is the one element meant to run edge to edge.
 *
 * The whole strip is `aria-hidden`. It is decoration, not content, and a
 * screen reader announcing "error, 404, dead end" on repeat would actively
 * suggest the page had failed to load. That is also why this is a plain `div`
 * and not a `footer`: an aria-hidden landmark is a contradiction.
 */
export function BottomMarquee() {
  return (
    <div
      aria-hidden="true"
      // The fixed height is what keeps this out of the CLS budget: Syne loads
      // async, and without a reserved box the band would resize on font swap.
      // overflow-hidden is not optional either, since the track is wider than
      // the viewport and would otherwise add horizontal page scroll.
      className="relative z-10 flex h-[clamp(7rem,14vw,11rem)] items-center overflow-hidden border-t border-edge"
    >
      <div className="marquee-track flex w-max">
        {/* Two identical runs. The drift keyframe relies on there being exactly
            two, since it translates by half the track's width. */}
        <span
          data-text={RUN_TEXT}
          className="marquee-run shrink-0 font-display text-[clamp(2.5rem,8vw,6rem)] leading-none font-extrabold tracking-[-0.02em] whitespace-nowrap uppercase"
        >
          {RUN_TEXT}
        </span>
        <span
          data-text={RUN_TEXT}
          className="marquee-run shrink-0 font-display text-[clamp(2.5rem,8vw,6rem)] leading-none font-extrabold tracking-[-0.02em] whitespace-nowrap uppercase"
        >
          {RUN_TEXT}
        </span>
      </div>
    </div>
  )
}
