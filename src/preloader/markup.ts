import type { Band } from './bands'

/** The comment in index.html that the build swaps for the overlay. */
export const PRELOADER_PLACEHOLDER = '<!-- preloader -->'

/** Middot between repeats, matching BottomMarquee. Em dashes are banned site-wide. */
const SEPARATOR = '·'

/**
 * How many times a band's text repeats inside one run. A run must be wider
 * than the viewport or the drift loop shows a gap at its seam. Mono text at
 * 12px is narrow, so short strings like the role need many repeats to span a
 * wide screen. The name is set at display size and needs far fewer.
 */
const REPEATS = { mono: 20, name: 6 } as const

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Static HTML for the overlay. Each track holds its run twice, because
 * `marquee-drift` translates by exactly half the track's width (the same
 * trick BottomMarquee uses for a seamless loop).
 *
 * The noscript style matters: without JS nothing would ever remove the
 * overlay, and it would cover the page forever.
 */
export function renderPreloaderMarkup(bands: readonly Band[]): string {
  const rows = bands
    .map((band, i) => {
      const repeats = band.emphasis ? REPEATS.name : REPEATS.mono
      const run = escapeHtml(
        Array.from({ length: repeats }, () => `${band.text} ${SEPARATOR} `).join(''),
      )
      const cls = band.emphasis ? 'preloader-band preloader-band--name' : 'preloader-band'
      return (
        `<div class="${cls}" data-dir="${band.direction}" style="--i:${i}">` +
        `<div class="preloader-track"><span>${run}</span><span>${run}</span></div>` +
        `</div>`
      )
    })
    .join('')

  return (
    `<div id="preloader" class="preloader" aria-hidden="true">${rows}` +
    `<div class="preloader-progress"></div></div>` +
    `<noscript><style>#preloader{display:none}</style></noscript>`
  )
}
