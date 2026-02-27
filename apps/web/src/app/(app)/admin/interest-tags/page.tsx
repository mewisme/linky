import type { AdminAPI } from "@/types/admin.types";
import { InterestTagsClient } from "./interest-tags-client";
import { backendUrl } from "@/lib/api/fetch/backend-url";
import { serverFetch } from "@/lib/api/fetch/server-api";

export default async function InterestTagsPage() {
  const interestTags = await serverFetch<AdminAPI.InterestTags.Get.Response>(
    backendUrl.admin.interestTags(),
    { token: true }
  );

  return <InterestTagsClient initialData={interestTags} />;
}
