import { UserProfileClient } from './user-profile-client'
import { getUserDetails } from '@/lib/actions/user/profile'

export default async function UserProfilePage() {
  const userDetails = await getUserDetails().catch(() => null)

  return <UserProfileClient initialUserDetails={userDetails} />
}
