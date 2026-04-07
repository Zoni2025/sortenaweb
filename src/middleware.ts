import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Se não está logado e tenta acessar o dashboard → login
  if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    return NextResponse.redirect(url)
  }

  // Se está logado e tenta acessar o dashboard → verificar aprovação
  if (user && request.nextUrl.pathname.startsWith('/dashboard')) {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('subscription_status, role')
      .eq('id', user.id)
      .single()

    // Se a query falhou OU o perfil não existe → bloquear acesso
    if (error || !profile) {
      const url = request.nextUrl.clone()
      url.pathname = '/auth/pending'
      return NextResponse.redirect(url)
    }

    // Se não é admin E não está aprovado → página de pendente
    if (profile.role !== 'admin' && profile.subscription_status !== 'active') {
      const url = request.nextUrl.clone()
      url.pathname = '/auth/pending'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/dashboard/:path*'],
}
