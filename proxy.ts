import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// ✅ Define routes that do NOT require authentication
const isPublicRoute = createRouteMatcher([
  "/",
  "/about(.*)",
  "/academics(.*)",
  "/news(.*)",
  "/admissions(.*)",
  "/contact(.*)",
  "/verify(.*)", // ✅ The new public verification page
  "/sign-in(.*)",
  "/sign-up(.*)",
]);

export default clerkMiddleware((auth, request) => {
  // Your app relies on Layouts (like app/admin/layout.tsx) to handle login redirects.
  // We intentionally do NOT call auth.protect() here to avoid breaking your existing layout logic.
  // This just ensures Clerk is aware of the public routes (like /verify) and skips them.
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
    // Clerk proxy path
    "/__clerk/:path*",
  ],
};