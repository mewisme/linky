import { Loading as CommonLoading } from "@/shared/ui/common/loading";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";

export default async function Loading() {
  const locale = await getLocale();
  setRequestLocale(locale);
  const t = await getTranslations("common");
  return (
    <CommonLoading height={"screen"} size="lg" title={t("loadingResources")} />
  );
}
