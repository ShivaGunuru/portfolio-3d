# Poster into lens: Hero design

**Date:** 22 October 2026
**Status:** Approved ("go implement it"), from studies 01 + 02 of the Inside the Frame artifact.

## Goal

One continuous Hero sequence. A poster lock-up plays out, then the camera pushes into the left lens of the subject's sunglasses, the screen goes to ink, the four project titles rise in, and six bands slide off onto the Work section.

## The sequence

The Hero pin grows from 100% to 250% of the viewport. Pin progress `p` drives:

| `p` | Phase | What moves |
|---|---|---|
| 0 to 0.55 | Poster | Frames scrub 1 to 36. The pale back name drifts left and the role band drifts right. |
| 0.55 to 0.9 | Push | The whole Hero (text, back name, portrait, band) scales into the lens as one CSS transform. Zoom is exponential and capped at 1.15x the zoom where the lens covers the viewport, so the cut to ink always lands at the end of the push. |
| 0.84 to 1 | Titles | Inside the lens: the four project titles rise into place, white on ink. |
| after the pin | Bands | As `#work` scrolls up from the bottom of the viewport to 35% from the top, six bands slide off alternately, revealing Work. |

The bands cannot open inside the pin. Work sits below the pinned Hero, so opening there would reveal an empty white Hero. The lens card is therefore a fixed overlay (portalled to `body`), and its bands are driven by a second ScrollTrigger on `#work`.

## Layers

All inside the pinned `#hero` section:

1. **Camera layer**, absolute, filling the section, `transform-origin: 0 0`. The push writes one `translate scale translate` transform to it.
   - **Back name**: `site.name`, Syne 800, the new `--color-poster` token, `aria-hidden`.
   - **Content grid**: the existing eyebrow, headline, subline and CTA as real DOM, plus the portrait box. The grid fills only the area above the band, so the band never covers the CTA.
   - **Portrait**: the existing sprite canvas, now with `mix-blend-mode: multiply` and **no bottom fade mask**. Its box is translated down so the chest cut sits inside the band. During the push, a hi-res still (`hero-lens-still.png`, 996x680, from `no bg 1.mp4` at 9.33s) replaces the canvas, so the lens stays sharp deeper into the zoom.
   - **Role band**: `site.role` repeated, white Syne on ink, `aria-hidden`, 200vw wide so its ends never come into view during the push.
2. **Lens card**: fixed, z-40 (above the header), `aria-hidden`. It holds six band strips, each containing a full copy of the card (eyebrow plus titles) clipped to its strip.

## Rules

- Copy comes only from `site.ts`: `site.name`, `site.role`, `work.eyebrow`, `work.meta`, `projects[].title`.
- The lens position comes from `hero-lens-still.json`, normalised to the still. Re-extracting the still means re-measuring it.
- Every per-frame write is a direct style write in one rAF loop. No React re-render per frame.
- No fades anywhere in the sequence. Switches between layers are hard swaps (`visibility`).
- **Compact (768px and under):** the Hero visual, back name and band are not rendered, there is no pin and no lens card. Unchanged from today.
- **Reduced motion:** no pin, no push, no lens card. The poster holds its representative still frame with the band and name static.

## Units

| File | Role |
|---|---|
| `src/hero/heroTimeline.ts` | Pure: phase mapping, cover zoom, push zoom, camera transform |
| `src/hooks/useHeroCamera.ts` | Measures the layout, runs the rAF driver, writes styles |
| `src/components/HeroLensCard.tsx` | The portalled ink card and its six bands |
| `src/components/sections/Hero.tsx` | Layer structure |
| `src/components/HeroCutout.tsx`, `HeroCutoutStage.tsx` | Fade mask removed, multiply blend added, box ref and still overlay |

## Testing

- `heroTimeline.test.ts`: phase boundaries; push zoom reaches the cover zoom before the push ends; the transform maps the lens point to the viewport centre at full pull.
- Content: the new copy is sourced from `site.ts` (covered by the existing tests).
- Browser, on the production preview: each phase at representative progress, the bands revealing Work, reverse scroll, a nav click to Work, and no console errors.
