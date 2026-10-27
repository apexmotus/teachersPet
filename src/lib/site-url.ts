/**
 * Canonical origin of the deployed app.
 *
 * Auth emails (confirmation, invitations) are rendered by Supabase, so the
 * redirect target has to be an absolute URL that is correct for the
 * environment the link was generated in — never `localhost` in production.
 *
 * Resolution order:
 *   1. NEXT_PUBLIC_SITE_URL   — set this to https://www.innobuntu.co.za in production
 *   2. VERCEL_PROJECT_PRODUCTION_URL / VERCEL_URL — server-side fallback on Vercel
 *   3. window.location.origin — client-side fallback (keeps previews working)
 *   4. http://localhost:3000  — local development
 *
 * `process.env.NEXT_PUBLIC_*` must be accessed as a literal member expression
 * so Next.js can inline it into the browser bundle at build time.
 */
const LOCAL_ORIGIN = 'http://localhost:3000'

function normalise(url: string): string {
  const withProtocol = /^https?:\/\//.test(url) ? url : `https://${url}`
  return withProtocol.replace(/\/+$/, '')
}

export function getSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return normalise(process.env.NEXT_PUBLIC_SITE_URL)
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return normalise(process.env.VERCEL_PROJECT_PRODUCTION_URL)
  }
  if (process.env.VERCEL_URL) return normalise(process.env.VERCEL_URL)
  if (typeof window !== 'undefined') return window.location.origin
  return LOCAL_ORIGIN
}

/** Absolute URL for an app-relative path, e.g. siteUrlFor('/auth/callback'). */
export function siteUrlFor(path: string): string {
  return `${getSiteUrl()}${path.startsWith('/') ? path : `/${path}`}`
}
