import { projects, work } from '../../content/site'
import type { Project } from '../../content/site'
import { SectionHeading } from '../SectionHeading'

function ProjectCard({ project, isLast }: { project: Project; isLast: boolean }) {
  const headingId = `${project.id}-heading`

  return (
    <article
      aria-labelledby={headingId}
      className={
        isLast
          ? 'grid gap-10 pb-10 lg:grid-cols-[minmax(280px,520px)_minmax(280px,1fr)] lg:gap-14'
          : 'mb-24 grid gap-10 border-b border-edge pb-24 lg:grid-cols-[minmax(280px,520px)_minmax(280px,1fr)] lg:gap-14'
      }
    >
      <div className="flex flex-col gap-[18px]">
        <h3
          id={headingId}
          className="font-display text-[clamp(1.875rem,3.2vw,2.75rem)] leading-[1.02] font-extrabold tracking-[-0.02em]"
        >
          {project.title}
        </h3>

        <p className="text-lg leading-snug font-light text-accent text-pretty sm:text-[19px]">
          {project.hook}
        </p>

        <ul className="mt-1.5 flex flex-wrap gap-2">
          {project.tags.map((tag) => (
            <li
              key={tag}
              className="border border-edge px-2.5 py-1.5 font-mono text-[11px] tracking-[0.1em] text-muted uppercase"
            >
              {tag}
            </li>
          ))}
        </ul>

        {project.status.kind === 'repo' ? (
          <a
            href={project.status.href}
            target="_blank"
            rel="noreferrer noopener"
            className="mt-1 font-mono text-[11px] tracking-[0.14em] text-accent uppercase transition-colors hover:text-fg"
          >
            ↳ {project.status.label}
          </a>
        ) : (
          <p className="mt-1 font-mono text-[11px] tracking-[0.14em] text-dim uppercase">
            {project.status.label}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-[26px] pt-2">
        {project.details.map((detail) => (
          <div key={detail.label} className="flex flex-col gap-[7px]">
            <h4 className="font-mono text-[11px] tracking-[0.18em] text-dim uppercase">
              {detail.label}
            </h4>
            <p className="max-w-140 text-base leading-relaxed font-light text-body text-pretty">
              {detail.body}
            </p>
          </div>
        ))}
      </div>
    </article>
  )
}

export function Work() {
  return (
    <section
      id="work"
      aria-labelledby="work-heading"
      className="page-shell relative z-10 pt-30 pb-10"
    >
      <SectionHeading id="work-heading" label={work.eyebrow} meta={work.meta} />

      {projects.map((project, index) => (
        <ProjectCard
          key={project.id}
          project={project}
          isLast={index === projects.length - 1}
        />
      ))}
    </section>
  )
}
