/**
 * The one place the site's legal pages (privacy, terms, cookies) are
 * reachable from. They are separate HTML entries, not sections of the
 * single-page app (see `vite.config.ts`), so they need a real `<a>` with a
 * real `href` here rather than a scroll-anchor like the nav's.
 */
export function SiteFooter() {
  return (
    <footer className="page-shell flex items-center justify-between border-t border-edge px-6 py-6 sm:px-gutter">
      <p className="font-mono text-[11px] tracking-[0.14em] text-faint uppercase">
        © {new Date().getFullYear()} Shiva Gunuru
      </p>
      <nav aria-label="Legal">
        {/* The links carry vertical padding (cancelled by an equal negative
            margin, so the footer's height is unchanged) to give each one a
            26px tap target. Set in 11px type they were 14px tall, well under
            the 24px WCAG minimum. */}
        <ul className="flex gap-6">
          <li>
            <a
              href="/privacy.html"
              className="-my-1.5 inline-block py-1.5 font-mono text-[11px] tracking-[0.14em] text-faint uppercase transition-colors hover:text-accent"
            >
              Privacy
            </a>
          </li>
          <li>
            <a
              href="/terms.html"
              className="-my-1.5 inline-block py-1.5 font-mono text-[11px] tracking-[0.14em] text-faint uppercase transition-colors hover:text-accent"
            >
              Terms
            </a>
          </li>
          <li>
            <a
              href="/cookies.html"
              className="-my-1.5 inline-block py-1.5 font-mono text-[11px] tracking-[0.14em] text-faint uppercase transition-colors hover:text-accent"
            >
              Cookies
            </a>
          </li>
        </ul>
      </nav>
    </footer>
  )
}
