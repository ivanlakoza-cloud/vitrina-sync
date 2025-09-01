// Helpers (safe fallbacks). If your project already defines these, keep your versions.
export function prettyLabels(key: string) {
  return key.replaceAll('_', ' ').trim();
}
