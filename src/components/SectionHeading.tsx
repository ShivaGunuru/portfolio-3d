interface SectionHeadingProps {
  /** Becomes the section's accessible name via aria-labelledby. */
  id: string
  /** The section title. Small and monospaced, but a real <h2>. */
  label: string
  /** Right-hand meta text. Decorative context, not a heading. */
  meta: string
}

/**
 * The rule + eyebrow that opens Work, About and Contact.
 *
 * The label is an <h2> rather than a styled <span>. Visually identical to the
 * prototype, but it gives each section a real accessible name and keeps the
 * document outline honest: h1 (hero) > h2 (section) > h3 (project).
 */
export function SectionHeading({ id, label, meta }: SectionHeadingProps) {
  return (
    <div className="mb-18 flex items-baseline justify-between border-t border-edge pt-5">
      <h2
        id={id}
        className="font-mono text-xs tracking-[0.2em] text-accent uppercase"
      >
        {label}
      </h2>
      <p className="font-mono text-xs tracking-[0.14em] text-dim uppercase">
        {meta}
      </p>
    </div>
  )
}
