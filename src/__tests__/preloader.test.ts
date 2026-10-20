import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { projects, site } from '../content/site'
import { BAND_COUNT, NAME_BAND, buildBands } from '../preloader/bands'
import { PRELOADER_PLACEHOLDER, renderPreloaderMarkup } from '../preloader/markup'

/**
 * The preloader's words are written into index.html at build time, so they
 * never pass through content.test.ts's `everyString`. This file holds them to
 * the same rules: nothing invented, no em dashes.
 */

describe('preloader bands', () => {
  const bands = buildBands(site.name, site.role, projects)

  it('builds one band per row of the overlay', () => {
    expect(bands).toHaveLength(BAND_COUNT)
  })

  it('puts the name in the emphasised centre band, and only there', () => {
    expect(bands[NAME_BAND]).toMatchObject({ text: site.name, emphasis: true })
    expect(bands.filter((b) => b.emphasis)).toHaveLength(1)
  })

  it('takes every band from the content module rather than inventing copy', () => {
    const sourced = new Set([site.name, site.role, ...projects.map((p) => p.title)])
    for (const band of bands) expect(sourced.has(band.text)).toBe(true)
  })

  it('alternates direction band to band', () => {
    for (let i = 1; i < bands.length; i++) {
      expect(bands[i].direction).not.toBe(bands[i - 1].direction)
    }
  })

  it('refuses to build with too few project titles rather than render an empty band', () => {
    expect(() => buildBands('Name', 'Role', [{ title: 'Only one' }])).toThrow()
  })
})

describe('preloader markup', () => {
  const html = renderPreloaderMarkup(buildBands(site.name, site.role, projects))

  it('escapes HTML in band text', () => {
    const out = renderPreloaderMarkup([{ text: '<b>&"', emphasis: false, direction: 'left' }])
    expect(out).toContain('&lt;b&gt;&amp;&quot;')
    expect(out).not.toContain('<b>')
  })

  it('is hidden from assistive tech, and from visitors without JS', () => {
    expect(html).toContain('aria-hidden="true"')
    expect(html).toContain('<noscript>')
  })

  it('contains no em dashes', () => {
    expect(html).not.toContain('—')
  })

  it('has a placeholder in index.html for the build to replace', () => {
    const indexHtml = readFileSync(
      fileURLToPath(new URL('../../index.html', import.meta.url)),
      'utf8',
    )
    expect(indexHtml).toContain(PRELOADER_PLACEHOLDER)
  })
})
