import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/lib/types/database'

function getSafeNextPath(next: string | null) {
  if (next?.startsWith('/') && !next.startsWith('//')) return next
  return '/onboarding'
}

function confirmationFailedResponse(request: NextRequest) {
  const url = new URL('/register', request.url)
  url.searchParams.set('confirmation', 'failed')
  return NextResponse.redirect(url)
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  if (!code) return confirmationFailedResponse(request)

  const redirectUrl = request.nextUrl.clone()
  redirectUrl.pathname = getSafeNextPath(request.nextUrl.searchParams.get('next'))
  redirectUrl.search = ''
  const response = NextResponse.redirect(redirectUrl)

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) return confirmationFailedResponse(request)

  return response
}
