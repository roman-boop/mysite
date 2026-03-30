import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  return [
    { url: `${base}/homepage`, lastModified: new Date('2026-03-22'), priority: 1.0 },
    { url: `${base}/algotrading`, lastModified: new Date('2026-03-22'), priority: 0.8 },
    { url: `${base}/learning`, lastModified: new Date('2026-03-22'), priority: 0.8 },
  ];
}