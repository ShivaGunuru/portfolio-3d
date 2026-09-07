/**
 * The one place the site's legal pages (privacy, and whatever joins it
 * later) are reachable from. They are separate HTML entries, not sections
 * of the single-page app (see `vite.config.ts`), so they need a real `<a>`
 * with a real `href` here rather than a scroll-anchor like the nav's.
 */
export function SiteFooter() {
  return (
    <footer className="page-shell flex items-center justify-between border-t border-edge px-6 py-6 sm:px-gutter">
      <p className="font-mono text-[11px] tracking-[0.14em] text-faint uppercase">
        © {new Date().getFullYear()} Shiva Gunuru
      </p>
      <nav aria-label="Legal">
        <ul className="flex gap-6">
          <li>
            <a
              href="/privacy.html"
              className="font-mono text-[11px] tracking-[0.14em] text-faint uppercase transition-colors hover:text-accent"
            >
              Privacy
            </a>
          </li>
        </ul>
      </nav>
    </footer>
  )
}
