import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

import { NextResponse, type NextProxy } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/privacy(.*)",
  "/terms(.*)",
  "/og(.*)",
  "/api/(.*)",
  "/test(.*)",
  "/monitoring(.*)",
  "/robots.txt(.*)",
  "/sitemap.xml(.*)",
  "/manifest(.*)"
]);

const proxy = clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export default proxy as unknown as NextProxy;

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
