import { useEffect, useState } from 'react'

import { nav, site } from '../content/site'

/**
 * Scroll distance after which the header commits to a solid background.
 *
 * Small on purpose. The point is to be clear of the page top before any real
 * content can reach the header, not to wait for a particular section.
 */
const SOLID_AFTER_PX = 40

export function SiteHeader() {
  const [solid, setSolid] = useState(false)

  useEffect(() => {
    // Lenis drives native window scroll rather than transforming a wrapper, so
    // a plain scroll listener sees every position it produces.
    const onScroll = () => setSolid(window.scrollY > SOLID_AFTER_PX)
    // Run once up front: a reload partway down the page (or a link straight to
    // #work) must start solid, not transparent over content.
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    // The background is opaque once scrolled, and there is no backdrop-blur.
    // Blur was what this used while the page was near-black, where smearing
    // dark violet under a dark header was invisible. Against white it turned
    // the display type passing underneath into grey mush directly behind the
    // wordmark. Opaque is the only treatment that reliably separates a fixed
    // bar from type this heavy; the hairline is what stops the white bar from
    // dissolving into the white page.
    <header
      className={`fixed inset-x-0 top-0 z-30 flex items-center justify-between border-b px-6 py-5 transition-colors duration-300 sm:px-gutter ${
        solid ? 'border-edge bg-bg' : 'border-transparent bg-transparent'
      }`}
    >
      {/* py-2 takes the tap targets from 15px tall to 32px. Nav links set in
          12px mono are a fussy thing to hit on a phone otherwise, and 24px is
          the floor WCAG suggests. The bar grows with them, 64px to 73px, which
          is no problem: the header is fixed, so it displaces no content, and
          the 6rem scroll-padding-top that keeps anchor links clear of it was
          already generous enough to cover the difference. */}
      <a
        href="#hero"
        className="py-2 font-mono text-xs tracking-[0.18em] text-fg uppercase transition-colors hover:text-accent"
      >
        {site.name}
      </a>

      <nav aria-label="Primary">
        <ul className="flex gap-6 sm:gap-[26px]">
          {nav.map((item) => (
            <li key={item.href}>
              <a
                href={item.href}
                className="py-2 font-mono text-xs tracking-[0.14em] text-muted uppercase transition-colors hover:text-accent"
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  )
}
