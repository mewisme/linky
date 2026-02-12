import { UsersAPI } from "@/types/users.types";
import { ProgressClient } from "./progress-client";
import { apiUrl } from "@/lib/api/fetch/api-url";
import { fetchData } from "@/lib/api/fetch/server-api";
import { getUserTimezone } from "@/utils/timezone";

async function fetchProgress(): Promise<UsersAPI.Progress.GetMe.Response> {
  return fetchData<UsersAPI.Progress.GetMe.Response>(
    apiUrl.users.progress(),
    {
      token: true,
      headers: {
        "x-user-timezone": getUserTimezone(),
      },
    }
  );
}

export default async function UserProgressPage() {
  const data = await fetchProgress();
  return <ProgressClient initialData={data} />;
}
