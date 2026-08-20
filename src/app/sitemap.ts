import { MetadataRoute } from 'next';
import prisma from '@/lib/prisma';
import { getBaseUrl } from '@/lib/url';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getBaseUrl();

  const colleges = await prisma.college.findMany({
    select: { slug: true }
  });

  const properties = await prisma.property.findMany({
    where: {
      deletedAt: null,
      closedAt: null,
    },
    select: { slug: true, updatedAt: true }
  });

  const staticRoutes = [
    '',
    '/search',
    '/kolhapur/room-rates',
    '/verification',
    '/about',
    '/list-your-pg',
  ].map(route => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
  }));

  const collegeRoutes = colleges.map(college => ({
    url: `${baseUrl}/kolhapur/${college.slug}`,
    lastModified: new Date(),
  }));

  const propertyRoutes = properties.map(property => ({
    url: `${baseUrl}/pg/${property.slug}`,
    lastModified: property.updatedAt,
  }));

  return [...staticRoutes, ...collegeRoutes, ...propertyRoutes];
}
