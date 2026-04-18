import { MarketingProviders } from "@/features/marketing/ui/marketing-providers";
import { routing } from "@/i18n/routing";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { publicEnv } from "@/shared/env/public-env";

type AppLocale = (typeof routing.locales)[number];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: localeParam } = await params;
  const locale = localeParam as AppLocale;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "marketing" });
  const appUrl = publicEnv.APP_URL;
  const title = t("layout.title");
  const description = t("layout.description");
  const ogImageAlt = t("layout.ogImageAlt");
  const siteName = t("layout.siteName");
  const keywords = t.raw("layout.keywords") as string[];
  const ogLocale = locale === "vi" ? "vi_VN" : "en_US";

  return {
    title: {
      default: title,
      template: `%s | ${siteName}`,
    },
    description,
    keywords,
    metadataBase: new URL(appUrl),
    openGraph: {
      title,
      description,
      url: appUrl,
      siteName,
      images: [
        {
          url: `${appUrl}/og`,
          width: 1200,
          height: 630,
          alt: ogImageAlt,
        },
      ],
      locale: ogLocale,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${appUrl}/og`],
    },
    alternates: {
      canonical: appUrl,
    },
  };
}

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return <MarketingProviders>{children}</MarketingProviders>;
}
