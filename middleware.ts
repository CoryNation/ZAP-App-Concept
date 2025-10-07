import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Define redirects from old routes to new IA paths
  const redirects: Record<string, string> = {
    '/factory-performance': '/operations/line-speed',
    '/work-requests': '/requests',
    '/greasy-twin': '/operations/greasy-twin',
    '/inventory': '/operations/line-speed', // Placeholder redirect
  };

  // Check if the pathname matches any redirect
  if (redirects[pathname]) {
    const url = request.nextUrl.clone();
    url.pathname = redirects[pathname];
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// Configure which routes should be checked by the middleware
export const config = {
  matcher: [
    '/factory-performance',
    '/work-requests',
    '/greasy-twin',
    '/inventory',
  ],
};

