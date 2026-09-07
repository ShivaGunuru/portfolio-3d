# Site Trust and Compliance Checklist

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to work this checklist one task at a time. Steps use checkbox (`- [ ]`) syntax for tracking. **Do not attempt more than one task per session.**

**Goal:** Work through a pre-launch trust/compliance/accessibility checklist (sourced from an Instagram Reel by @yatesvids, extracted 2026-09-04) against this actual site, honestly. Every item is checked against the real codebase before any content is written; nothing is fabricated to satisfy a checkbox.

**Source:** The Reel's caption was "Hey Claude I don't want my vibecoded website to get sued... #vibecoding #vibecode". Its checklist stacks 19 items on screen as the creator talks, ending on the card "Make No Mistakes", a joke aimed at the exact failure mode this document exists to avoid: asking an AI to do 19 unrelated things in one prompt guarantees mistakes. This plan is the antidote, one isolated task at a time.

## Ground truth, verified against this repo on 2026-09-04

Before writing a word of policy copy, the codebase was audited so nothing below is guessed:

- No `<form>` element exists anywhere in `src/`.
- No cookies, `localStorage`, or `sessionStorage` are read or written anywhere in `src/`.
- No analytics, tracking pixel, or third-party script of any kind is loaded (grepped for gtag, analytics, pixel, hotjar, clarity, segment, mixpanel, posthog: zero hits).
- No `<iframe>` or third-party embed exists.
- Fonts are self-hosted via `@fontsource`, never the Google Fonts CDN (documented in CLAUDE.md, re-verified here); each package ships its own `LICENSE` file in `node_modules`.
- The Hero video and every project detail are the site owner's own work and words; there are no testimonials, reviews, or fabricated metrics anywhere in `src/content/site.ts`.
- Every numeric claim in the Work section (e.g. the AI Voice Agent project's benchmark percentages) traces to a cited, public GitHub repository, not to marketing copy.
- The site is a single individual's portfolio, not a registered business; there is no commerce, no payment processing, no user accounts.
- Hosting is Vercel (see `vercel.json`); Vercel's own infrastructure necessarily processes standard connection metadata to serve any page, governed by Vercel's own privacy policy, not this site's code.

This changes what several checklist items actually require. Noted per item below.

## Global Constraints

- No em dashes anywhere in code, comments, or copy (existing project-wide rule, `grep -n "—"`).
- No new npm dependencies without asking first (CLAUDE.md). Any new page must be reachable without adding a router.
- No fabricated claims. If an item requires a fact only the site owner has (a registered legal entity, a specific jurisdiction's registration), do not invent one. State the true, verifiable situation instead (an individual operating a personal, non-commercial site).
- No placeholder text (`TODO`, `TBD`, lorem ipsum) reaches shipped copy, per the existing `content.test.ts` convention. Every new content module gets the same em-dash/placeholder/empty-string test coverage that module already gives `src/content/site.ts`.
- Match the site's existing design tokens and type scale; no new hex values or fonts outside `src/index.css`.
- WCAG AA throughout, matching the existing `palette.test.ts` contrast bar.

---

### Task 1: Privacy Policy page

**Status: real and required.** The site processes no personal data automatically, but a Privacy Policy is still the correct place to say so, and to disclose what a visitor's own choice to email or follow a linked profile implies.

**Files:**
- Create: `src/content/legal.ts` (privacy policy copy, structured `{ title, updated, sections: [{heading, body}] }`)
- Create: `src/pages/legal/LegalLayout.tsx` (shared chrome: header, back link, prose container, used by this and future legal pages)
- Create: `src/pages/legal/PrivacyPolicy.tsx`
- Create: `src/pages/legal/privacy-main.tsx` (mounts `<PrivacyPolicy />` into `#root`, same shape as `src/main.tsx`)
- Create: `privacy.html` (root-level, clones `index.html`'s head essentials, points at `privacy-main.tsx`)
- Modify: `vite.config.ts` (add `build.rollupOptions.input` listing both `index.html` and `privacy.html`; without this, only `index.html` builds and `/privacy` 404s in production)
- Create: `src/components/SiteFooter.tsx` (small mono link row: Privacy, home)
- Modify: `src/App.tsx` (render `<SiteFooter />` after `<BottomMarquee />`)
- Create: `src/__tests__/legalCopy.test.ts` (em dash, placeholder, non-empty checks on `src/content/legal.ts`, mirroring `content.test.ts`)

No new dependency: routing is plain Vite multi-page output plus a static link, not a router library.

- [x] Write `src/content/legal.ts` with the privacy policy content, honestly reflecting the ground truth above (no cookies, no tracking, no data collection beyond a visitor's own voluntary email/social contact, hosting disclosure with a link to Vercel's actual privacy policy).
- [x] Write `src/__tests__/legalCopy.test.ts` covering that content (no em dashes, no placeholders, no empty strings).
- [x] Build `LegalLayout.tsx` and `PrivacyPolicy.tsx` from existing design tokens (`font-display`, `font-mono`, `text-body`, `text-dim`, `bg-bg`, `border-edge`), with a working "back to home" link and an `<h1>` for a real document outline.
- [x] Add `privacy.html` + `privacy-main.tsx`, wire `vite.config.ts`'s multi-page `input`.
- [x] Add `SiteFooter.tsx` with a link to `/privacy`, mount it in `App.tsx`.
- [x] Run `npm test`, `npm run typecheck`, `npm run build`; confirm `dist/privacy.html` exists in the build output.
- [x] Commit.

---

### Task 2: Terms of Use page

**Status: real and required.** Even a non-commercial site benefits from a short terms page: no warranty on content accuracy, links to third-party profiles the owner does not control, no license granted to reproduce site content or the 3D field's code without permission.

**Files:**
- Modify: `src/content/legal.ts` (add terms content)
- Create: `src/pages/legal/TermsOfUse.tsx`, `src/pages/legal/terms-main.tsx`
- Create: `terms.html`
- Modify: `vite.config.ts` (add `terms.html` to `input`)
- Modify: `src/components/SiteFooter.tsx` (add the Terms link)
- Modify: `src/__tests__/legalCopy.test.ts` (cover the new content)

- [x] Write terms content: content provided "as is", no warranty of accuracy or availability, external links (GitHub, LinkedIn, Instagram, the AI Voice Agent repo) are not controlled by the site owner and are governed by their own terms, no reproduction of site content/design/3D field code without permission, governing assumption is the owner's own jurisdiction (name it honestly rather than guessing a jurisdiction).
- [x] Build the page from `LegalLayout`, following Task 1's pattern exactly.
- [x] Wire the new HTML entry and footer link.
- [x] Run the full verification suite from Task 1's last step.
- [x] Commit.

---

### Task 3: Cookies Policy page

**Status: real, and unusually short, because it is true.** The honest content is "this site sets no cookies", which is worth stating explicitly rather than omitting, since a missing cookies policy reads as an oversight while a policy that plainly says "none" reads as verified.

**Files:**
- Modify: `src/content/legal.ts`
- Create: `src/pages/legal/CookiesPolicy.tsx`, `src/pages/legal/cookies-main.tsx`
- Create: `cookies.html`
- Modify: `vite.config.ts`, `src/components/SiteFooter.tsx`, `src/__tests__/legalCopy.test.ts`

- [x] Write cookies content: no first-party cookies are set by this site's own code (true per the grep above); note that the hosting provider's own edge network may log standard request metadata regardless of any code on this site, same as any web host, with a link to Vercel's own privacy policy for specifics; commit to updating this page the day that ever changes.
- [x] Build, wire, verify, commit, following Tasks 1 and 2's pattern.

---

### Task 4: Accessibility audit pass

**Status: partially already covered.** `palette.test.ts` already enforces WCAG AA contrast on every colour token. This task covers what that test cannot: real keyboard navigation, alt text, and button/label clarity, checked by hand in a browser.

**Files:** none known in advance; fix forward wherever the audit finds a gap. Likely candidates based on a static read: the Hero cutout canvas and About field canvas are `aria-hidden`, already correct per CLAUDE.md; the skip-to-content link in `App.tsx` already exists; nav links already have real link text (no icon-only buttons found in a static read).

- [x] Tab through the entire page with a keyboard only (no mouse): confirm every interactive element (nav links, the "See the work" CTA, project repo links, contact links, the new legal-page links from Tasks 1 to 3) is reachable in a sensible order and shows a visible focus state.
- [x] Confirm every `<img>` in the shipped site (there are very few; most visuals are canvas-based and already `aria-hidden`) has correct alt text, or is marked decorative if purely ornamental.
- [x] Run an automated pass (axe or Lighthouse accessibility) against the built site and fix anything it flags that the above two checks did not already catch.
- [x] Run the full verification suite.
- [x] Commit, or record "no changes needed" if the audit found nothing, per this plan's own no-fabrication rule: do not invent a change to justify a commit.

**Audit findings, 2026-09-08. No code changes made; none were needed.**

- **Keyboard reachability and focus visibility.** Every interactive element on the home page and all three legal pages is reachable and shows a visible `:focus-visible` outline (`2px solid var(--color-accent)`, defined once in `src/index.css` and applied sitewide with no overrides). Confirmed with real hardware-simulated Tab key presses against the actual production build (`npm run preview`, not the dev server), from a freshly opened browser tab with no prior mouse interaction, and captured in a screenshot showing the outline rendered on the Privacy page's "Back to site" link.

  Two false leads were chased and ruled out before that clean result, recorded here so they are not rediscovered as if new:
  - A synthetic Tab keypress dispatched by the browser-automation tool used for this audit inconsistently skipped between 0 and 5 elements from a nominally identical starting state across repeated trials. That inconsistency, correlated with unrelated prior mouse-click position rather than DOM order, is a property of the automation harness's synthetic key dispatch, not of the site: real, hardware-driven Tab presses did not reproduce it. A hypothesis that Tailwind v4's `sr-only` (`clip-path: inset(50%)`) was the cause was tested directly by switching the skip link to the older `clip: rect(0,0,0,0)` technique; the anomaly persisted identically, disproving the hypothesis, so that change was reverted rather than kept as an unearned "fix".
  - `Element.focus({ focusVisible: true })`, used to probe focus styling without relying on the flaky synthetic Tab key, appeared to show no outline on the legal pages. This tracked the browser's own last-input-modality state, not a page-specific CSS gap: real mouse clicks made via the automation tool in between test calls, in the same browser tab, correctly flipped that state away from "keyboard-like", which is exactly what `:focus-visible` is designed to do. A fresh tab with keyboard-only input showed the outline correctly on every page tested.

- **Alt text.** Zero `<img>` elements exist anywhere in `src/` (`grep -rn "<img" src/` returns nothing), so there is nothing to caption. Both canvas-based visuals (`src/components/HeroCutoutStage.tsx`, `src/three/Stage.tsx`) already carry `aria-hidden="true"`, confirmed by reading both files.

- **Automated pass.** Lighthouse accessibility, run against the actual production build (`npm run build && npm run preview`), not the dev server:

  | Page | Device | Accessibility |
  |---|---|---:|
  | `/` | desktop | 100 |
  | `/` | mobile | 100 |
  | `/privacy.html` | desktop | 100 |
  | `/terms.html` | desktop | 100 |
  | `/cookies.html` | desktop | 100 |

  The only failing audits anywhere were `cumulative-layout-shift` (0.041, pre-existing, not an accessibility check) and `llms-txt` (pre-existing) on `/`, and `is-crawlable` on the three legal pages, which is Lighthouse correctly flagging the `noindex` meta tag Tasks 1 to 3 set on those pages deliberately, not a defect.

- **Verification suite:** `npm test` (46/46), `npm run typecheck`, `npm run build` (all four HTML entries present in `dist/`), all green, unchanged from Task 3 since no source file changed.

---

### Items intentionally not tasks, and why

Recorded here rather than silently dropped, since a checklist item that vanishes without explanation is itself a small honesty failure:

- **Refund policy.** No purchase, subscription, or payment exists anywhere on this site. A refund policy for a site that sells nothing would itself be a fabrication.
- **Form consent.** No `<form>` exists in `src/`, verified by grep. Nothing to gate consent on.
- **Only collect necessary data.** Verified true today: the site collects nothing automatically. Re-check this line the day a form or analytics script is ever added.
- **Check tracking / check 3rd party embeds.** Verified: zero tracking scripts, zero embeds, in `src/` and `index.html`. This is what Task 3's cookies page states plainly rather than leaving unstated.
- **Remove fake reviews / remove unsupported claims.** Audited: no testimonials or reviews exist anywhere in `src/content/site.ts`. Every metric in the Work section traces to a cited public repository. Nothing to remove.
- **Check copyright on images.** The Hero video is the site owner's own recording. `og.png`, `favicon.svg`, and the app icons were generated for this project. No third-party image asset is in use.
- **Add real business details.** This is an individual's portfolio, not a business. The honest equivalent, a real name and real, working contact channels, is already the entire Contact section (`src/components/sections/Contact.tsx`); inventing a company name or address to satisfy this line would be the fabrication this plan exists to avoid.
- **Check local laws.** Not a coding task, and not something an agent should certify on the site owner's behalf. The honest response is Tasks 1 to 3: state plainly and accurately what the site does and does not do, so the owner (or their own counsel, if this site ever becomes commercial) can evaluate applicability themselves.

## Verification, every task

- `npm test`
- `npm run typecheck`
- `npm run build`, and for any task that adds an HTML entry, confirm the new file exists under `dist/`.
