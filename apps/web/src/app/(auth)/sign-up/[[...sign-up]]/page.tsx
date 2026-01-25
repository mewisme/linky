"use client";

import { SignUp, SignedOut } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <SignedOut>
        <SignUp oauthFlow="popup" path="/sign-up" />
      </SignedOut>
    </div>
  );
}

