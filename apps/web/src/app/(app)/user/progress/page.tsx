import { ProgressClient } from "./progress-client";
import { getUserProgress } from "@/lib/actions/user/profile";

export default async function UserProgressPage() {
  const data = await getUserProgress();

  return <ProgressClient initialData={data} />;
}
