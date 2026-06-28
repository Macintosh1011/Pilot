/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as agent from "../agent.js";
import type * as badge from "../badge.js";
import type * as demoState from "../demoState.js";
import type * as email from "../email.js";
import type * as events from "../events.js";
import type * as fiber from "../fiber.js";
import type * as finalize from "../finalize.js";
import type * as http from "../http.js";
import type * as hwCommands from "../hwCommands.js";
import type * as llm from "../llm.js";
import type * as llmJobs from "../llmJobs.js";
import type * as messages from "../messages.js";
import type * as presence from "../presence.js";
import type * as scoring from "../scoring.js";
import type * as seed from "../seed.js";
import type * as sessions from "../sessions.js";
import type * as vapi from "../vapi.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  agent: typeof agent;
  badge: typeof badge;
  demoState: typeof demoState;
  email: typeof email;
  events: typeof events;
  fiber: typeof fiber;
  finalize: typeof finalize;
  http: typeof http;
  hwCommands: typeof hwCommands;
  llm: typeof llm;
  llmJobs: typeof llmJobs;
  messages: typeof messages;
  presence: typeof presence;
  scoring: typeof scoring;
  seed: typeof seed;
  sessions: typeof sessions;
  vapi: typeof vapi;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
