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

const isAdminRoute = createRouteMatcher(['/admin(.*)']);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect(); // enforce authentication everywhere except public pages
  }
  // Extra layer: admins must actually BE logged in to reach /admin
  if (isAdminRoute(request)) {
    const { userId } = await auth();
    if (!userId) {
      await auth.redirectToSignIn({ redirectUrl: '/' });
    }
  }
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