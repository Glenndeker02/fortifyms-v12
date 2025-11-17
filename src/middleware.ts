import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

/**
 * Next.js Middleware for Route Protection
 *
 * This middleware runs before every request and handles:
 * 1. Authentication - Protects all routes except public ones
 * 2. Role-based access control - Ensures users can only access authorized routes
 * 3. Rate limiting - Prevents abuse (TODO: Implement with Redis in production)
 * 4. Request logging - Logs all requests for audit (development only)
 *
 * Reference: TODO.md Phase 1, rules.md Rule #6 (Security at Every Layer)
 */

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/api/auth',
  '/api/health',
];

// API routes that require authentication
const PROTECTED_API_ROUTES = [
  '/api/batches',
  '/api/qc',
  '/api/compliance',
  '/api/diagnostics',
  '/api/training',
  '/api/maintenance',
  '/api/procurement',
  '/api/logistics',
  '/api/mills',
  '/api/users',
  '/api/analytics',
  '/api/notifications',
  '/api/dashboards',
  '/api/alerts',
  '/api/action-items',
];

// Role-based route access control
const ROLE_ROUTES: Record<string, string[]> = {
  MILL_OPERATOR: [
    '/dashboard/operator',
    '/batches',
    '/qc',
    '/diagnostics',
    '/training',
    '/maintenance',
  ],
  MILL_MANAGER: [
    '/dashboard/manager',
    '/batches',
    '/qc',
    '/compliance',
    '/diagnostics',
    '/training',
    '/maintenance',
    '/procurement',
    '/logistics',
    '/analytics',
  ],
  FWGA_INSPECTOR: [
    '/dashboard/inspector',
    '/qc',
    '/compliance',
    '/mills',
    '/analytics',
    '/users',
  ],
  FWGA_PROGRAM_MANAGER: [
    '/dashboard/program-manager',
    '/compliance',
    '/procurement',
    '/mills',
    '/analytics',
    '/users',
  ],
  INSTITUTIONAL_BUYER: [
    '/dashboard/buyer',
    '/procurement',
    '/logistics',
    '/mills',
  ],
  LOGISTICS_PLANNER: [
    '/dashboard/logistics',
    '/logistics',
    '/analytics',
  ],
  SYSTEM_ADMIN: [
    '/dashboard/manager', // Admins use manager dashboard
    '/batches',
    '/qc',
    '/compliance',
    '/diagnostics',
    '/training',
    '/maintenance',
    '/procurement',
    '/logistics',
    '/mills',
    '/analytics',
    '/users',
  ],
};

/**
 * Check if a route is public (doesn't require authentication)
 */
function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => pathname.startsWith(route));
}

/**
 * Check if user has access to the requested route based on their role
 */
function hasRoleAccess(role: string, pathname: string): boolean {
  // System admins have access to everything
  if (role === 'SYSTEM_ADMIN') {
    return true;
  }

  // Get allowed routes for this role
  const allowedRoutes = ROLE_ROUTES[role] || [];

  // Check if the pathname starts with any of the allowed routes
  return allowedRoutes.some((route) => pathname.startsWith(route));
}

/**
 * Main middleware function
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Log requests in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Middleware] ${request.method} ${pathname}`);
  }

  // Allow public routes
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Get the user's session token
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // Redirect to login if not authenticated
  if (!token) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(url);
  }

  // Check role-based access for protected routes
  const userRole = token.role as string;

  // Allow access to shared routes (profile, settings, notifications)
  if (
    pathname.startsWith('/profile') ||
    pathname.startsWith('/settings') ||
    pathname.startsWith('/notifications')
  ) {
    return NextResponse.next();
  }

  // Check role-based access
  if (!hasRoleAccess(userRole, pathname)) {
    // User doesn't have access to this route
    console.warn(`[Middleware] Access denied: ${userRole} attempted to access ${pathname}`);

    // Redirect to their default dashboard
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  // TODO: Implement rate limiting
  // For production, use Redis to track request counts per user/IP
  // Example:
  // const rateLimit = await checkRateLimit(token.sub, request.ip);
  // if (rateLimit.exceeded) {
  //   return new NextResponse('Too Many Requests', { status: 429 });
  // }

  // Add user info to request headers for API routes
  if (pathname.startsWith('/api/')) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', token.sub as string);
    requestHeaders.set('x-user-role', userRole);
    requestHeaders.set('x-user-email', token.email as string);

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  return NextResponse.next();
}

/**
 * Middleware configuration
 * Specify which routes the middleware should run on
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * 1. _next/static (static files)
     * 2. _next/image (image optimization files)
     * 3. favicon.ico (favicon file)
     * 4. public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
