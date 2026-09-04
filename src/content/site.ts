/**
 * Every word rendered on this site comes from this file.
 *
 * Sources, in precedence order (see CLAUDE.md):
 *  1. docs/direction/project/Utterance - Portfolio.dc.html: wording, where it
 *     exists. It is the same content as the inventory, edited to fit the locked
 *     layout (the About pull-quote in particular only works at its shorter length).
 *  2. docs/content-inventory.md, canonical for facts: links, stack lists,
 *     claims, and anything the prototype does not cover. Wins on any
 *     substantive conflict.
 *
 * Copy is never written here that does not trace back to one of those two.
 */

export type ProjectStatus =
  | { kind: 'repo'; href: string; label: string }
  | { kind: 'note'; label: string }

export interface ProjectDetail {
  /** Small mono label above the paragraph, e.g. PROBLEM, APPROACH, RESULT. */
  label: string
  body: string
}

export interface Project {
  /** Stable DOM id, used for the heading and aria wiring. */
  id: string
  title: string
  hook: string
  /** Rendered as bordered pills. Already in display case. */
  tags: readonly string[]
  status: ProjectStatus
  details: readonly ProjectDetail[]
}

export interface NavLink {
  href: string
  label: string
}

export interface ContactLink {
  href: string
  label: string
}

export const site = {
  name: 'Shiva Gunuru',
  role: 'AI Engineer',
  title: 'Shiva Gunuru | AI Engineer',
  description:
    'AI engineer with a backend foundation, building RAG and applied LLM systems, plus real project case studies and a content-creation background.',
  email: 'shiva.gunuru@gmail.com',
} as const

export const nav: readonly NavLink[] = [
  { href: '#work', label: 'Work' },
  { href: '#about', label: 'About' },
  { href: '#contact', label: 'Contact' },
]

export const hero = {
  eyebrow: '↳ Listening',
  headline: 'AI engineer building systems that put LLMs to real work',
  subline:
    'Backend-trained, RAG-focused, with a communication edge from years creating content and producing video for real clients.',
  cta: { href: '#work', label: 'See the work' },
} as const

export const work = {
  eyebrow: 'Work',
  meta: 'Four systems',
} as const

export const projects: readonly Project[] = [
  {
    id: 'ai-voice-agent-for-farmers',
    title: 'AI Voice Agent for Farmers',
    hook: 'A crop question in Telugu, answered from a cited agronomy page, or not answered at all.',
    tags: ['Python', 'IndicConformer ONNX', 'BGE-M3', 'FAISS', 'Gemma 3'],
    status: {
      kind: 'repo',
      href: 'https://github.com/ShivaGunuru/ai-voice-agent-for-farmers',
      label: 'github.com/ShivaGunuru/ai-voice-agent-for-farmers',
    },
    details: [
      {
        label: 'Problem',
        body: 'Ask a general-purpose model why the rice is yellowing and it answers confidently, often wrongly. For a smallholder farmer about to act on that answer, a fluent guess at a crop disease is worse than no answer at all.',
      },
      {
        label: 'Approach',
        body: 'The farmer speaks Telugu. A voice-activity detector and an ONNX IndicConformer model transcribe it, BGE-M3 retrieval runs over 1,716 pages of government agronomy literature, and a deterministic reranker scores each passage on whether it names the symptom, plant part and growth stage described, not just whether it looks similar.',
      },
      {
        label: 'Where it stands',
        body: 'Speech, retrieval and ranking are built and measured end to end against a frozen 100-query benchmark with page-level gold citations: 40.2% top-1 diagnosis, 90.8% retrieval recall. An experimental verifier that can only withdraw a diagnosis, never invent one, reached 47.8%, but on a single judge model, so it stays out of production. Text-to-speech is not built yet.',
      },
    ],
  },
  {
    id: 'bike-rental-platform',
    title: 'Bike Rental Platform',
    hook: 'A five-service backend built to mirror real-world production architecture.',
    tags: ['Java', 'Spring Boot', 'AngularJS', 'SQL'],
    status: {
      kind: 'repo',
      href: 'https://github.com/ShivaGunuru/BikeRental',
      label: 'github.com/ShivaGunuru/BikeRental',
    },
    details: [
      {
        label: 'Problem',
        body: 'Build a realistic multi-service booking platform with the separation of concerns (payments, ordering, auth) that production systems actually require.',
      },
      {
        label: 'Approach',
        body: 'A five-service architecture with separate payment, ordering and authentication/logging services, sitting behind distinct admin and customer interfaces.',
      },
      {
        label: 'Result',
        body: 'Shipped a working multi-service booking system with full customer and admin flows, built during TCS technical training. Scoped to architecture. No load claims, because none were tested.',
      },
    ],
  },
  {
    id: 'mental-health-screener',
    title: 'Mental Health Screener',
    hook: 'A doctor-informed screening tool that routes people to self-care or professional consultation.',
    tags: ['Python', 'Random Forest', 'Kaggle dataset'],
    status: {
      kind: 'repo',
      href: 'https://github.com/ShivaGunuru/SIH-2023',
      label: 'github.com/ShivaGunuru/SIH-2023',
    },
    details: [
      {
        label: 'Problem',
        body: "Make a first-line mental health self-assessment that's accessible without being guesswork dressed as clinical advice.",
      },
      {
        label: 'Approach',
        body: 'Doctors helped define a psychometric questionnaire on a 1–10 scale. Responses pass through a trained classifier that recommends either self-management or a formal consultation.',
      },
      {
        label: 'Result',
        body: "Cleared Round 1 of Smart India Hackathon 2023, a national-level hackathon; didn't advance to the finals. Later rebuilt and refined as a standalone product.",
      },
    ],
  },
  {
    id: 'feature-benefit-translator',
    title: 'Feature-Benefit Translator',
    hook: 'Turns dense technical product pages into language a non-technical stakeholder can act on.',
    tags: ['Gemma 4B / Ollama', 'OpenAI-compatible API', 'Python'],
    status: {
      kind: 'repo',
      href: 'https://github.com/ShivaGunuru/feature-benefit-translator',
      label: 'github.com/ShivaGunuru/feature-benefit-translator',
    },
    details: [
      {
        label: 'Problem',
        body: "Cloud and SaaS product pages describe features in engineering terms, and the decision-maker reading them can't tell what changes for their business.",
      },
      {
        label: 'Approach',
        body: 'A tool that takes a technical webpage and rewrites its content as plain business value, running against either a local model or a hosted one through the same interface.',
      },
      {
        label: 'Result',
        body: 'Built as an LLM engineering exercise focused on the full request/response cycle for locally-hosted and cloud-hosted models alike.',
      },
    ],
  },
]

export const about = {
  eyebrow: 'About',
  meta: 'Backend → AI → Communication',
  /** Rendered large, as a display pull-quote. Its length is load-bearing. */
  lead: 'I moved from backend into AI because I wanted to build with it directly, not just use it as a chat interface.',
  body: [
    "That shift is where most of my recent work lives: retrieval-augmented systems, like a voice tool that answers a farmer's spoken crop question from cited agronomy documents instead of from a model's memory.",
    "Before AI, I co-ran a video production studio through college, doing motion graphics and content, short and long form, for clients including a millet-snack food brand and a Dubai-based SaaS company. That background isn't unrelated to the engineering. It's why I don't just ship technically sound systems; I think about how to explain what they do to someone who isn't technical. It's also why I still make AI and tech content today, as @mr.owerthinker.",
    "Backend gave me the foundation. AI is what I'm building with now. Video and content gave me the ability to make technical work legible. That combination, not a lack of focus, is the actual advantage.",
  ],
  /** The handle inside body[1] is linked at render time. */
  handle: { text: '@mr.owerthinker', href: 'https://instagram.com/mr.owerthinker' },
} as const

export const contact = {
  eyebrow: 'Contact',
  meta: 'Open to AI engineering roles',
  headline: "Tell me what you're building.",
  signoff: '↳ Signal ends',
} as const

/**
 * The decorative band that closes the page, below Contact's sign-off.
 *
 * These three words are the one deliberate exception to the "every rendered
 * word traces back to a source document" rule in CLAUDE.md: they appear in
 * neither the inventory nor the prototype. They are art direction, requested
 * directly, extending the site's signal motif past `↳ Signal ends` into the
 * dead air after the transmission. They are not a claim about anything, and
 * the band is `aria-hidden` so nothing announces them as page content.
 *
 * Do not treat this as precedent for adding unsourced copy elsewhere.
 */
export const marquee = {
  words: ['Error', '404', 'Dead end'],
  /** Sits between words. A middot, since em dashes are banned site-wide. */
  separator: '·',
} as const

export const contactLinks: readonly ContactLink[] = [
  { href: 'mailto:shiva.gunuru@gmail.com', label: 'shiva.gunuru@gmail.com' },
  { href: 'https://github.com/ShivaGunuru', label: 'GitHub / ShivaGunuru' },
  {
    href: 'https://www.linkedin.com/in/shiva-gunuru-8b015415a/',
    label: 'LinkedIn / Shiva Gunuru',
  },
  {
    href: 'https://instagram.com/mr.owerthinker',
    label: 'Instagram & YouTube / @mr.owerthinker',
  },
]
