import { MetadataRoute } from 'next';
import { getBaseUrl } from '@/lib/url';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getBaseUrl();

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/mess', '/my-mess'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
