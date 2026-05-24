import { VideoFilterPresetsClient } from '@/features/admin/ui/video-filter-presets-client';
import { getAdminVideoFilterPresets } from "@/features/admin/api/video-filter-presets";

export default async function AdminVideoFilterPresetsPage() {
  const presets = await getAdminVideoFilterPresets();

  return <VideoFilterPresetsClient initialData={presets} />;
}
