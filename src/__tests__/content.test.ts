import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import {
  about,
  contact,
  contactLinks,
  hero,
  nav,
  projects,
  site,
  work,
} from '../content/site'

/**
 * Guards the copy rules in CLAUDE.md that are otherwise enforced only by
 * remembering to check: no em dashes anywhere, and no empty or placeholder
 * strings reaching the page.
 */

const everyString: string[] = [
  site.name,
  site.role,
  site.title,
  site.description,
  site.email,
  hero.eyebrow,
  hero.headline,
  hero.subline,
  hero.cta.label,
  work.eyebrow,
  work.meta,
  about.eyebrow,
  about.meta,
  about.lead,
  ...about.body,
  contact.eyebrow,
  contact.meta,
  contact.headline,
  contact.signoff,
  ...nav.map((n) => n.label),
  ...contactLinks.map((l) => l.label),
  ...projects.flatMap((p) => [
    p.title,
    p.hook,
    ...p.tags,
    p.status.label,
    ...p.details.flatMap((d) => [d.label, d.body]),
  ]),
]

describe('site copy', () => {
  it('contains no em dashes', () => {
    const offenders = everyString.filter((s) => s.includes('—'))
    expect(offenders, `em dash found in: ${offenders.join(' | ')}`).toEqual([])
  })

  it('has no empty or whitespace-only strings', () => {
    expect(everyString.filter((s) => s.trim().length === 0)).toEqual([])
  })

  it('has no placeholder text left in', () => {
    const placeholder = /lorem ipsum|TODO|TBD|FIXME|xxx+/i
    expect(everyString.filter((s) => placeholder.test(s))).toEqual([])
  })

  it('keeps index.html metadata in step with the content module', () => {
    // These are duplicated into the HTML head for crawlers, which cannot run
    // the app. Drift between the two is invisible in the browser.
    const html = readFileSync(
      fileURLToPath(new URL('../../index.html', import.meta.url)),
      'utf8',
    )
    expect(html).toContain(site.title)
    expect(html).toContain(site.description)
    expect(html).not.toContain('—')
  })
})

describe('project links', () => {
  it('uses absolute https URLs for every repo link', () => {
    for (const project of projects) {
      if (project.status.kind !== 'repo') continue
      expect(project.status.href).toMatch(/^https:\/\//)
    }
  })

  it('uses a mailto or https scheme for every contact link', () => {
    for (const link of contactLinks) {
      expect(link.href).toMatch(/^(https:\/\/|mailto:)/)
    }
  })

  it('points every nav item at a section that exists in the content model', () => {
    // The nav hrefs are anchors; the sections they target are rendered by
    // components, so this checks the ids the app actually uses.
    const known = new Set(['#work', '#about', '#contact'])
    for (const item of nav) expect(known.has(item.href)).toBe(true)
  })
})
