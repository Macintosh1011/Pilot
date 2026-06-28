/**
 * Runtime configuration for the web booth, read once from public env vars.
 *
 * Mirrors the iOS `BoothConfig` (deviceId / convexURL) but adds the browser-only
 * bits (Vapi public key, badge base URL). All values are safe to expose to the
 * client — they are `NEXT_PUBLIC_*` by design. Callers fall back to
 * `window.location.origin` when `badgeBaseUrl` is empty.
 */
export const BoothConfig = {
  /** Identifies this booth device to Convex (presence, session.deviceId). */
  deviceId: process.env.NEXT_PUBLIC_DEVICE_ID ?? "web-1",
  /** Convex deployment URL. Empty string when unset (provider shows a setup card). */
  convexUrl: process.env.NEXT_PUBLIC_CONVEX_URL ?? "",
  /** Vapi browser SDK public key. `null` ⇒ no live voice ⇒ scripted fallback mode. */
  vapiPublicKey: process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY ?? null,
  /** Base URL for shareable badge links. Empty ⇒ callers use window.location.origin. */
  badgeBaseUrl: process.env.NEXT_PUBLIC_BADGE_BASE_URL ?? "",
} as const;

/** True when a Vapi public key is configured, i.e. live voice is available. */
export const hasVoice = !!BoothConfig.vapiPublicKey;

export type BoothConfigShape = typeof BoothConfig;
