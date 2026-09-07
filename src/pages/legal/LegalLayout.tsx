import type { ReactNode } from 'react'

import { site } from '../../content/site'
import type { LegalDocument } from '../../content/legal'

/**
 * Shared chrome for every legal page: privacy, terms, cookies.
 *
 * These pages are separate HTML entries (see `vite.config.ts`'s multi-page
 * `build.rollupOptions.input`), not routes inside the main single-page app,
 * so they get their own minimal header rather than importing `SiteHeader`
 * wholesale: there is no scroll-pinned Hero or nav-highlighting logic here to
 * reuse, only the need to get back home and to know whose site this is.
 */
export function LegalLayout({
  doc,
  children,
}: {
  doc: LegalDocument
  children?: ReactNode
}) {
  return (
    <div className="min-h-svh bg-bg text-fg">
      <header className="page-shell flex items-center justify-between px-6 py-5 sm:px-gutter">
        <a
          href="/"
          className="font-mono text-xs tracking-[0.18em] text-fg uppercase transition-colors hover:text-accent"
        >
          {site.name}
        </a>
        <a
          href="/"
          className="font-mono text-xs tracking-[0.14em] text-muted uppercase transition-colors hover:text-accent"
        >
          Back to site
        </a>
      </header>

      <main className="page-shell px-6 py-16 sm:px-gutter">
        <h1 className="font-display text-[clamp(2rem,4.5vw,3.25rem)] leading-[1.02] font-extrabold tracking-[-0.02em] text-balance">
          {doc.title}
        </h1>
        <p className="mt-3 font-mono text-xs tracking-[0.14em] text-dim uppercase">
          Last updated {doc.updated}
        </p>

        <p className="mt-10 max-w-165 text-[17px] leading-[1.65] font-light text-body text-pretty">
          {doc.intro}
        </p>

        <div className="mt-14 flex flex-col gap-12">
          {doc.sections.map((section) => (
            <section key={section.heading} className="flex flex-col gap-3">
              <h2 className="font-mono text-xs tracking-[0.18em] text-dim uppercase">
                {section.heading}
              </h2>
              {section.body.map((paragraph) => (
                <p
                  key={paragraph.slice(0, 40)}
                  className="max-w-165 text-[17px] leading-[1.65] font-light text-body text-pretty"
                >
                  {paragraph}
                </p>
              ))}
            </section>
          ))}
        </div>

        {children}
      </main>
    </div>
  )
}
