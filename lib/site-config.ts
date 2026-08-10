const DEVELOPMENT_SITE_URL = 'http://localhost:3000';

/**
 * Returns the configured PHEVO application origin.
 * Production deployments must set NEXT_PUBLIC_SITE_URL to the real site URL.
 */
export function getSiteUrl(): string {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!configuredUrl) return DEVELOPMENT_SITE_URL;

  try {
    const parsedUrl = new URL(configuredUrl);
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return DEVELOPMENT_SITE_URL;
    }
    return parsedUrl.origin;
  } catch {
    return DEVELOPMENT_SITE_URL;
  }
}
