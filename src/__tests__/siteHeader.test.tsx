import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { SiteHeader } from '../components/SiteHeader'

/**
 * A `//` comment written as a JSX child is not a comment: it renders as page
 * text. Wrapping the header in a fragment once turned a block of `//` notes
 * into a paragraph of visible text across the top of the live site, over the
 * wordmark and the nav. Comments inside JSX must be `{/* ... *\/}`.
 */
describe('SiteHeader', () => {
  it('renders no stray comment text', () => {
    const html = renderToStaticMarkup(<SiteHeader />)
    const text = html.replace(/<[^>]+>/g, ' ')
    expect(text).not.toMatch(/\/\//)
  })
})
