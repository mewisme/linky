import { ProgressClient } from "@/features/user/ui/progress-client";
import { getUserProgress } from "@/features/user/api/profile";

export default async function UserProgressPage() {
  const data = await getUserProgress();

  return <ProgressClient initialData={data} />;
}
