"use client";

import { QuillChrome, hl as getHl } from "./QuillChrome";
import { cx } from "./utils";
import type { ViewProps } from "./types";
import s from "../AcmeDemoPanel.module.css";

// ─── Constants ────────────────────────────────────────────────────────────────

const QUILL_PLANS = [
  {
    id:        "plan-starter" as const,
    slug:      "starter"      as const,
    name:      "Starter",
    price:     "$0.85",
    unit:      "/resolution",
    popular:   false,
    maxAgents: 5,
    features: [
      "Up to 500 resolutions/mo",
      "Help center connection",
      "Email + chat channels",
      "Basic deflection analytics",
    ],
  },
  {
    id:        "plan-growth" as const,
    slug:      "growth"      as const,
    name:      "Growth",
    price:     "$0.55",
    unit:      "/resolution",
    popular:   true,
    maxAgents: 20,
    features: [
      "Up to 5,000 resolutions/mo",
      "All channels + Slack",
      "Brand voice tuning",
      "Escalation rules & routing",
      "Priority support",
    ],
  },
  {
    id:        "plan-scale" as const,
    slug:      "scale"       as const,
    name:      "Scale",
    price:     "Custom",
    unit:      "",
    popular:   false,
    maxAgents: Infinity,
    features: [
      "Unlimited resolutions",
      "Custom integrations",
      "Dedicated success manager",
      "SLA guarantee",
      "SSO + audit logs",
    ],
  },
] as const;

// ─── View ─────────────────────────────────────────────────────────────────────

export default function PricingView({ params, highlight }: ViewProps) {
  const hl = (id: string) => getHl(highlight, id);

  const recommendedSlug = params?.plan?.toLowerCase();
  const agentCount = params?.agents != null ? parseInt(params.agents, 10) : null;
  const sizePlan = agentCount == null || isNaN(agentCount) ? null
    : agentCount <= 5  ? "starter"
    : agentCount <= 20 ? "growth"
    : "scale";

  const matchedSlug       = recommendedSlug ?? sizePlan;
  const hasRecommendation = !!(recommendedSlug || (agentCount != null && !isNaN(agentCount)));

  return (
    <QuillChrome active="pricing" company={params?.company} highlight={highlight}>
      <p className={s.eyebrow}>PRICING</p>
      <h2 className={s.heading}>Pay per resolution, not per seat.</h2>

      <div className={s.pricingGrid}>
        {QUILL_PLANS.map((plan, i) => {
          const isMatch  = hasRecommendation && matchedSlug === plan.slug;
          const sizeNote = isMatch && agentCount != null && !isNaN(agentCount)
            ? `Sized for ${agentCount}-agent teams`
            : null;

          return (
            <div
              key={plan.id}
              data-el={plan.id}
              className={cx(
                s.planCard,
                plan.popular ? s.popular    : undefined,
                isMatch      ? s.recommended : undefined,
                hl(plan.id),
              )}
              style={{ animationDelay: `${i * 85}ms` }}
            >
              {isMatch && <span className={s.recommendedBadge}>Recommended for you</span>}
              {plan.popular && !isMatch && <span className={s.popularBadge}>Most popular</span>}
              <p className={s.planName}>{plan.name}</p>
              <div>
                <span className={s.planPriceNum}>{plan.price}</span>
                {plan.unit && <span className={s.planPricePer}>{plan.unit}</span>}
              </div>
              {sizeNote && <p className={s.recommendedNote}>{sizeNote}</p>}
              <ul className={s.planFeatures} aria-label={`${plan.name} plan features`}>
                {plan.features.map((f) => (
                  <li key={f} className={s.planFeature}>{f}</li>
                ))}
              </ul>
              <button
                className={cx(s.planCta, plan.popular || isMatch ? s.ink : undefined)}
                aria-label={`Choose ${plan.name} plan`}
              >
                {plan.id === "plan-scale" ? "Contact sales" : "Get started"}
              </button>
            </div>
          );
        })}
      </div>

      <div
        data-el="cta-contact-sales"
        className={cx(s.contactSales, hl("cta-contact-sales"))}
        role="region"
        aria-label="Contact sales for volume pricing"
      >
        <span>Volume or custom contract?</span>
        <span style={{ color: "var(--clay)", fontWeight: 600 }}>Talk to sales →</span>
      </div>
    </QuillChrome>
  );
}
