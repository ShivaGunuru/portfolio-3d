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

/**
 * The governing-law section deliberately names no country. A specific
 * jurisdiction is a real legal fact, not a stylistic choice, and this
 * document guesses at nothing: better a true general statement than a
 * confident wrong one. If the site owner wants a named jurisdiction, that is
 * theirs to add.
 *
 * The "no reproduction without permission" claim is checked, not assumed:
 * the repository this site is built from has no LICENSE file, so by default
 * copyright law nothing here is licensed for reuse even though the source is
 * publicly readable on GitHub.
 */
export const termsOfUse: LegalDocument = {
  title: 'Terms of Use',
  updated: '4 September 2026',
  intro:
    'This page covers the terms for using this site, the personal portfolio of Shiva Gunuru. By visiting it, you agree to these terms.',
  sections: [
    {
      heading: 'The content here',
      body: [
        'Everything on this site, the project write-ups, the measured results quoted in them, the design, and the generative 3D field, is provided as is, without warranty of any kind, express or implied, including that it is accurate, complete, or continuously available. Project results are described as measured at the time they were written and linked to their source repository where one is public; they are not guarantees about any other system built the same way.',
      ],
    },
    {
      heading: 'Ownership and reuse',
      body: [
        'The site\'s design, its written content, and its code are not licensed for reuse. The code for this site is kept in a public GitHub repository, which means you can read it, not that you may copy, redistribute, or build on it: the repository carries no open-source license, so by default copyright law reserves those rights. If you want to use any part of it, ask first, using the contact details in the Contact section.',
      ],
    },
    {
      heading: 'Links to other sites',
      body: [
        'The Contact section links to GitHub, LinkedIn, and Instagram profiles, and the Work section links to public project repositories. None of those are operated by this site, and none of their content, availability, or terms are controlled by it. Visiting them is subject to whatever terms that service sets, not these.',
      ],
    },
    {
      heading: 'Liability',
      body: [
        'To the extent the law allows it, use of this site is at your own risk, and it is not liable for any loss or damage arising from your use of it, including from relying on anything it describes or links to.',
      ],
    },
    {
      heading: 'Governing law',
      body: [
        'These terms are governed by the laws applicable to the site owner\'s own place of residence, without regard to conflict-of-law rules, rather than a jurisdiction picked for effect.',
      ],
    },
    {
      heading: 'Changes to these terms',
      body: [
        'If these terms change, this page will be updated and the date below will move forward. Continuing to use the site after a change means you accept the update.',
      ],
    },
    {
      heading: 'Contact',
      body: [
        'Questions about these terms can go to the email address listed in the Contact section of the site.',
      ],
    },
  ],
}

/**
 * Short on purpose: the honest content is "none", and padding that out to
 * look more substantial would be the opposite of what this page is for.
 * Re-verified with the same grep as the privacy policy immediately before
 * this was written, not assumed to still be true from an earlier check.
 */
export const cookiesPolicy: LegalDocument = {
  title: 'Cookies Policy',
  updated: '4 September 2026',
  intro:
    'This site does not set cookies. This page says so plainly, and explains the one part of serving a web page that is outside its control.',
  sections: [
    {
      heading: 'Cookies set by this site',
      body: [
        'None. This site\'s own code sets no cookies of any kind, first-party or third-party, and reads no cookie that might already exist in your browser. There is nothing here for a cookie banner to ask permission for.',
      ],
    },
    {
      heading: 'What is outside this site\'s control',
      body: [
        'This site is hosted by Vercel Inc. Delivering any web page necessarily involves the hosting provider\'s own edge network processing standard connection metadata, the same as any web host, regardless of what code the site itself runs. That is Vercel\'s infrastructure, not a cookie this site sets, and it is governed by Vercel\'s own privacy policy: https://vercel.com/legal/privacy-policy.',
      ],
    },
    {
      heading: 'If this ever changes',
      body: [
        'If a future version of this site ever adds a cookie, for analytics or anything else, this page will be rewritten in the same commit that adds it, and it will say specifically what is set and why rather than staying this general.',
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
