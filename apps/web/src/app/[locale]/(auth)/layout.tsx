import { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { routing } from "@/i18n/routing";

type AppLocale = (typeof routing.locales)[number];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: localeParam } = await params;
  const locale = localeParam as AppLocale;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "authPage" });
  const title = t("layoutTitle");
  const description = t("layoutDescription");
  const images = [`/og/simple?title=${encodeURIComponent(title)}`];

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images,
    },
  };
}

interface AuthLayoutProps {
  children: React.ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return children
}