import { afterEach, describe, expect, it } from 'vitest';
import { getSiteUrl } from '@/lib/site-config';

const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;

afterEach(() => {
  if (originalSiteUrl === undefined) {
    delete process.env.NEXT_PUBLIC_SITE_URL;
  } else {
    process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl;
  }
});

describe('getSiteUrl', () => {
  it('returns the configured HTTPS origin', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://phevo.example/app';

    expect(getSiteUrl()).toBe('https://phevo.example');
  });

  it('supports HTTP URLs for local or non-TLS environments', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'http://localhost:4000/';

    expect(getSiteUrl()).toBe('http://localhost:4000');
  });

  it('falls back to localhost when the value is missing', () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;

    expect(getSiteUrl()).toBe('http://localhost:3000');
  });

  it('falls back to localhost for malformed or unsupported URLs', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'not a URL';
    expect(getSiteUrl()).toBe('http://localhost:3000');

    process.env.NEXT_PUBLIC_SITE_URL = 'ftp://phevo.example';
    expect(getSiteUrl()).toBe('http://localhost:3000');
  });
});
