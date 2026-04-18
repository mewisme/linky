import { getLocale } from "next-intl/server";

import { redirect } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

type AppLocale = (typeof routing.locales)[number];

export default async function UserPage() {
  const locale = (await getLocale()) as AppLocale;
  redirect({ href: "/user/profile", locale });
}