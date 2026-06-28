import { anyApi } from "convex/server";

// Read-only, web-local function references (avoids transitively typechecking the backend).
//
// We deliberately do NOT `export { api } from "@cvx/_generated/api"` here. Importing the
// fully-typed generated `api` pulls every Convex module into the web typecheck/build, which
// surfaces a pre-existing backend error (convex/email.ts) we are not allowed to touch. The
// untyped `anyApi` keeps `web/` fully self-contained: it resolves any `api.<module>.<fn>`
// reference at runtime without typechecking the backend. All web-side type-safety comes from
// casting results to the shapes in `web/lib/types.ts`.
export const api = anyApi;
