import { describe, expect, it } from 'vitest';
import { sanitizeInternalReturnTo } from '@/lib/auth/return-to';

describe('sanitizeInternalReturnTo', () => {
  it('returns the root route for missing values', () => {
    expect(sanitizeInternalReturnTo()).toBe('/');
    expect(sanitizeInternalReturnTo(null)).toBe('/');
    expect(sanitizeInternalReturnTo('')).toBe('/');
  });

  it('preserves a valid internal route and trims surrounding spaces', () => {
    expect(sanitizeInternalReturnTo('  /phim/example?ep=tap-1  ')).toBe('/phim/example?ep=tap-1');
  });

  it('rejects external and protocol-relative URLs', () => {
    expect(sanitizeInternalReturnTo('https://example.com/account')).toBe('/');
    expect(sanitizeInternalReturnTo('//example.com/account')).toBe('/');
  });

  it('rejects backslash-prefixed routes and embedded absolute URLs', () => {
    expect(sanitizeInternalReturnTo('/\\\\example.com')).toBe('/');
    expect(sanitizeInternalReturnTo('/redirect?target=https://example.com')).toBe('/');
  });
});
