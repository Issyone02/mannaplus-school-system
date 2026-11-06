import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// ✅ Define routes that do NOT require authentication
const isPublicRoute = createRouteMatcher([
  "/",
  "/about(.*)",
  "/academics(.*)",
  "/news(.*)",
  "/admissions(.*)",
  "/contact(.*)",
  "/verify(.*)", // ✅ Public verification page
  "/sign-in(.*)",
  "/sign-up(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  // Protect all non-public routes by requiring a valid session
  if (!isPublicRoute(request)) {
    await auth.protect();
  }

  // ✅ Create response and add security headers
  const response = NextResponse.next();

  // Remove sensitive headers
  response.headers.delete('X-Powered-By');
  response.headers.delete('X-AspNet-Version');
  response.headers.delete('X-AspNetMvc-Version');

  // Security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  );
  response.headers.set('X-DNS-Prefetch-Control', 'on');
  response.headers.set('X-XSS-Protection', '1; mode=block');

  return response;
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
    // Clerk proxy path
    "/__clerk/:path*",
  ],
};