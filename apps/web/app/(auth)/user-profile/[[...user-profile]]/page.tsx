"use client";

import { Header } from '@/components/header'
import { UserProfile } from '@clerk/nextjs'
import { dark } from '@clerk/themes'

export default function UserProfilePage() {
  return (
    <>
      <Header />
      <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
        <UserProfile appearance={{
          baseTheme: dark
        }}
        />
      </main>
    </>
  )
}

