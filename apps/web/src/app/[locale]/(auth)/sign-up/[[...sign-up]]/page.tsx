"use client";

import { SignUp, useAuth } from "@clerk/nextjs";

export default function SignUpPage() {
  const { isLoaded, isSignedIn } = useAuth();

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      {!isLoaded ? null : !isSignedIn ? (
        <SignUp oauthFlow="popup" path="/sign-up" />
      ) : null}
    </div>
  );
}

