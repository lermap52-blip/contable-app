import { NextResponse } from 'next/server'

export async function middleware(req) {
  const token = req.cookies.get('sb-vutwcjjzufystleuefnz-auth-token')
  const isAuthPage = req.nextUrl.pathname.startsWith('/auth')

  if (!token && !isAuthPage) {
    return NextResponse.redirect(new URL('/auth/login', req.url))
  }

  if (token && isAuthPage) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
}