# Content Inventory — AI Engineer Portfolio

*Structured site copy. Source of truth for all rendered text — see CLAUDE.md for precedence against the visual direction.*

---

## Positioning

**Backend-trained AI engineer focused on applied LLM systems — building AI that does real work, not just chat.**

*(Two alternates, if this doesn't land: "AI engineer with a backend foundation, building retrieval-based systems that make expert knowledge accessible through natural interfaces." / "I build AI systems that solve access problems, backed by a backend engineering foundation and a current focus on retrieval-augmented applications.")*

---

## Hero

**Headline:**
AI Engineer building systems that put LLMs to real work

**Subline:**
Backend-trained, RAG-focused — with a communication edge from years creating content and producing video for real clients.

---

## Projects

### 1. AI Farmer Helpline
**Hook:** A single phone call away from verified agricultural advice — no wait times, no guesswork.

- **Problem:** Farmers often rely on informal sources — local contacts, unlicensed advisors — for crop guidance, which can be inconsistent or influenced by superstition rather than fact. Verified agricultural information isn't always a phone call away.
- **Approach:** A single inbound call replaces the need to track down the right expert. The caller speaks in their regional language; the query is transcribed, answered using retrieval over verified agricultural documents (not an LLM's unverified memory), and the answer is read back as speech.
- **Stack:** Python (custom audio pipeline — PCM parsing, RMS-based silence detection, frame segmentation), faster-whisper (speech-to-text), ChromaDB (retrieval, planned), Twilio (telephony, planned), LLM + TTS (evaluation in progress)
- **Measurable result:** Audio preprocessing and STT pipeline built and validated end-to-end on recorded clips — reliable silence detection and frame-by-frame transcription. Retrieval, generation, and the live voice-response loop are the active next phase.
- **Live demo:** None yet (in progress)
- **Repo:** None yet — code not public.

---

### 2. Bike Rental Platform
**Hook:** A five-service backend built to mirror real-world production architecture.

- **Problem:** Design and build a realistic multi-service booking platform, with the kind of separation of concerns (payments, ordering, auth) expected in production systems.
- **Approach:** Designed a ~5-service backend architecture — separate services for payment, ordering, and authentication/logging — with distinct admin and customer-facing interfaces.
- **Stack:** Java, Spring Boot, AngularJS, HTML/CSS/JavaScript, SQL
- **Measurable result:** Shipped a working multi-service booking system with full customer and admin flows, built during TCS technical training. *(Scoped to architecture — no load/traffic claims, since none were tested.)*
- **Live demo:** None
- **Repo:** https://github.com/ShivaGunuru/BikeRental

---

### 3. Mental Health Screener
**Hook:** A doctor-informed screening tool that routes users to self-care or professional consultation.

- **Problem:** Build an accessible first-line mental health self-assessment tool, grounded in real clinical input rather than guesswork.
- **Approach:** Consulted with doctors to define a psychometric questionnaire (1–10 scale responses). User responses pass through a trained classifier that recommends either self-management or formal medical consultation.
- **Stack:** Python, Random Forest classifier, Kaggle mental health dataset
- **Measurable result:** Cleared Round 1 of Smart India Hackathon 2023 (national-level hackathon); did not advance to finals. Later reused and refined as a standalone product.
- **Live demo:** None
- **Repo:** https://github.com/ShivaGunuru/SIH-2023

---

### 4. Feature-Benefit Translator
**Hook:** Turns dense technical product pages into language a non-technical stakeholder can actually act on.

- **Problem:** Technical product pages (e.g. cloud/SaaS sites) often fail to communicate value to non-technical decision-makers.
- **Approach:** Built a tool that takes a technical webpage and translates its content into plain, business-value language.
- **Stack:** Gemma 4B (local, via Ollama), OpenAI-compatible API endpoint, Python/Jupyter
- **Measurable result:** Built as an LLM engineering course exercise (Week 1), focused on handling the full LLM API request/response cycle for both locally-hosted and cloud-hosted models.
- **Live demo:** None
- **Repo:** https://github.com/ShivaGunuru/feature-benefit-translator

---

## About

I started in backend engineering and moved into AI because I wanted to build with it directly, not just use it as a chat interface. That shift is where most of my recent work lives — right now, that means retrieval-augmented systems, like a voice-based tool that gives farmers a verified, single-call alternative to informal or unreliable local advice.

Before AI, I co-ran a video production studio through college — motion graphics and content creation, both short-form and long-form, for clients including a millet-snack food brand and, a few years back, a Dubai-based SaaS company on a freelance basis. That background isn't unrelated to the engineering work; it's why I don't just ship technically sound systems, I think about how to communicate what they do and why they matter to someone who isn't technical. It's also why I still create AI/tech content today (@mr.owerthinker) — the same audience-communication instinct, aimed at explaining ideas rather than just building them.

Backend gave me the foundation. AI is what I'm building with now. Video and content gave me the ability to make technical work legible — and that combination, not a lack of focus, is the actual advantage.

---

## Contact

- Email: shiva.gunuru@gmail.com
- GitHub: https://github.com/ShivaGunuru
- LinkedIn: https://www.linkedin.com/in/shiva-gunuru-8b015415a/
- Content (Instagram & YouTube): @mr.owerthinker

*(Resume PDF excluded per your request.)*

---

## SEO

**Meta description (143 characters):**
AI engineer with a backend foundation, building RAG and applied LLM systems — plus real project case studies and a content-creation background.

**Keywords:**
- AI engineer
- RAG engineer
- Applied LLM systems
- Backend engineer
- Retrieval-augmented generation
- Generative AI developer
- Python AI developer

*(No location keyword added — no specific market targeted. If you're aiming at a specific city/region or remote-only, add that as a keyword and fold it into the meta description.)*
