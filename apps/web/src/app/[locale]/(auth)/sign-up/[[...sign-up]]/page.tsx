"use client";

import { SignUp, useAuth } from "@clerk/nextjs";
import { useLocale } from "next-intl";
import { useMemo } from "react";

import { localePrefixedPath } from "@/i18n/locale-path";

export default function SignUpPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const locale = useLocale();
  const signUpPath = useMemo(() => localePrefixedPath(locale, "/sign-up"), [locale]);

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      {!isLoaded ? null : !isSignedIn ? (
        <SignUp oauthFlow="popup" path={signUpPath} />
      ) : null}
    </div>
  );
}

