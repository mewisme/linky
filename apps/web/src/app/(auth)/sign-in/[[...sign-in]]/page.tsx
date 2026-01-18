"use client";

import { SignIn, SignedIn, SignedOut, useAuth } from "@clerk/nextjs";
import { useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@repo/ui/components/ui/button";
import { dark } from "@clerk/themes";

export default function SignInPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isSignedIn } = useAuth();

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

  useEffect(() => {
    if (isSignedIn && redirectUrl) {
      router.push(redirectUrl);
    }
  }, [isSignedIn, redirectUrl, router]);

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
      <SignedIn>
        <div className="flex flex-col items-center justify-center gap-4">
          <p>You are already signed in</p>
          <Button onClick={() => router.push(redirectUrl)} variant="outline">Go to the redirect url</Button>
        </div>
      </SignedIn>
    </div>
  );
}

