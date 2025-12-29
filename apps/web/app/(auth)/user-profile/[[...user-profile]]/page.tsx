"use client";

import { SignedIn, UserProfile } from '@clerk/nextjs'

import { dark } from '@clerk/themes'

export default function UserProfilePage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <SignedIn>
        <UserProfile appearance={{
          baseTheme: dark
        }}
        />
      </SignedIn>
    </main>
  )
}

