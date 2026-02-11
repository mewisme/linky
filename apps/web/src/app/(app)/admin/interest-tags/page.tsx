import type { AdminAPI } from "@/types/admin.types";
import { InterestTagsClient } from "./interest-tags-client";
import { apiUrl } from "@/lib/api/fetch/api-url";
import { fetchData } from "@/lib/api/fetch/server-api";

async function fetchInterestTags(): Promise<AdminAPI.InterestTags.Get.Response> {
  return fetchData<AdminAPI.InterestTags.Get.Response>(apiUrl.admin.interestTags(), { token: true });
}

export default async function InterestTagsPage() {
  const interestTags = await fetchInterestTags();

  return <InterestTagsClient initialData={interestTags} />;
}
