import { BlockedUsersClient } from "@/features/user/ui/blocked-users-client";
import { getBlockedUsers } from "@/features/user/api/blocks";

export default async function BlockedUsersPage() {
  const data = await getBlockedUsers()

  return <BlockedUsersClient initialData={data.blocked_users} />
}
