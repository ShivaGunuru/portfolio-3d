# CLAUDE.md

## Project

3D personal portfolio website for Shiva Gunuru, an AI engineer, built to support an active AI engineering job search. Four project case studies, an about section, and contact, with a 3D "head" visualization (points/particles, built from a parametric surface) as the visual centerpiece that reacts to scroll position.

## Stack

- Vite
- React
- TypeScript
- React Three Fiber (`@react-three/fiber`) + drei (`@react-three/drei`)
- GSAP with ScrollTrigger
- Lenis (smooth scroll)
- Tailwind CSS

## Source of truth: read before touching content or styling

- **[docs/content-inventory.md](docs/content-inventory.md)**: all site copy. Positioning, hero, four project case studies (hook/problem/approach/stack/result), about, contact links, SEO metadata. Read at the start of any task that touches content.
- **[docs/direction/](docs/direction/)**: the locked visual direction, a Claude Design handoff bundle. `docs/direction/project/Utterance - Portfolio.dc.html` is the pixel reference for the whole site (palette, type scale, spacing, section layout, copy placement). `head-stage.js` is the reference implementation of the 3D head (Three.js, parametric surface, "points" treatment, scroll-driven phase). Read at the start of any task that touches styling or layout. Treat it as locked: match it, don't reinterpret it.

### Copy precedence

The two documents overlap and **their wording differs**. The prototype's copy is the inventory's copy edited to fit the locked layout: tightened throughout, and restructured in About, where the lead line is a display pull-quote whose short length is load-bearing. So:

1. **Prototype wording wins where it exists.**
2. **Inventory is canonical for facts** (links, stack lists, claims) and for anything the prototype doesn't cover.
3. **Inventory wins on substantive conflict**, as opposed to phrasing.

**Never invent copy.** Every rendered word must trace back to one of those two documents. In practice this is enforced by `src/content/site.ts`: all copy lives there, and components read from it rather than holding string literals. Add copy to that module, not to JSX.

### No em dashes

**The site uses no em dashes (—) anywhere.** This is a hard rule and it overrides verbatim transcription.

Both source documents in `docs/` still contain em dashes, and they have deliberately not been rewritten so their provenance stays intact. **Strip them when transcribing.** Don't substitute a hyphen or an en dash; restructure the sentence instead, using a comma, colon, parenthesis, or a full stop, whichever fits the cadence. `src/content/site.ts` has worked examples of all four.

En dashes are fine in numeric ranges (`1–10 scale`). Arrows (`↳`, `→`) are part of the visual direction and stay.

Check before committing copy:

```bash
grep -n "—" src/content/site.ts index.html
```

## Design tokens

Tailwind v4 is CSS-first, so **there is no `tailwind.config.js`**. Every token is declared in a `@theme` block in **[src/index.css](src/index.css)**, which is the only file in the project where a hex value or font name may appear. Tailwind generates utilities from each token (`--color-bg` → `bg-bg`, `text-bg`) *and* emits it as a real CSS custom property, which is how the Three.js layer reads the same values via `getComputedStyle` instead of keeping a second copy of the palette.

Colors: `bg`, `bg-glow`, `fg`, `body`, `muted`, `dim`, `faint`, `accent`, `edge`, `head-fg`.
Fonts: `font-display` (Syne), `font-sans` (IBM Plex Sans), `font-mono` (IBM Plex Mono).

Read `src/index.css` for the values and what each is for. Note `edge` is the hairline/border token, not `border`, which would collide with Tailwind's own `border-*` utilities.

Fonts are **self-hosted via `@fontsource`**, never loaded from the Google Fonts CDN. A CDN request sends every visitor's IP to Google, which is live GDPR exposure for a site meant to be found by EU recruiters. Syne and IBM Plex Sans use variable builds; IBM Plex Mono has no variable build, so its 400/500 weights are imported individually.

**Never hardcode a color or font in a component.** Use the utilities, or read the custom property.

## Non-negotiables

- **Real DOM content.** Every section must have real, semantic HTML in the DOM independent of the canvas. Headings, paragraphs and links must exist and be readable/crawlable/accessible whether or not WebGL runs. The 3D canvas is a decorative/enhancement layer, never the only place content lives.
- **Respect `prefers-reduced-motion` everywhere.** GSAP/ScrollTrigger animations, Lenis smooth scroll, and any R3F/Three.js motion must check for and honor this media query, not just the CSS `scroll-behavior` fallback.
- **Mobile is a deliberate lighter experience**, not a shrunken desktop scene. Simplify or drop expensive 3D/scroll effects on mobile rather than scaling the same scene down.
- **No layout shift on load.** Fonts, canvas mounting, and async-loaded 3D assets must not cause CLS. Reserve space, use font-display strategies, etc.

## Working rules

- **Plan before executing** for any task touching more than 3 files. Produce a plan and wait for approval before making changes.
- **Ask before adding any new dependency.** Don't `npm install` anything not already in the stack list above without checking first.
