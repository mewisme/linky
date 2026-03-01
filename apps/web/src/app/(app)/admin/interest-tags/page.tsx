import { InterestTagsClient } from '@/features/admin/ui/interest-tags-client';
import { getAdminInterestTags } from "@/features/admin/api/interest-tags";

export default async function AdminInterestTagsPage() {
  const interestTags = await getAdminInterestTags();

  return <InterestTagsClient initialData={interestTags} />;
}
