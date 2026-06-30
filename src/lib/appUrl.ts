/**
 * Builds an absolute URL that respects Vite's `base` (e.g. "/finance-app/" on
 * GitHub Pages) and the HashRouter we use across hosting targets.
 *
 * Example:
 *   getAppUrl('/reset-password')
 *     → "https://finango.online/#/reset-password"          (base "/")
 *     → "https://user.github.io/finance-app/#/reset-password" (base "/finance-app/")
 */
export function getAppUrl(hashPath: string = '/'): string {
  const base = import.meta.env.BASE_URL || '/';
  const normalizedHash = hashPath.startsWith('/') ? hashPath : `/${hashPath}`;
  // Ensure base ends with "/" then drop the trailing slash before "#"
  const baseClean = base.endsWith('/') ? base.slice(0, -1) : base;
  return `${window.location.origin}${baseClean}/#${normalizedHash}`;
}
