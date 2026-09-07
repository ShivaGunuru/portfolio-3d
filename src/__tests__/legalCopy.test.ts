import { describe, expect, it } from 'vitest'

import { cookiesPolicy, privacyPolicy, termsOfUse } from '../content/legal'
import type { LegalDocument } from '../content/legal'

/**
 * Same guard as content.test.ts, applied to the legal pages instead of the
 * main site copy: no em dashes, no empty strings, no placeholder text. Legal
 * copy lives in its own module and its own HTML entries (see
 * vite.config.ts), so content.test.ts's own `everyString` array never sees
 * it; without this file, a placeholder left in a policy page would ship
 * silently.
 */

function everyString(doc: LegalDocument): string[] {
  return [
    doc.title,
    doc.updated,
    doc.intro,
    ...doc.sections.flatMap((section) => [section.heading, ...section.body]),
  ]
}

const documents: Record<string, LegalDocument> = {
  privacyPolicy,
  termsOfUse,
  cookiesPolicy,
}

describe('legal page copy', () => {
  for (const [name, doc] of Object.entries(documents)) {
    describe(name, () => {
      const strings = everyString(doc)

      it('contains no em dashes', () => {
        const offenders = strings.filter((s) => s.includes('—'))
        expect(offenders, `em dash found in: ${offenders.join(' | ')}`).toEqual([])
      })

      it('has no empty or whitespace-only strings', () => {
        expect(strings.filter((s) => s.trim().length === 0)).toEqual([])
      })

      it('has no placeholder text left in', () => {
        const placeholder = /lorem ipsum|TODO|TBD|FIXME|xxx+/i
        expect(strings.filter((s) => placeholder.test(s))).toEqual([])
      })

      it('has at least one section', () => {
        expect(doc.sections.length).toBeGreaterThan(0)
      })
    })
  }
})
