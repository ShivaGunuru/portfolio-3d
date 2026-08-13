import { contact, contactLinks } from '../../content/site'
import { SectionHeading } from '../SectionHeading'

export function Contact() {
  return (
    <section
      id="contact"
      aria-labelledby="contact-heading"
      className="page-shell relative z-10 flex min-h-[70svh] flex-col justify-center pt-30 pb-35"
    >
      <SectionHeading
        id="contact-heading"
        label={contact.eyebrow}
        meta={contact.meta}
      />

      <div className="flex flex-col gap-9">
        <h3 className="max-w-190 font-display text-[clamp(2.25rem,5vw,4.25rem)] leading-none font-extrabold tracking-[-0.025em] text-balance">
          {contact.headline}
        </h3>

        <ul className="flex flex-wrap gap-x-16">
          {contactLinks.map((link) => (
            <li key={link.href} className="min-w-70 flex-1 border-b border-edge">
              <a
                href={link.href}
                {...(link.href.startsWith('http')
                  ? { target: '_blank', rel: 'noreferrer noopener' }
                  : {})}
                className="block py-3.5 font-mono text-[13px] tracking-[0.1em] uppercase transition-colors hover:text-accent"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <p className="mt-10 font-mono text-[11px] tracking-[0.14em] text-faint uppercase">
          {contact.signoff}
        </p>
      </div>
    </section>
  )
}
