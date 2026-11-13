import { MetadataRoute } from 'next';
import { ALL_CATALOG_VEHICLES } from '../lib/catalog';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://www.askrevdrive.com';

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/bikes`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/auth/login`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/auth/register`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/simulator`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ];

  const vehicleRoutes: MetadataRoute.Sitemap = ALL_CATALOG_VEHICLES.map((vehicle) => ({
    url: `${baseUrl}/bikes/${vehicle.modelCode}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  return [...staticRoutes, ...vehicleRoutes];
}
