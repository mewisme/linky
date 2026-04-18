import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import createIntlMiddleware from "next-intl/middleware";
import { NextResponse, type NextProxy } from "next/server";

import { routing } from "./i18n/routing";

const intlMiddleware = createIntlMiddleware(routing);

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/privacy(.*)",
  "/terms(.*)",
  "/cookies(.*)",
  "/og(.*)",
  "/vi",
  "/vi/sign-in(.*)",
  "/vi/sign-up(.*)",
  "/vi/privacy(.*)",
  "/vi/terms(.*)",
  "/vi/cookies(.*)",
  "/vi/og(.*)",
  "/api/(.*)",
  "/test(.*)",
  "/monitoring(.*)",
  "/robots.txt(.*)",
  "/sitemap.xml(.*)",
  "/manifest(.*)",
  "/sounds(.*)",
  "/offline.html(.*)",
  "/sw.js(.*)",
]);

const proxy = clerkMiddleware(async (auth, request) => {
  const pathname = request.nextUrl.pathname;
  if (pathname.startsWith("/api") || pathname.startsWith("/trpc")) {
    if (!isPublicRoute(request)) {
      await auth.protect();
    }
    return NextResponse.next();
  }
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
  return intlMiddleware(request);
});

export default proxy as unknown as NextProxy;

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest|mp3|wav|ogg|m4a|aac|opus|flac|json|map|txt|avif|pdf|wasm)).*)",
    "/(api|trpc)(.*)",
  ],
};
