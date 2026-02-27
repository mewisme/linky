'use client';

import {
  IconAlertTriangle,
  IconHome,
  IconRefresh,
} from "@tabler/icons-react";

import * as Sentry from "@sentry/nextjs";
import { Outfit } from "next/font/google";
import { useEffect } from "react";
import { Button } from "@ws/ui/components/ui/button";
import Link from "next/link";

const outfit = Outfit({
  subsets: ["latin"],
});

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              :root {
                --radius: 0.625rem;
                --background: oklch(1 0 0);
                --foreground: oklch(0.145 0 0);
                --primary: oklch(0.205 0 0);
                --primary-foreground: oklch(0.985 0 0);
                --secondary: oklch(0.97 0 0);
                --secondary-foreground: oklch(0.205 0 0);
                --muted: oklch(0.97 0 0);
                --muted-foreground: oklch(0.556 0 0);
                --destructive: oklch(0.577 0.245 27.325);
                --destructive-foreground: oklch(0.97 0.01 17);
                --border: oklch(0.922 0 0);
                --ring: oklch(0.708 0 0);
              }
              @media (prefers-color-scheme: dark) {
                :root {
                  --background: oklch(0.145 0 0);
                  --foreground: oklch(0.985 0 0);
                  --primary: oklch(0.922 0 0);
                  --primary-foreground: oklch(0.205 0 0);
                  --secondary: oklch(0.269 0 0);
                  --secondary-foreground: oklch(0.985 0 0);
                  --muted: oklch(0.269 0 0);
                  --muted-foreground: oklch(0.708 0 0);
                  --destructive: oklch(0.704 0.191 22.216);
                  --destructive-foreground: oklch(0.58 0.22 27);
                  --border: oklch(1 0 0 / 10%);
                  --ring: oklch(0.556 0 0);
                }
              }
              * { box-sizing: border-box; }
              html { height: 100%; }
              body { margin: 0; min-height: 100dvh; }
            `,
          }}
        />
      </head>
      <body
        className={`relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-background px-6 ${outfit.className}`}
      >
        <div className="absolute inset-0 -z-10 flex items-center justify-center">
          <div className="h-[400px] w-[400px] rounded-full bg-destructive/5 blur-[120px]" />
        </div>

        <div className="mx-auto flex max-w-[540px] flex-col items-center text-center">
          <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10 ring-8 ring-destructive/5">
            <IconAlertTriangle
              size={40}
              stroke={1.5}
              className="text-destructive"
            />
          </div>

          <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl">
            Something went wrong!
          </h1>

          <p className="mb-10 text-lg text-muted-foreground">
            An unexpected error occurred while processing your request. Our team
            has been notified and we&apos;re working to fix it.
          </p>

          <div className="flex w-full flex-col-reverse gap-3 sm:flex-row sm:justify-center sm:gap-4">
            <Button
              variant="outline"
              size="lg"
              onClick={() => reset()}
              className="group border-border px-8 font-medium hover:bg-secondary"
            >
              <IconRefresh
                size={18}
                className="mr-2 transition-transform duration-500 group-hover:rotate-180"
              />
              Try again
            </Button>

            <Button
              variant="default"
              size="lg"
              className="px-8 font-medium shadow-lg shadow-primary/20"
              asChild
            >
              <Link href="/">
                <IconHome size={18} className="mr-2" />
                Go to Home
              </Link>
            </Button>
          </div>

          <div className="mt-12 w-full rounded-xl border border-border/50 bg-muted/30 p-4 text-left">
            <div className="mb-2 flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-muted-foreground">
              <span className="h-2 w-2 animate-pulse rounded-full bg-destructive" />
              Error Reference
            </div>
            <code className="block break-all rounded bg-destructive/5 p-2 text-sm font-mono text-destructive/80">
              {error.digest ?? "ERR_RUNTIME_EXCEPTION"}
            </code>
          </div>
        </div>

        <div className="absolute inset-0 -z-20 h-full w-full bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] bg-size-[24px_24px] opacity-20 mask-[radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)]" />
      </body>
    </html>
  );
}
