"use client";

import { SignUp, SignedOut } from "@clerk/nextjs";

import { dark } from "@clerk/themes";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      {/* eslint-disable-next-line react/no-unknown-property */}
      <style jsx global>{`
        .cl-footer > div:last-child {
          display: none !important;
        }
      `}</style>
      <SignedOut>
        <SignUp oauthFlow="popup" path="/sign-up" appearance={{
          baseTheme: dark
        }} />
      </SignedOut>
    </div>
  );
}

