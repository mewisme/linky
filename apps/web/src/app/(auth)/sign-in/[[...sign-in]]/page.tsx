"use client";

import { SignIn, SignedIn, SignedOut } from "@clerk/nextjs";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo } from "react";

function SignedInRedirect({ href }: { href: string }) {
  const router = useRouter();

  useEffect(() => {
    router.replace(href);
  }, [router, href]);

  return (
    <p className="text-muted-foreground text-center text-sm">Redirecting…</p>
  );
}

export default function SignInPage() {
  const searchParams = useSearchParams();

  const redirectUrl = useMemo(() => {
    const redirect = searchParams.get("redirect_url");
    if (!redirect) return "/";

    try {
      const url = new URL(redirect);
      return url.pathname + url.search;
    } catch {
      return redirect.startsWith("/") ? redirect : "/";
    }
  }, [searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <SignedOut>
        <SignIn
          routing="path"
          path="/sign-in"
          fallbackRedirectUrl={redirectUrl}
        />
      </SignedOut>
      <SignedIn treatPendingAsSignedOut={false}>
        <SignedInRedirect href={redirectUrl} />
      </SignedIn>
    </div>
  );
}