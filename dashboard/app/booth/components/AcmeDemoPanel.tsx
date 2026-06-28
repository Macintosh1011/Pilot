"use client";

// AcmeDemoPanel — router that maps the active DemoView key to its view component.
// Each view component owns its own QuillChrome shell + content; this file purely dispatches.
// 'use client' required: view components use browser hooks.

import { type ComponentType } from "react";

export type { DemoView, DemoParams } from "./views/types";
import type { DemoView, DemoParams, ViewProps } from "./views/types";

import HomeView         from "./views/home";
import ChurnView        from "./views/churn";
import AlertsView       from "./views/alerts";
import PricingView      from "./views/pricing";
import IntegrationsView from "./views/integrations";
import QueryResultView  from "./views/query-result";
import ActionsView      from "./views/actions";
import VoiceView        from "./views/voice";
import ProactiveView    from "./views/proactive";
import SentimentView    from "./views/sentiment";
import ChannelsView     from "./views/channels";
import LanguagesView    from "./views/languages";
import BrandVoiceView   from "./views/brand-voice";
import KnowledgeView    from "./views/knowledge";
import ComplianceView   from "./views/compliance";
import InsightsView     from "./views/insights";
import CopilotView      from "./views/copilot";
import ExperimentsView  from "./views/experiments";

// ─── View map ─────────────────────────────────────────────────────────────────

const VIEW_MAP: Record<DemoView, ComponentType<ViewProps>> = {
  "home":          HomeView,
  "query-result":  QueryResultView,
  "churn":         ChurnView,
  "alerts":        AlertsView,
  "integrations":  IntegrationsView,
  "pricing":       PricingView,
  "actions":       ActionsView,
  "voice":         VoiceView,
  "proactive":     ProactiveView,
  "sentiment":     SentimentView,
  "channels":      ChannelsView,
  "languages":     LanguagesView,
  "brand-voice":   BrandVoiceView,
  "knowledge":     KnowledgeView,
  "compliance":    ComplianceView,
  "insights":      InsightsView,
  "copilot":       CopilotView,
  "experiments":   ExperimentsView,
};

// ─── AcmeDemoPanel ────────────────────────────────────────────────────────────

export function AcmeDemoPanel({
  view,
  params,
  highlight,
}: {
  view: DemoView;
  params?: DemoParams;
  highlight?: string;
}) {
  const Component = VIEW_MAP[view] ?? HomeView;
  return <Component params={params} highlight={highlight} />;
}
