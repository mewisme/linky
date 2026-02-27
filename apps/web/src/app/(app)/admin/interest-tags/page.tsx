import { InterestTagsClient } from './interest-tags-client';
import { getAdminInterestTags } from "@/lib/actions/admin/interest-tags";

export default async function AdminInterestTagsPage() {
  const interestTags = await getAdminInterestTags();

  return <InterestTagsClient initialData={interestTags} />;
}
