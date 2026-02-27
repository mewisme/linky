import { UserProfileClient } from './user-profile-client'
import { backendUrl } from '@/lib/api/fetch/backend-url'
import { serverFetch } from '@/lib/api/fetch/server-api'
import type { UsersAPI } from '@/types/users.types'

export default async function UserProfilePage() {
  const userDetails = await serverFetch<UsersAPI.UserDetails.GetMe.Response>(
    backendUrl.users.details(),
    { token: true }
  ).catch(() => null)

  return <UserProfileClient initialUserDetails={userDetails} />
}
