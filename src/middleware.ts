import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

// Role-based route access matrix
const ROLE_ACCESS: Record<string, string[]> = {
  READER: ['/dashboard', '/documents', '/search', '/annuaire', '/profil', '/parametres'],
  MEMBER: ['/dashboard', '/documents', '/search', '/annuaire', '/profil', '/parametres'],
  ADMIN: ['/dashboard', '/documents', '/search', '/annuaire', '/profil', '/parametres', '/admin', '/corbeille'],
}

function hasRouteAccess(role: string, pathname: string): boolean {
  const allowedRoutes = ROLE_ACCESS[role]
  if (!allowedRoutes) return false
  return allowedRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + '/')
  )
}

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const pathname = req.nextUrl.pathname
    const role = (token?.role as string) ?? 'READER'

    // Admin-only routes
    if ((pathname.startsWith('/admin') || pathname.startsWith('/corbeille')) && role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }

    // Role-based route protection
    if (!hasRouteAccess(role, pathname)) {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
)

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/documents/:path*',
    '/search/:path*',
    '/admin/:path*',
    '/annuaire/:path*',
    '/profil/:path*',
    '/parametres/:path*',
    '/corbeille/:path*',
  ],
}
