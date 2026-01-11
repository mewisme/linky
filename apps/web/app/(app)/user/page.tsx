'use client'

import { useUser } from "@clerk/nextjs";

export default function UserProfilePage() {
  const { user } = useUser();
  return (
    <div>
      <h1>User Dashboard</h1>
    </div>
  )
}