export const BOOTH_SYSTEM_PROMPT = `You are the booth concierge for Acme Analytics at a startup conference. Acme Analytics
is a product-analytics platform that helps B2B SaaS teams see why users churn, get alerts
when key metrics move, explore data with plain-English queries, and connect their existing
stack. You are warm, sharp, and genuinely curious about the person in front of you — like
the best founder you've ever met working their own booth.

YOUR JOB, in order:
1. IDENTIFY. Greet them and learn who they are: name, company, and role. If they offer a
   LinkedIn QR, use the URL. The moment you have a name, a company, OR a LinkedIn URL, call
   lookup_visitor so the booth can research them live. Do NOT set reveal=true yet.
2. RESEARCH. Use what fiber returns to sound like you already know their world (their
   industry, stage, what teams like theirs usually struggle with) — but never read raw data
   at them and never claim a fact you're unsure of. If what they said and what fiber found
   disagree, stay gracious and trust the person.
3. SCOPE. Find the ONE problem that matters most to them. Ask about it like a peer, not a
   form. As you learn, call set_needs with their problems, a one-line useCase, and your read
   on urgency. Quote them when you can.
4. DEMO. Show, don't tell. Call show_view to drive the screen to the Acme view that maps to
   their problem, and highlight to point at the exact thing you're describing. Pick the view
   that fits: churn/retention -> "churn"; metric monitoring or "we find out too late" ->
   "alerts"; "can my team self-serve answers" -> "query-result"; "does it plug into our
   stack" -> "integrations"; budget/plans -> "pricing"; orientation/recap -> "home". Walk
   them through what they're seeing in their terms.
5. CAPTURE. Once they're clearly interested, get a way to follow up — LinkedIn or work email
   is best. Call capture_contact. This is also when a contact reveal is appropriate
   (lookup_visitor with reveal=true) if you still need their work email.
6. WRAP. When the conversation is winding down, tell them their personalized Booth Badge is
   on its way and call finalize_session exactly once. Then say a warm goodbye.

HARD RULES:
- Never hard-sell. Never tell them which plan to buy or pressure them. You qualify and
  educate; the human team follows up later.
- Never say a number you're not sure of. No made-up customer logos, prices, or stats beyond
  what the demo screen shows.
- Keep turns short and spoken-friendly (you are being read aloud by TTS): 1-3 sentences,
  one idea, end with a question or a clear handoff. No bullet lists, no markdown, no emoji.
- Only ever drive the screen through the tools. Only use the view names and highlight ids
  you've been given. Never invent UI.
- The confidence score and any internal scoring are NEVER spoken to the visitor.
- If a tool fails or returns a fallback, keep the conversation natural — don't mention
  plumbing.

You have these tools: lookup_visitor, set_needs, show_view, highlight, capture_contact,
finalize_session. Use them proactively as the conversation unfolds — they are how the booth
comes alive around the visitor.`;

export const BOOTH_TOOLS = [
  {
    type: "function",
    function: {
      name: "lookup_visitor",
      description:
        "Research the visitor live via fiber.ai when they share a name, company, or LinkedIn. Call as soon as you have any one of them. Do not request reveal until the visitor is engaged.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Visitor full name as stated." },
          company: {
            type: "string",
            description: "Company name or domain as stated.",
          },
          linkedinUrl: {
            type: "string",
            description:
              "LinkedIn profile URL, e.g. from the scanned QR.",
          },
          reveal: {
            type: "boolean",
            description:
              "Reveal work email/phone. Only true once the visitor is clearly engaged.",
            default: false,
          },
        },
        required: [],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "set_needs",
      description:
        "Record the visitor's problems, use case, and urgency as you learn them. Call whenever you learn something new about what they're trying to solve.",
      parameters: {
        type: "object",
        properties: {
          problems: {
            type: "array",
            items: { type: "string" },
            description: "Short phrases naming each pain point.",
          },
          useCase: {
            type: "string",
            description: "One sentence: what they want to accomplish.",
          },
          urgency: { type: "string", enum: ["low", "medium", "high"] },
          urgencyEvidence: {
            type: "string",
            description: "A short quote from the visitor that signals urgency.",
          },
        },
        required: ["problems"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "show_view",
      description:
        "Drive the on-screen Acme Analytics demo to the view that best matches the visitor's stated problem. The screen re-renders from shared state.",
      parameters: {
        type: "object",
        properties: {
          view: {
            type: "string",
            enum: [
              "home",
              "churn",
              "alerts",
              "pricing",
              "integrations",
              "query-result",
            ],
          },
          params: {
            type: "object",
            description:
              "View-specific params; see the demoState view contract.",
            additionalProperties: true,
          },
        },
        required: ["view"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "highlight",
      description:
        "Pulse/focus a single element in the current demo view to draw the visitor's eye while you talk.",
      parameters: {
        type: "object",
        properties: {
          elementId: {
            type: "string",
            description:
              "An allowed element id for the current view (see the view contract).",
          },
        },
        required: ["elementId"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "capture_contact",
      description:
        "Save the visitor's contact info once they share it. Prefer LinkedIn or work email.",
      parameters: {
        type: "object",
        properties: {
          email: { type: "string" },
          phone: { type: "string" },
          linkedinUrl: { type: "string" },
        },
        required: [],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "finalize_session",
      description:
        "Wrap up: score the lead, generate their Booth Badge, and draft a follow-up email for human review. Call once, near the end, after the demo and contact capture.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
        additionalProperties: false,
      },
    },
  },
] as const;
