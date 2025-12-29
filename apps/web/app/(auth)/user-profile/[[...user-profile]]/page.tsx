"use client";

import { UserProfile } from '@clerk/nextjs'
import { dark } from '@clerk/themes'

export default function UserProfilePage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <UserProfile appearance={{
        baseTheme: dark
      }}
      />
    </main>
  )
}

