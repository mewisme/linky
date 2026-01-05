"use client";

import { SignIn, SignedOut } from "@clerk/nextjs";

import { dark } from "@clerk/themes";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      {/* eslint-disable-next-line react/no-unknown-property */}
      <style jsx global>{`
        .cl-footer > div:last-child {
          display: none !important;
        }
      `}</style>
      <SignedOut>
        <SignIn oauthFlow="popup" path="/sign-in" appearance={{
          baseTheme: dark
        }} />
      </SignedOut>
    </div>
  );
}

