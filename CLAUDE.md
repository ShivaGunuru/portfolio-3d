# CLAUDE.md

## Project

3D personal portfolio website for Shiva Gunuru, an AI engineer, built to support an active AI engineering job search. Four project case studies, an about section, and contact — with a 3D "head" visualization (points/particles, built from a parametric surface) as the visual centerpiece that reacts to scroll position.

## Stack

- Vite
- React
- TypeScript
- React Three Fiber (`@react-three/fiber`) + drei (`@react-three/drei`)
- GSAP with ScrollTrigger
- Lenis (smooth scroll)
- Tailwind CSS

## Source of truth — read before touching content or styling

- **[docs/content-inventory.md](docs/content-inventory.md)** is the single source of truth for all site copy: positioning, hero copy, all four project case studies (hook/problem/approach/stack/result), about copy, contact links, and SEO metadata. Read it at the start of any task that touches content. **Never invent or paraphrase copy when the inventory already has it** — use it verbatim. It also lists open items (e.g. Project 1 has no repo yet, LLM/TTS choice undecided) — don't silently resolve these; flag them back to the user.
- **[docs/direction/](docs/direction/)** holds the locked visual direction — a Claude Design handoff bundle. The primary reference is `docs/direction/project/Utterance - Portfolio.dc.html`, which is the pixel-reference HTML/CSS prototype for the whole site (palette, type scale, spacing, section layout, copy placement). `head-stage.js` is the reference implementation of the 3D head visualization (Three.js, parametric surface, "points" treatment, scroll-driven phase). Read this directory at the start of any task that touches styling or layout. Treat it as locked: match it, don't reinterpret it.

## Design tokens (from direction)

Typefaces (Google Fonts: Syne, IBM Plex Sans, IBM Plex Mono):

```js
// tailwind.config.js — theme.extend
fontFamily: {
  display: ['Syne', 'sans-serif'],       // headings — weights 400/600/800, tight tracking, negative letter-spacing
  sans: ['IBM Plex Sans', 'sans-serif'], // body copy — weights 300/400/500
  mono: ['IBM Plex Mono', 'monospace'],  // labels, nav, tags, meta — wide letter-spacing (0.1–0.2em), uppercase
}
```

Palette (deep space-navy background, warm off-white text, single orange accent, purple family for hierarchy):

```js
// tailwind.config.js — theme.extend.colors
colors: {
  bg: '#0B0A14',        // page background
  'bg-glow': '#1B1740', // radial gradient center behind hero, layered over bg
  fg: '#E6E3DC',        // primary text (warm off-white)
  accent: '#E8A33D',    // orange — links on hover, active nav, section labels, selection highlight
  border: '#221E3C',    // hairline dividers, tag/pill borders
  muted: '#9A95C8',     // nav links, subline text, secondary labels
  body: '#C9C5E4',      // problem/approach/result paragraph copy
  dim: '#6E6AA8',       // section eyebrow labels, tertiary meta text
  faint: '#413C6E',      // lowest-emphasis text (e.g. footer sign-off line)
  'head-fg': '#B9B4E8',  // 3D head visualization point color
}
```

Selection color is `accent` on `bg` (`::selection { background: #E8A33D; color: #0B0A14 }`).

## Non-negotiables

- **Real DOM content.** Every section must have real, semantic HTML in the DOM independent of the canvas — headings, paragraphs, links must exist and be readable/crawlable/accessible whether or not WebGL runs. The 3D canvas is a decorative/enhancement layer, never the only place content lives.
- **Respect `prefers-reduced-motion` everywhere** — GSAP/ScrollTrigger animations, Lenis smooth scroll, and any R3F/Three.js motion must check for and honor this media query, not just the CSS `scroll-behavior` fallback.
- **Mobile is a deliberate lighter experience**, not a shrunken desktop scene. Simplify or drop expensive 3D/scroll effects on mobile rather than scaling the same scene down.
- **No layout shift on load.** Fonts, canvas mounting, and async-loaded 3D assets must not cause CLS — reserve space, use font-display strategies, etc.

## Working rules

- **Plan before executing** for any task touching more than 3 files — produce a plan and wait for approval before making changes.
- **Ask before adding any new dependency** — don't `npm install` anything not already in the stack list above without checking first.
