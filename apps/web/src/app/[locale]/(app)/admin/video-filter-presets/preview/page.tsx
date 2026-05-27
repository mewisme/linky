import { VideoFilterPreviewClient } from "@/features/admin/ui/video-filter-preview-client";
import { getAdminVideoFilterPresets } from "@/features/admin/api/video-filter-presets";

export default async function AdminVideoFilterPreviewPage() {
  const presets = await getAdminVideoFilterPresets();

  return <VideoFilterPreviewClient initialData={presets} />;
}
