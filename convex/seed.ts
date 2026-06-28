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

    return { ok: true, sessions: [maya, devon, sam, live, demo] };
  },
});
