import { mutation } from "./_generated/server";

export const run = mutation({
  args: {},
  handler: async (ctx) => {
    const clear = async (table: any) => {
      const rows = await ctx.db.query(table).collect();
      for (const row of rows as any[]) await ctx.db.delete(row._id);
    };
    for (const table of [
      "messages",
      "llmJobs",
      "demoState",
      "events",
      "presence",
      "hwCommands",
      "fiberCache",
      "sessions",
    ]) {
      await clear(table);
    }

    const now = Date.now();
    const maya = await ctx.db.insert("sessions", {
      deviceId: "ipad-1",
      status: "done",
      createdAt: now - 3_600_000,
      visitorName: "Maya Chen",
      company: "Northwind Labs",
      role: "VP of Product",
      linkedinUrl: "https://www.linkedin.com/in/maya-chen-product",
      email: "maya@northwindlabs.com",
      fiber: {
        company: {
          name: "Northwind Labs",
          domain: "northwindlabs.com",
          industry: "B2B SaaS — Developer Tools",
          employeeCount: 80,
          founded: 2021,
          funding: "Series A",
          location: "San Francisco, CA",
          linkedinUrl: "https://www.linkedin.com/company/northwind-labs",
          description: "CI/CD observability for engineering teams.",
        },
        person: {
          fullName: "Maya Chen",
          title: "VP of Product",
          seniority: "VP",
          location: "San Francisco, CA",
          linkedinUrl: "https://www.linkedin.com/in/maya-chen-product",
          headline: "VP Product at Northwind Labs · ex-Amplitude",
          isDecisionMaker: true,
        },
        contact: { workEmail: "maya@northwindlabs.com", emailStatus: "valid" },
        source: "fiber",
        fetchedAt: now,
      },
      fiberMatch: "verified",
      problems: [
        "No early warning before enterprise accounts churn",
        "Success team finds out from the invoice",
      ],
      useCase: "Predict and prevent churn in mid-market accounts",
      urgency: "high",
      urgencyEvidence:
        "We literally found out two logos were leaving from the renewal call.",
      confidence: 87,
      confidenceReasons: [
        "ICP fit 28/30: Series A B2B SaaS, 80 employees — dead-center target.",
        "Intent 22/25: actively evaluating, named a deadline this quarter.",
        "Authority 13/15: VP of Product, owns the retention number.",
        "Demo depth 6/10: dug into churn cohorts and alerts.",
      ],
      bestAngle:
        "Lead with predictive churn alerts on enterprise cohorts; she owns retention and has board pressure.",
      demoShown: ["churn", "alerts"],
      badge: {
        archetype: "The Churn Whisperer",
        tagline: "Hears the goodbye before they say it.",
        compliment:
          "Anyone who's found out a logo churned from the renewal call has earned the right to demand early-warning — exactly what you grilled us on.",
        stats: [
          { label: "Churn IQ", value: 94 },
          { label: "Growth Velocity", value: 88 },
          { label: "Signal Strength", value: 82 },
        ],
        discountCode: "ACME-CW-7Q2X",
      },
      emailDraft: {
        subject: "Your churn cohorts in Acme — quick follow-up from the booth",
        body: "Hi Maya,\n\nGreat talking at the booth about catching at-risk Northwind accounts before the renewal call instead of after. The cohort board you saw flags accounts whose usage dips 30 days out, and the alerts route straight to your CS team.\n\nWorth a 20-minute look at your own data? I can spin up a sandbox this week. Your booth code ACME-CW-7Q2X takes 25% off year one.\n\n— The Acme Analytics team",
      },
      reviewStatus: "pending",
    });

    const devon = await ctx.db.insert("sessions", {
      deviceId: "ipad-1",
      status: "done",
      createdAt: now - 3_000_000,
      visitorName: "Devon Park",
      company: "Loop Financial",
      role: "Growth Lead",
      linkedinUrl: "https://www.linkedin.com/in/devon-park-growth",
      email: "devon@loopfinancial.com",
      fiber: {
        company: {
          name: "Loop Financial",
          domain: "loopfinancial.com",
          industry: "Fintech — SaaS",
          employeeCount: 140,
          founded: 2019,
          funding: "Series B",
          location: "New York, NY",
        },
        person: {
          fullName: "Devon Park",
          title: "Growth Lead",
          seniority: "Lead",
          isDecisionMaker: false,
          headline: "Growth @ Loop Financial",
        },
        contact: { workEmail: "devon@loopfinancial.com", emailStatus: "valid" },
        source: "fiber",
        fetchedAt: now,
      },
      fiberMatch: "verified",
      problems: [
        "Analysts are a bottleneck for every metric question",
        "Wants the team to self-serve answers",
      ],
      useCase: "Let PMs answer their own product questions without SQL",
      urgency: "medium",
      urgencyEvidence:
        "Every dashboard request goes through one analyst and it's a week-long queue.",
      confidence: 64,
      confidenceReasons: [
        "ICP fit 24/30: Series B fintech SaaS, solid fit.",
        "Intent 16/25: exploring, no committed timeline.",
        "Engagement 16/20: asked sharp questions about plain-English queries.",
        "Authority 8/15: Growth Lead, likely an influencer not the buyer.",
      ],
      bestAngle:
        "Show the plain-English query builder; help him build the internal case to his Head of Data.",
      demoShown: ["query-result", "integrations"],
      badge: {
        archetype: "The Self-Serve Sommelier",
        tagline: "Pairs each question with the perfect query.",
        compliment:
          "Calling your analyst queue a 'week-long bottleneck' is the most honest thing we heard all day — and exactly the queue Acme deletes.",
        stats: [
          { label: "Query Fluency", value: 90 },
          { label: "Team Leverage", value: 78 },
        ],
        discountCode: "ACME-SS-3K9P",
      },
      emailDraft: {
        subject: "Deleting the analyst queue at Loop — Acme follow-up",
        body: "Hi Devon,\n\nLoved the booth chat about getting your PMs off the analyst queue. The plain-English query view you tried turns 'why did activation dip in May?' into an answer in seconds — no SQL, no ticket.\n\nHappy to help you put a quick internal case together for your data team. Want me to send a sandbox seeded with sample product data? Booth code ACME-SS-3K9P for 25% off.\n\n— The Acme Analytics team",
      },
      reviewStatus: "pending",
    });

    const sam = await ctx.db.insert("sessions", {
      deviceId: "ipad-1",
      status: "done",
      createdAt: now - 2_400_000,
      visitorName: "Sam Okafor",
      company: "BigCorp",
      role: "Director of Analytics",
      linkedinUrl: "https://www.linkedin.com/in/sam-okafor",
      email: "sam@tinypixel.io",
      fiber: {
        company: {
          name: "TinyPixel",
          domain: "tinypixel.io",
          industry: "B2B SaaS — Marketing Tech",
          employeeCount: 6,
          founded: 2024,
          funding: "Pre-seed",
          location: "Austin, TX",
        },
        person: {
          fullName: "Sam Okafor",
          title: "Founder & CEO",
          seniority: "Founder",
          isDecisionMaker: true,
          headline: "Founder at TinyPixel",
        },
        contact: { workEmail: "sam@tinypixel.io", emailStatus: "valid" },
        source: "fiber",
        fetchedAt: now,
      },
      fiberMatch: "mismatch",
      problems: ["Standing up product analytics from scratch", "No data team yet"],
      useCase:
        "Instrument the product and see activation without hiring an analyst",
      urgency: "medium",
      urgencyEvidence: "We're launching in three weeks and I'm flying blind.",
      confidence: 58,
      confidenceReasons: [
        "ICP fit 15/30: capped — claimed Director at BigCorp but fiber shows founder of a 6-person pre-seed startup (mismatch).",
        "Intent 18/25: launching in three weeks, real urgency.",
        "Authority 15/15: it's his company, full decision power.",
        "Demo depth 10/10: walked through integrations and pricing.",
      ],
      bestAngle:
        "Treat as a founder, not an enterprise Director; lead with fastest-path instrumentation and the starter plan.",
      demoShown: ["integrations", "pricing", "home"],
      badge: {
        archetype: "The Zero-to-One Operator",
        tagline: "Wears every hat, ships every week.",
        compliment:
          "'Launching in three weeks and flying blind' is the most founder sentence imaginable — Acme gets you instrumented before the wheels are even on.",
        stats: [
          { label: "Builder Energy", value: 96 },
          { label: "Speed to Signal", value: 84 },
        ],
        discountCode: "ACME-ZO-1F4D",
      },
      emailDraft: {
        subject: "Instrumented before launch — Acme follow-up for TinyPixel",
        body: "Hi Sam,\n\nThree weeks to launch and flying blind is exactly when product analytics earns its keep. The integrations view you saw drops Acme in via a snippet plus Segment, so you'll see activation from day one without hiring a data person.\n\nWant a sandbox to wire up before launch? The starter plan covers a team your size; booth code ACME-ZO-1F4D takes 25% off.\n\n— The Acme Analytics team",
      },
      reviewStatus: "pending",
    });

    // === Flagship demo company: Tessera (the deep-treatment golden) ===
    // Series A ledger/reconciliation API for fintechs. Pain = the activation
    // cliff: customers build a sandbox ledger and never reach production, and
    // nobody sees the silent volume drop until the QBR. Maps to churn (activation
    // cohorts) -> alerts (volume-drop) -> query-result (self-serve). New hero card.
    const priyaCreated = now - 1_500_000;
    const priya = await ctx.db.insert("sessions", {
      deviceId: "ipad-1",
      status: "done",
      createdAt: priyaCreated,
      visitorName: "Priya Raman",
      company: "Tessera",
      role: "Co-founder & Chief Product Officer",
      linkedinUrl: "https://www.linkedin.com/in/priya-raman-product",
      email: "priya@tessera.dev",
      phone: "+1 (416) 555-0142",
      fiber: {
        company: {
          name: "Tessera",
          domain: "tessera.dev",
          industry: "Fintech — Ledger & Reconciliation Infrastructure",
          employeeCount: 110,
          founded: 2021,
          funding: "Series A",
          location: "Toronto, ON",
          linkedinUrl: "https://www.linkedin.com/company/tessera-ledger",
          description:
            "Tessera is a real-time double-entry ledger and reconciliation API that lets fintech and B2B SaaS teams track every dollar — balances, transfers, and reconciliation — from a single source of truth.",
          techStack: ["Go", "Postgres", "Kafka", "Temporal", "Segment", "Snowflake"],
        },
        person: {
          fullName: "Priya Raman",
          title: "Co-founder & Chief Product Officer",
          seniority: "Founder",
          location: "Toronto, ON",
          linkedinUrl: "https://www.linkedin.com/in/priya-raman-product",
          headline: "Co-founder & CPO at Tessera · ex-Plaid",
          tenureMonths: 54,
          isDecisionMaker: true,
        },
        contact: {
          workEmail: "priya@tessera.dev",
          phone: "+1 (416) 555-0142",
          emailStatus: "valid",
        },
        source: "fiber",
        credits: { available: 1840, chargedThisVisit: 2 },
        fetchedAt: now,
      },
      fiberMatch: "verified",
      problems: [
        "New developer customers stall in sandbox and never reach production",
        "No early warning when a live account's transaction volume drops",
        "PMs and solutions engineers wait on one analyst for activation numbers",
      ],
      useCase:
        "Get fintech customers from sandbox to first production reconciliation, and catch silent drop-off before renewal",
      urgency: "high",
      urgencyEvidence:
        "Half our signups build a sandbox ledger and never go live, and we don't catch it until the quarterly review.",
      confidence: 91,
      confidenceReasons: [
        "ICP fit 27/30: Series A fintech infra, ~110 employees — dead-center on stage and size, money-movement adjacency the only asterisk.",
        "Intent 23/25: budget approved, wants it live this quarter ahead of the Series B raise.",
        "Authority 14/15: co-founder and CPO — owns the product and the activation number outright.",
        "Demo depth 9/10: worked through activation cohorts, real-time alerts, and a self-serve query.",
      ],
      bestAngle:
        "Lead with the sandbox-to-production activation cohort board and real-time volume-drop alerts; she's a co-founder with budget and a Series B clock.",
      demoShown: ["churn", "alerts", "query-result"],
      badge: {
        archetype: "The Activation Architect",
        tagline: "Builds the aha-moment on purpose.",
        compliment:
          "Anyone who can say 'half our signups build a sandbox ledger and never go live' without flinching has already diagnosed the activation cliff — Acme just hands you the map to the edge of it.",
        stats: [
          { label: "Activation IQ", value: 93 },
          { label: "Aha Velocity", value: 95 },
          { label: "Cohort Clarity", value: 88 },
        ],
        discountCode: "ACME-AA-9R4T",
      },
      emailDraft: {
        subject:
          "Sandbox-to-production activation for Tessera — quick follow-up from the booth",
        body: "Hi Priya,\n\nGreat talking at the booth about the signups who build a sandbox ledger and never go live — and only surface at the quarterly review. The activation cohort board you saw breaks down exactly which accounts stall between sandbox and first production reconciliation, and the alerts ping your team the moment a live account's volume drops, not at the QBR.\n\nWant to see it on your own data before the Series B push? I can spin up a sandbox seeded with sample ledger events this week, and your PMs can ask 'how many hit production this month' in plain English — no SQL, no analyst queue. Your booth code ACME-AA-9R4T takes 25% off year one.\n\n— The Acme Analytics team",
      },
      reviewStatus: "pending",
    });
    await ctx.db.insert("demoState", {
      sessionId: priya,
      view: "query-result",
      params: {
        query:
          "How many accounts reached first production reconciliation, by signup month?",
        columns: ["Signup Month", "Signups", "Reached Production", "Activation %"],
        rows: [
          ["Jan", 142, 61, "43%"],
          ["Feb", 168, 70, "42%"],
          ["Mar", 191, 66, "35%"],
          ["Apr", 173, 79, "46%"],
        ],
        chart: "bar",
      },
      highlight: "result-chart",
      updatedAt: priyaCreated + 47_000,
    });

    const live = await ctx.db.insert("sessions", {
      deviceId: "ipad-1",
      status: "active",
      createdAt: now - 120_000,
      visitorName: "Riley Stone",
      company: "Atlas Metrics",
      role: "Product Manager",
      problems: ["Needs a faster way to explain activation dips"],
      useCase: "Explore activation cohorts during a booth demo",
    });
    await ctx.db.insert("demoState", {
      sessionId: live,
      view: "home",
      params: { greeting: "Welcome to Acme Analytics" },
      highlight: "hero",
      updatedAt: now,
    });

    const demo = await ctx.db.insert("sessions", {
      deviceId: "demo-ipad",
      status: "demoing",
      createdAt: now - 60_000,
      visitorName: "Demo Visitor",
      company: "SampleCo",
      demoShown: ["churn"],
    });
    await ctx.db.insert("demoState", {
      sessionId: demo,
      view: "churn",
      params: { period: "30d", cohort: "Enterprise accounts" },
      highlight: "at-risk-accounts",
      updatedAt: now,
    });

    // === In-progress fintech card (live, non-final state) ===
    // Spend-management startup mid-conversation: identified + enriched + needs
    // scoped + one view shown, but NOT scored/badged yet. Demoes the live card.
    const marcusCreated = now - 90_000;
    const marcus = await ctx.db.insert("sessions", {
      deviceId: "ipad-1",
      status: "demoing",
      createdAt: marcusCreated,
      visitorName: "Marcus Bell",
      company: "Driftwood",
      role: "Head of Product",
      linkedinUrl: "https://www.linkedin.com/in/marcus-bell-product",
      fiber: {
        company: {
          name: "Driftwood",
          domain: "driftwood.io",
          industry: "Fintech — Spend Management",
          employeeCount: 65,
          founded: 2022,
          funding: "Seed",
          location: "Denver, CO",
          description:
            "Driftwood is a spend-management platform that gives finance teams real-time control over corporate cards and approvals.",
        },
        person: {
          fullName: "Marcus Bell",
          title: "Head of Product",
          seniority: "Head",
          isDecisionMaker: true,
          headline: "Head of Product at Driftwood",
        },
        source: "fiber",
        fetchedAt: now,
      },
      fiberMatch: "verified",
      problems: [
        "Trial teams sign up but never invite their finance lead",
        "Activation stalls before the first synced card",
      ],
      useCase: "Get trial accounts to connect a card and invite their finance team",
      urgency: "medium",
      urgencyEvidence:
        "Tons of trials start, but the ones that don't pull in a finance lead just quietly die.",
      demoShown: ["alerts"],
    });
    await ctx.db.insert("demoState", {
      sessionId: marcus,
      view: "alerts",
      params: { severity: "medium", metric: "trial activations" },
      highlight: "alert-list",
      updatedAt: marcusCreated + 40_000,
    });

    // Transcript + timeline for the new sessions (ground truth for score/badge/email)
    const priyaTranscript: { role: string; text: string; ts: number }[] = [
      { role: "assistant", text: "Hey, welcome to Acme. I'm the booth concierge — what's your name and what do you work on?", ts: priyaCreated + 2_000 },
      { role: "visitor", text: "I'm Priya, co-founder and CPO at Tessera. We build a real-time ledger and reconciliation API for fintechs.", ts: priyaCreated + 6_000 },
      { role: "assistant", text: "Tessera, love it. So your customers are developers moving real money — getting them live in production is the whole game, right?", ts: priyaCreated + 10_000 },
      { role: "visitor", text: "Exactly, and that's my problem. Half our signups build a sandbox ledger and never go live, and we don't catch it until the quarterly review.", ts: priyaCreated + 15_000 },
      { role: "assistant", text: "Oof, the activation cliff. Let me show you something.", ts: priyaCreated + 22_000 },
      { role: "visitor", text: "Yeah, this is the cohort drop-off I can never see clearly. Can it tell me which accounts stalled this month?", ts: priyaCreated + 27_000 },
      { role: "assistant", text: "It can, and it can warn you the moment a live account's volume falls off — before the QBR. Here.", ts: priyaCreated + 34_000 },
      { role: "visitor", text: "That's the part that kills us. A customer goes quiet, transaction volume drops, and nobody flags it until renewal.", ts: priyaCreated + 39_000 },
      { role: "assistant", text: "And when your PMs want the numbers themselves, instead of waiting on the data team?", ts: priyaCreated + 47_000 },
      { role: "visitor", text: "Right now they all wait on our one analyst. If they could just ask 'how many hit production this month' and get an answer, that's huge.", ts: priyaCreated + 52_000 },
      { role: "assistant", text: "That's the plain-English query view, no SQL. Where are you in evaluating something like this?", ts: priyaCreated + 60_000 },
      { role: "visitor", text: "We've got budget approved and I want something live this quarter, before our Series B raise.", ts: priyaCreated + 65_000 },
      { role: "assistant", text: "Perfect timing. Drop me your email and I'll send a sandbox seeded with sample ledger data, plus your Booth Badge.", ts: priyaCreated + 72_000 },
      { role: "visitor", text: "Sure, priya@tessera.dev. Thanks, this was genuinely useful.", ts: priyaCreated + 77_000 },
    ];
    for (const m of priyaTranscript) {
      await ctx.db.insert("messages", { sessionId: priya, role: m.role, text: m.text, ts: m.ts });
    }

    const marcusTranscript: { role: string; text: string; ts: number }[] = [
      { role: "assistant", text: "Welcome to Acme — what are you building?", ts: marcusCreated + 2_000 },
      { role: "visitor", text: "I'm Marcus, Head of Product at Driftwood — spend management. My headache is activation: trial teams sign up but never invite their finance lead or connect a card.", ts: marcusCreated + 12_000 },
      { role: "assistant", text: "So the trial stalls right before the moment that actually matters. Let me show you the alert that catches that drop.", ts: marcusCreated + 30_000 },
    ];
    for (const m of marcusTranscript) {
      await ctx.db.insert("messages", { sessionId: marcus, role: m.role, text: m.text, ts: m.ts });
    }

    const priyaEvents: { step: string; label: string; detail?: string; ms?: number; ts: number }[] = [
      { step: "identify", label: "Session started", detail: "device ipad-1", ts: priyaCreated },
      { step: "identify", label: "Identified visitor", detail: "Priya Raman · Tessera · Co-founder & CPO", ts: priyaCreated + 7_000 },
      { step: "enrich", label: "Researching visitor", ts: priyaCreated + 8_000 },
      { step: "enrich", label: "Found Tessera · match verified", detail: "2 credits · Series A · 110 emp", ms: 1_840, ts: priyaCreated + 10_000 },
      { step: "needs", label: "Scoped needs", detail: "activation cliff · volume-drop alerts · self-serve metrics", ms: 280, ts: priyaCreated + 18_000 },
      { step: "demo", label: "Demo → churn", detail: "activation cohorts", ts: priyaCreated + 22_000 },
      { step: "demo", label: "Demo → alerts", detail: "real-time volume-drop alerts", ts: priyaCreated + 34_000 },
      { step: "demo", label: "Demo → query-result", detail: "accounts reaching production, by signup month", ts: priyaCreated + 47_000 },
      { step: "score", label: "Scoring lead", ts: priyaCreated + 80_000 },
      { step: "score", label: "Confidence 91 (high intent)", detail: "icp 27 · intent 23 · eng 18 · auth 14 · demo 9", ms: 1_620, ts: priyaCreated + 82_000 },
      { step: "badge", label: "Generating badge", ts: priyaCreated + 83_000 },
      { step: "badge", label: "The Activation Architect", detail: "ACME-AA-9R4T", ms: 940, ts: priyaCreated + 84_200 },
      { step: "email", label: "Drafting follow-up", ts: priyaCreated + 85_000 },
      { step: "email", label: "Draft ready for review", detail: "Sandbox-to-production activation for Tessera", ms: 1_080, ts: priyaCreated + 86_600 },
    ];
    for (const e of priyaEvents) {
      await ctx.db.insert("events", { sessionId: priya, ...e });
    }

    const marcusEvents: { step: string; label: string; detail?: string; ms?: number; ts: number }[] = [
      { step: "identify", label: "Session started", detail: "device ipad-1", ts: marcusCreated },
      { step: "identify", label: "Identified visitor", detail: "Marcus Bell · Driftwood", ts: marcusCreated + 5_000 },
      { step: "enrich", label: "Found Driftwood · match verified", detail: "2 credits · Seed · 65 emp", ms: 1_720, ts: marcusCreated + 9_000 },
      { step: "needs", label: "Scoped needs", detail: "trial activation stalls · finance lead never invited", ms: 260, ts: marcusCreated + 22_000 },
      { step: "demo", label: "Demo → alerts", detail: "trial activation alerts", ts: marcusCreated + 40_000 },
    ];
    for (const e of marcusEvents) {
      await ctx.db.insert("events", { sessionId: marcus, ...e });
    }

    for (const [sessionId, label] of [
      [maya, "Golden A loaded"],
      [devon, "Golden B loaded"],
      [sam, "Golden C loaded"],
    ] as const) {
      await ctx.db.insert("events", {
        sessionId,
        step: "identify",
        label,
        ts: now,
      });
    }

    return { ok: true, sessions: [priya, maya, devon, sam, marcus, live, demo] };
  },
});
