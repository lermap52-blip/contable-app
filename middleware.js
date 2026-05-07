import { NextResponse } from 'next/server'

export async function middleware(req) {
  const { pathname } = req.nextUrl
  const isAuthPage = pathname.startsWith('/auth')

  // Buscar cualquier cookie de sesion de Supabase
  const cookies = req.cookies.getAll()
  const hasSession = cookies.some(c => 
    c.name.includes('supabase') || 
    c.name.includes('sb-') || 
    c.name.includes('auth-token')
  )

  if (!hasSession && !isAuthPage) {
    return NextResponse.redirect(new URL('/auth/login', req.url))
  }

  if (hasSession && isAuthPage) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|_next/data).*)']
}