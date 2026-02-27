import { BlockedUsersClient } from './blocked-users-client'
import { getBlockedUsers } from '@/lib/actions/user/blocks'

export default async function BlockedUsersPage() {
  const data = await getBlockedUsers()

  return <BlockedUsersClient initialData={data.blocked_users} />
}
