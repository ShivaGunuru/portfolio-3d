/**
 * The six rows of the preloader overlay, as data.
 *
 * Pure and DOM-free on purpose: this runs inside Node at build time (see the
 * `preloaderHtml` plugin in vite.config.ts), where it writes the overlay
 * straight into index.html so it can paint before any JS has loaded.
 */

export interface Band {
  text: string
  /** The name band: set large in Syne, in the page colour. Every other band is small mono. */
  emphasis: boolean
  /** Which way the text drifts while loading, and which edge the band leaves by. */
  direction: 'left' | 'right'
}

export const BAND_COUNT = 6
/** Third of six, so the name sits just above the optical centre of the screen. */
export const NAME_BAND = 2

/**
 * Role first, the name in the centre, project titles around it. Takes plain
 * values rather than importing `site.ts` itself so the test can hand it
 * deliberately short input.
 */
export function buildBands(
  name: string,
  role: string,
  projects: readonly { title: string }[],
): Band[] {
  if (projects.length < 4) {
    throw new Error(`buildBands: need 4 project titles, got ${projects.length}`)
  }
  const texts = [role, projects[0].title, name, projects[1].title, projects[2].title, projects[3].title]
  return texts.map((text, i) => ({
    text,
    emphasis: i === NAME_BAND,
    direction: i % 2 === 0 ? 'left' : 'right',
  }))
}
