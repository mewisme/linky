"use client";

import { SignIn, useAuth } from "@clerk/nextjs";
import { useRouter } from "@/i18n/navigation";
import { localePrefixedPath } from "@/i18n/locale-path";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo } from "react";
import { Button } from "@ws/ui/components/ui/button";

function SignedInRedirect({ href }: { href: string }) {
  const router = useRouter();
  const t = useTranslations("authPage");

  useEffect(() => {
    router.replace(href);
  }, [router, href]);

  return (
    <div className="flex flex-col items-center justify-center">
      <p className="text-muted-foreground text-center text-sm">{t("redirecting")}</p>
      <Button onClick={() => router.push(href)}>
        {t("proceedToUrl")}
      </Button>
    </div>
  );
}

export default function SignInPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const locale = useLocale();
  const searchParams = useSearchParams();
  const signInPath = useMemo(() => localePrefixedPath(locale, "/sign-in"), [locale]);

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
      {!isLoaded ? null : !isSignedIn ? (
        <SignIn
          routing="path"
          path={signInPath}
          fallbackRedirectUrl={redirectUrl}
        />
      ) : (
        <SignedInRedirect href={redirectUrl} />
      )}
    </div>
  );
}