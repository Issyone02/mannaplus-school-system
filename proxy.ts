import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

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