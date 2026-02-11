'use client';

import {
  IconArrowLeft,
  IconError404,
  IconHomeLink,
} from "@tabler/icons-react";

import { Button } from "@ws/ui/components/ui/button";
import Link from "next/link";
import { Outfit } from "next/font/google";
import { useRouter } from "next/navigation";

const outfit = Outfit({
  subsets: ["latin"],
});

export default function NotFound() {
  const router = useRouter();
  return (
    <div className={`relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-background px-6 ${outfit.className}`}>
      <div className="absolute top-0 left-0 -z-10 h-full w-full">
        <div className="absolute top-[-10%] left-[-10%] h-[40%] w-[40%] rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] h-[40%] w-[40%] rounded-full bg-primary/10 blur-[120px]" />
      </div>

      <div className="mx-auto flex max-w-[540px] flex-col items-center text-center">
        <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-2xl bg-secondary ring-1 ring-border shadow-sm">
          <IconError404 size={48} stroke={1.5} className="text-primary" />
        </div>

        <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl">
          Page not found
        </h1>

        <p className="mb-10 text-lg text-muted-foreground">
          Sorry, we couldn&apos;t find the page you&apos;re looking for. It might have been moved,
          deleted, or the URL might be mistyped.
        </p>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:gap-4">
          <Button
            variant="outline"
            size="lg"
            className="group px-6 font-medium transition-all hover:bg-secondary"
            onClick={() => router.back()}
          >
            <IconArrowLeft size={18} className="mr-2 transition-transform group-hover:-translate-x-1" />
            Go back
          </Button>

          <Button
            variant="default"
            size="lg"
            className="px-6 font-medium shadow-lg shadow-primary/20"
            asChild
          >
            <Link href="/">
              <IconHomeLink size={18} className="mr-2" />
              Back to Dashboard
            </Link>
          </Button>
        </div>
      </div>

      <div className="absolute inset-0 -z-20 h-full w-full bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-size-[14px_24px] mask-[radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
    </div>
  );
}