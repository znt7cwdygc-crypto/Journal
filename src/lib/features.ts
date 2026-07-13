/**
 * Feature flags controlled by environment variables — set per-environment in
 * .env.local, not per-request. See docs/STUDIO_CATALOG_SPEC.md.
 */

export function isCatalogEnabled(): boolean {
  return process.env.FEATURE_CATALOG === "true";
}
