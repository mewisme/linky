"use client";

import { SignedIn, UserProfile } from '@clerk/nextjs'

import { WithHeader } from '@/components/layouts/with-header';
import { dark } from '@clerk/themes'

export default function UserProfilePage() {
  return (
    <WithHeader>
      <div className='w-full h-full'>
        <main className="flex min-h-screen items-center justify-center p-4">
          {/* eslint-disable-next-line react/no-unknown-property */}
          <style jsx global>{`
            .cl-navbar > div:nth-child(3) {
              display: none !important;
            }
          `}</style>
          <SignedIn>
            <UserProfile path="/user-profile" routing="path" appearance={{
              baseTheme: dark
            }}>
            </UserProfile>
          </SignedIn>
        </main>
      </div>
    </WithHeader>
  )
}

