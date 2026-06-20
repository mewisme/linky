import { Loading as CommonLoading } from "@/shared/ui/common/loading";
import { getLocale, setRequestLocale } from "next-intl/server";

export default async function Loading() {
  const locale = await getLocale();
  setRequestLocale(locale);
  return (
    <CommonLoading variant="screen" size={100} />
  );
}
