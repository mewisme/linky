"use client";

import { SignIn, useAuth } from "@clerk/nextjs";
import { useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";

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
      <SignIn
        routing="path"
        path="/sign-in"
        fallbackRedirectUrl={redirectUrl}
        appearance={{
          baseTheme: dark
        }}
      />
    </div>
  );
}

