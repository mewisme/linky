import { BlockedUsersClient } from './blocked-users-client'
import type { BlockedUsersResponse } from '@/types/notifications.types'
import { backendUrl } from '@/lib/api/fetch/backend-url'
import { serverFetch } from '@/lib/api/fetch/server-api'

export default async function BlockedUsersPage() {
  const data = await serverFetch<BlockedUsersResponse>(
    backendUrl.users.blocksMe(),
    { token: true }
  )

  return <BlockedUsersClient initialData={data.blocked_users} />
}
