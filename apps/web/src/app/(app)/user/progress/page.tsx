import { UsersAPI } from "@/types/users.types";
import { ProgressClient } from "./progress-client";
import { backendUrl } from "@/lib/api/fetch/backend-url";
import { serverFetch } from "@/lib/api/fetch/server-api";
import { getUserTimezone } from "@/utils/timezone";

export default async function UserProgressPage() {
  const data = await serverFetch<UsersAPI.Progress.GetMe.Response>(
    backendUrl.users.progress(),
    {
      token: true,
      headers: { "x-user-timezone": getUserTimezone() },
    }
  );

  return <ProgressClient initialData={data} />;
}
