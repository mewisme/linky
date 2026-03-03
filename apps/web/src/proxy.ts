import * as Sentry from "@sentry/nextjs";

import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

import { NextResponse, type NextProxy } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/privacy(.*)",
  "/terms(.*)",
  "/changelogs(.*)",
  "/og(.*)",
  "/api/(.*)",
  "/test(.*)",
  "/monitoring(.*)",
  "/robots.txt(.*)",
  "/sitemap.xml(.*)",
  "/manifest(.*)"
]);

const proxy = clerkMiddleware(async (auth, request) => {
  Sentry.metrics.count("requests", 1, {
    attributes: {
      path: request.nextUrl.pathname,
      method: request.method,
    },
  });

  if (!isPublicRoute(request)) {
    if (request.method === "GET") {
      await auth.protect();
    } else {
      return NextResponse.next()
    }
  }
});

export default proxy as unknown as NextProxy;

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
