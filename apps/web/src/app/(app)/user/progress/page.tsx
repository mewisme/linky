import { UsersAPI } from "@/types/users.types";
import { ProgressClient } from "./progress-client";
import { getUserProgress } from "@/lib/actions/user/profile";
import { getUserTimezone } from "@/utils/timezone";

export default async function UserProgressPage() {
  const data = await getUserProgress(getUserTimezone());

  return <ProgressClient initialData={data} />;
}
