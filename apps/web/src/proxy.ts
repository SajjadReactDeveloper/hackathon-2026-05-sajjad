import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from './lib/supabase/middleware';

const PUBLIC_PATHS = ['/', '/login', '/signup', '/auth/callback'];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAppRoute = pathname.startsWith('/dashboard') ||
    pathname.startsWith('/inbox') ||
    pathname.startsWith('/orders') ||
    pathname.startsWith('/contacts') ||
    pathname.startsWith('/products') ||
    pathname.startsWith('/broadcasts') ||
    pathname.startsWith('/knowledge-base') ||
    pathname.startsWith('/flows') ||
    pathname.startsWith('/rules') ||
    pathname.startsWith('/analytics') ||
    pathname.startsWith('/lost-sales') ||
    pathname.startsWith('/settings') ||
    pathname.startsWith('/onboarding');

  const { response, user } = await updateSession(request);

  if (isAppRoute && !user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if ((pathname === '/login' || pathname === '/signup') && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
