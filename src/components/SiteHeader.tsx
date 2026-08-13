import { nav, site } from '../content/site'

export function SiteHeader() {
  return (
    <header className="fixed inset-x-0 top-0 z-30 flex items-center justify-between px-6 py-5 backdrop-blur-sm sm:px-gutter">
      <a
        href="#hero"
        className="font-mono text-xs tracking-[0.18em] text-fg uppercase transition-colors hover:text-accent"
      >
        {site.name}
      </a>

      <nav aria-label="Primary">
        <ul className="flex gap-6 sm:gap-[26px]">
          {nav.map((item) => (
            <li key={item.href}>
              <a
                href={item.href}
                className="font-mono text-xs tracking-[0.14em] text-muted uppercase transition-colors hover:text-accent"
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
