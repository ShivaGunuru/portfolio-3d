export interface LegalSection {
  heading: string
  body: readonly string[]
}

export interface LegalDocument {
  title: string
  /** Shown under the title. Kept as a plain string, not a Date, so the build
   *  never depends on the machine clock: it changes only when this file does. */
  updated: string
  intro: string
  sections: readonly LegalSection[]
}

/**
 * This is a personal portfolio, not a business, and it is deliberately
 * described that way below rather than dressed up as one. Every claim in
 * this document was checked against the actual codebase before being
 * written, not assumed:
 *
 * - No `<form>` element exists anywhere in `src/`.
 * - No cookies, `localStorage`, or `sessionStorage` are read or written
 *   anywhere in `src/`.
 * - No analytics, tracking pixel, or third-party script of any kind loads.
 * - No third-party embed (iframe or otherwise) exists.
 *
 * If any of that ever changes, this document has to change with it in the
 * same commit that adds the thing, not after.
 */
export const privacyPolicy: LegalDocument = {
  title: 'Privacy Policy',
  updated: '4 September 2026',
  intro:
    'This is the personal portfolio of Shiva Gunuru, an individual, not a company. This page explains what happens to your data when you visit it. The short version: nothing is collected automatically.',
  sections: [
    {
      heading: 'What this site collects',
      body: [
        'Nothing, automatically. This site sets no cookies and runs no analytics, tracking pixel, or third-party script of any kind. There is no form on this site, so there is nothing here to submit.',
        'If a future version of this site ever adds analytics or a form, that change and this policy will be updated in the same commit, and this paragraph will say so specifically rather than staying generic.',
      ],
    },
    {
      heading: 'If you contact me',
      body: [
        'The Contact section links to email and to profiles on GitHub, LinkedIn, and Instagram. If you use any of those to reach out, that exchange happens on that service, not on this site, and is governed by that service\'s own privacy policy: Google (Gmail), GitHub, LinkedIn, and Meta (Instagram) respectively. This site has no access to those messages and does not store a copy of them.',
      ],
    },
    {
      heading: 'Hosting',
      body: [
        'This site is hosted by Vercel Inc. Like any web host, serving a page to your browser necessarily involves Vercel\'s infrastructure processing standard connection information, such as your IP address, to deliver the response. This site\'s own code has no access to that data and does not receive, store, or process it. Vercel\'s handling of it is governed by their own privacy policy: https://vercel.com/legal/privacy-policy.',
      ],
    },
    {
      heading: 'Children',
      body: [
        'This site is not directed at children and is not knowingly used to collect information from them. Since the site collects no information from any visitor, this is true by construction rather than by promise.',
      ],
    },
    {
      heading: 'Changes to this policy',
      body: [
        'If what this site does ever changes in a way that affects your data, this page will be updated to say so plainly, with the date below moved forward. There is no mailing list to notify, since building one would itself be a change this paragraph would have to describe.',
      ],
    },
    {
      heading: 'Contact',
      body: [
        'Questions about this policy can go to the email address listed in the Contact section of the site.',
      ],
    },
  ],
}
