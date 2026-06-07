import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  const redirectTo = NextResponse.redirect(`${origin}/`)

  if (!code) return redirectTo

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            redirectTo.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  try {
    await supabase.auth.exchangeCodeForSession(code)
  } catch (e) {
    console.error('Auth callback error:', e)
  }

  return redirectTo
}
