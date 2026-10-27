import type { MetadataRoute } from 'next'
import { getSiteUrl } from '@/lib/site-url'

const siteUrl = getSiteUrl()

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/login', '/register'],
      disallow: [
        '/dashboard',
        '/attendance',
        '/learners',
        '/lesson-plans',
        '/announcements',
        '/profile',
        '/classes',
        '/onboarding',
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}
