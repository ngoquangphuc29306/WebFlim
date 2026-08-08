import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://vsmov.com';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/tim-kiem', '/api/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
