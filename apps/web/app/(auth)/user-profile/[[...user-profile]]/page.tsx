"use client";

import { SignedIn, UserProfile } from '@clerk/nextjs'

import { dark } from '@clerk/themes'

export default function UserProfilePage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      {/* eslint-disable-next-line react/no-unknown-property */}
      <style jsx global>{`
        .cl-navbar > div:nth-child(3) {
          display: none !important;
        }
      `}</style>
      <SignedIn>
        <UserProfile appearance={{
          baseTheme: dark
        }}
        />
      </SignedIn>
    </main>
  )
}

