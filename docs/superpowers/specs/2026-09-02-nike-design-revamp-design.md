# Nike design-language revamp

**Status:** approved by user, pending spec review
**Source:** `DESIGN-nike.md` (Nike design-system extraction, provided by user)
**Scope:** visual design system only — palette, typography treatment, shape, elevation, and per-section chrome. No content, copy, or interaction-mechanics changes.

## Goal

Re-skin the site from its current dark, violet-glow, outlined-button aesthetic to a light, high-contrast, restrained aesthetic borrowed from Nike's design language: near-monochrome chrome (white canvas, near-black ink, one soft neutral gray), pill-shaped solid CTAs, zero-radius/zero-shadow flat cards, extreme typographic contrast between a small number of huge display moments and a quiet body/UI tier, and a single reserved accent color used for genuine signal rather than decoration.

This is a **language adaptation, not a literal component transplant.** Nike's system is built for retail commerce — product cards, sale pricing, swatch dots, a shopping bag. None of that exists here, and none of it gets invented. What transfers is the underlying discipline, reinterpreted against this site's actual content: four project case studies, an about section, and contact links.

## Decisions already made (via brainstorming Q&A)

1. **Adapt the language, don't force literal components.** No fake "product cards," no swatch dots, no sale badges.
2. **Go light.** White canvas, near-black ink. The violet-glow dark palette is retired.
3. **Keep the About section's 3D generative field, recolor it.** It's a skill demonstration for an AI-engineer portfolio, not decorative chrome, so it survives the "Nike has no glow" rule as a deliberate exception — restyled to work against the new light ground rather than removed.
4. **Keep the current typefaces** (Syne display, IBM Plex Sans body, IBM Plex Mono labels). Adopt Nike's *scale and contrast* discipline, not its specific fonts.
5. **Drop the bottom marquee's chromatic-glitch effect; keep the plain scrolling band.** Nike's system has no glitch/decorative-motion chrome.

## Non-negotiables carried over unchanged

These are locked in `CLAUDE.md` and this revamp does not touch them:
- Every section stays real, semantic DOM content independent of any canvas.
- `prefers-reduced-motion` is honored everywhere it already is; no new motion is added that isn't already gated.
- Mobile (<768px) keeps getting zero 3D, not a shrunk version.
- No layout shift on load.
- Every text color clears WCAG AA (4.5:1) against its background — this directly shapes the color values below.
- No em dashes anywhere.
- No new npm dependencies. This revamp needs none: same fonts, no new icons (we are not building cart/wishlist/swatch UI), Tailwind's existing `rounded-full`/`rounded-none` utilities cover the shape system.

## Foundation

### Colors

Nike's own palette is the starting point, but not copied verbatim: several of Nike's lighter grays fail this project's AA-on-white requirement (`stone` #9e9ea0 measures ~2.7:1 against white, well under 4.5:1). The ladder below reuses Nike's `ink`/`charcoal`/`ash`/`mute` where they already pass, and fills one gap (`dim`) with a computed intermediate value, keeping the existing site's "ordered by contrast, each tier passes AA" methodology (see `index.css`'s current comment block, which will be updated to document this new ladder the same way).

| Token | Value | Source | Contrast vs. white |
|---|---|---|---|
| `--color-bg` | `#ffffff` | Nike `canvas` | — |
| `--color-bg-soft` | `#f5f5f5` | Nike `soft-cloud` | — (surface, not text) |
| `--color-fg` | `#111111` | Nike `ink` | 18.9:1 |
| `--color-body` | `#39393b` | Nike `charcoal` | 11.5:1 |
| `--color-muted` | `#4b4b4d` | Nike `ash` | 8.7:1 |
| `--color-dim` | `#656567` | computed, between Nike `ash` and `mute` | 5.8:1 |
| `--color-faint` | `#707072` | Nike `mute` | 4.9:1 |
| `--color-accent` | `#e8a33d` | unchanged from current site | 2.5:1 (decorative/large-text use only, same as today) |
| `--color-edge` | `#cacacb` | Nike `hairline` | — (divider, not text) |
| `--color-head-fg` | tuned during implementation | — | — |
| `--color-head-glow` | tuned during implementation | — | — |

Role reassignment from the current dark-theme names: `fg` = headlines/primary text, `body` = case-study paragraph copy, `muted` = nav links/secondary labels, `dim` = eyebrow/tertiary meta, `faint` = lowest-emphasis (footer sign-off). Same roles as today, new values, same monotonic-contrast pattern.

**Accent gets used far less often.** Today it colors every section eyebrow (WORK / ABOUT / CONTACT) — repeated, decorative use, which is exactly what Nike's "reserve chromatic energy for genuine signal" rule argues against. After this revamp, accent is reserved for: link/nav hover states, the active nav-section underline, and the project "repo available" link (the closest thing this site has to Nike's availability/sale signal). Section eyebrows move to a neutral gray.

**The 3D field's colors are a starting point, not a final answer.** `HarmonicField` already reads `baseColor`/`accentColor`/`glowColor` from `--color-head-fg`/`--color-accent`/`--color-head-glow` via `getComputedStyle` (see `HeadStage.tsx`), so retuning is a token-value change with no component code change — but additive-blend glow behaves very differently composited over white than over near-black, and picking the right values needs real visual iteration against the actual field, not a guess written into a spec. The implementation plan should treat this as its own short loop: render, measure, adjust — the same way earlier work in this project tuned point brightness and hover-glow by rendering and measuring rather than picking numbers upfront.

### Typography

No new font files. The display/body/mono family stack stays exactly as declared in `index.css`. What changes is discipline, not typeface:

- Keep the existing responsive `clamp()` pattern (it already matches Nike's own documented desktop→tablet→mobile scale-down better than a fixed px value would).
- Push the contrast between the display tier and body tier further apart where a section's copy allows it, matching Nike's "billboard above, catalog below" effect.
- **Do not force uppercase onto full sentences.** The Hero H1 ("AI engineer building systems that put LLMs to real work") is a complete sentence, not a short campaign lockup like Nike's "TRAIL READY" — uppercasing it at display scale would hurt legibility and is not how Nike's own system actually uses that tier. It gets bigger and bolder, not uppercase.
- Project titles in Work ("AI Farmer Helpline", "Bike Rental Platform") *are* short, punchy, noun-phrase labels — exactly what Nike's display tier is for. These get the big/bold/uppercase treatment.
- No copy changes anywhere. `src/content/site.ts` is untouched; this is a styling pass, and this project's own non-negotiable is that copy traces back to the documented content sources, not to a design revamp.

### Shape

- Cards and containers (project entries, the About field's container) go to zero radius, matching Nike's flat product-card treatment.
- Buttons become solid ink-filled pills (`rounded-full`), replacing the current outlined/ghost CTA style. This is the biggest single visual shift in the interactive chrome.
- Tag/status chips move from sharp-cornered bordered rectangles to pill chips.
- All of this uses Tailwind's existing `rounded-full` / `rounded-none` utilities — no new radius tokens needed.

### Elevation

Zero box-shadow anywhere in the 2D chrome, matching Nike's flat system. Hairline dividers (`--color-edge`) remain the only separator device. The existing `:focus-visible` outline stays untouched — that's an accessibility requirement, not a decorative shadow, and Nike's own spec doesn't cover focus states at all.

### Spacing

No new spacing tokens. Nike's 8px-based scale doesn't map cleanly onto this codebase's existing arbitrary-value Tailwind pattern (`gap-[26px]`, `mb-18`, etc.), and introducing a parallel token system the codebase doesn't otherwise use would be scope creep. Instead, individual components get tightened toward Nike's denser proportions (chip padding, metadata-row gaps) using the same arbitrary-value pattern already established throughout the codebase.

## Per-section treatment

### Header + nav (`SiteHeader.tsx`)
Structurally unchanged. Recolored for the light ground. The active-section indicator (if/when added — currently there isn't one) would be a 2px ink underline per Nike's pattern, not a color fill.

### Hero (`Hero.tsx`)
Headline copy unchanged (see Typography above). "See the work" becomes a solid ink pill button (Nike `button-primary` shape: full rounded, solid fill, no border). The email link stays a plain text link. The video cutout (`HeroCutoutStage`/`HeroCutout`) is untouched at the code level — no re-bake, no changes to the chroma-key pipeline, scroll-lock, or bottom fade mask. It already reads as editorial photography, which fits Nike's photography-first hero directly; the bottom fade will dissolve into white instead of near-black, which is expected to read cleanly (a photographic subject fading to a white page edge is a standard, unremarkable treatment) but is worth a visual check once the surrounding palette actually changes, not before.

### Work (`Work.tsx`)
Project titles get the big/bold/uppercase display treatment (see Typography). Tags move to pill chips. Cards go fully flat — no bordered box, content sits directly on white, hairline dividers between projects (already the pattern today via `border-b border-edge`, kept). The repo-available/in-progress status line is the one place accent color signals something, mirroring Nike's availability convention.

### About (`About.tsx`, `HarmonicField.tsx`)
Copy and layout unchanged. The 3D field's colors are retuned per the Foundation section above — this is the one part of the spec that isn't fully nailed down yet and will be resolved by rendering and measuring during implementation, not guessed here.

### Contact (`Contact.tsx`)
Smallest change in the whole revamp — it's already close to Nike's quiet footer link-list pattern (mono links, hairline separators). Recolored only, no structural change.

### Bottom marquee (`BottomMarquee.tsx`, `index.css`)
Keeps its horizontal scroll. The `marquee-glitch-warm`/`marquee-glitch-cool` keyframes and the `::before`/`::after` chromatic-split layers are removed. `marquee-glow`'s text-shadow glow is also dropped, in the same spirit — Nike's motion register is calm, and a glow effect makes little sense once the glitch it was paired with is gone. The `marquee-drift` scroll keyframe (the actual scrolling motion) stays.

## Testing / verification plan

- The existing WCAG-contrast test in the vitest suite must be updated with the new token values above and must pass — this is the real safety net for the contrast math in this spec, not a substitute for it.
- Em-dash, link-scheme, and reduced-motion tests are expected to be unaffected by a palette/component-styling change; re-run and confirm still green rather than assuming.
- No automated test covers the 3D field's visual brightness/legibility — that needs the same render-and-measure verification pattern used earlier in this project for the Hero field and hover-glow tuning, not just a code review.
- Visual check across breakpoints (desktop/tablet/mobile) after implementation, since `prefers-reduced-motion` and the sub-768px 3D-hide behavior both need to be reconfirmed working under the new styles, not just visually similar.

## Explicitly out of scope

- Any change to `src/content/site.ts` (copy, project data, links).
- The Hero video-cutout bake pipeline, chroma-key logic, scroll-lock mechanics, or bottom-fade-mask implementation.
- Lenis/GSAP scroll infrastructure, `usePinnedStage`, `Reveal`, `TypeOnScroll`'s animation mechanics.
- Adding any literal Nike retail component (product cards, swatch dots, sale badges, shopping bag, filters) that doesn't correspond to something this site actually has.
- New dependencies of any kind.
