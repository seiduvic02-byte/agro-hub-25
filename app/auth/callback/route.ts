import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const next = url.searchParams.get('next') ?? '/'
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: (cookiesToSet) => cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } },
  )
  if (!code) {
    return NextResponse.redirect(new URL('/?auth_error=missing_code', url.origin))
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    const errorUrl = new URL('/', url.origin)
    errorUrl.searchParams.set('auth_error', 'google_callback_failed')
    return NextResponse.redirect(errorUrl)
  }

  return NextResponse.redirect(new URL(next, url.origin))
}
