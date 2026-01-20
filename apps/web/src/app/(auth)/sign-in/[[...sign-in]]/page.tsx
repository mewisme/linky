"use client";

import { SignIn, SignedIn, SignedOut } from "@clerk/nextjs";

import Link from "next/link";
import { dark } from "@clerk/themes";
import { useMemo } from "react";
import { useSearchParams } from "next/navigation";

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
      {/* eslint-disable-next-line react/no-unknown-property */}
      <style jsx global>{`
        .cl-footer > div:last-child {
          display: none !important;
        }
      `}</style>
      <SignedOut>
        <SignIn
          routing="path"
          path="/sign-in"
          fallbackRedirectUrl={redirectUrl}
          appearance={{
            baseTheme: dark
          }}
        />
      </SignedOut>
      <SignedIn treatPendingAsSignedOut={false}>
        <Link href={redirectUrl}>
          Proceed to redirect URL
        </Link>
      </SignedIn>
    </div>
  );
}