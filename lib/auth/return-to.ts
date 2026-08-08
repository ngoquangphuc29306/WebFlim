/**
 * Sanitizes returnTo parameter to ensure internal routing only.
 * Prevents open-redirect security risks.
 */
export function sanitizeInternalReturnTo(rawReturnTo?: string | null): string {
  if (!rawReturnTo) return '/';
  
  // Trim spaces
  const trimmed = rawReturnTo.trim();

  // Must start with exactly one '/' and not '//' or '/\'
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.startsWith('/\\')) {
    return '/';
  }

  // Reject absolute URLs encoded or starting with protocol
  if (trimmed.includes('://')) {
    return '/';
  }

  return trimmed;
}
