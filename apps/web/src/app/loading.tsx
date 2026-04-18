import { Loading as CommonLoading } from "@/shared/ui/common/loading";
import { getTranslations } from "next-intl/server";

export default async function Loading() {
  const t = await getTranslations("common");
  return (
    <CommonLoading height={"screen"} size="lg" title={t("loadingResources")} />
  );
}
