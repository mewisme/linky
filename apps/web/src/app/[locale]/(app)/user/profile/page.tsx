import { UserProfileClient } from "@/features/user/ui/profile";
import { getUserDetails } from "@/features/user/api/profile";

export default async function UserProfilePage() {
  const userDetails = await getUserDetails().catch(() => null)

  return <UserProfileClient initialUserDetails={userDetails} />
}
