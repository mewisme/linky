import { routing } from "@/i18n/routing";
import { LegalLayout } from "@/shared/ui/layouts/legal-layout";
import { Link } from "@/i18n/navigation";
import { Mail } from "@ws/ui/internal-lib/icons";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Separator } from "@ws/ui/components/ui/separator";
import { getTranslations, setRequestLocale } from "next-intl/server";

type AppLocale = (typeof routing.locales)[number];

const richStrong = {
  strong: (chunks: ReactNode) => <strong>{chunks}</strong>,
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: localeParam } = await params;
  const locale = localeParam as AppLocale;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "marketing" });
  const title = t("legal.cookies.metaTitle");
  const description = t("legal.cookies.metaDescription");
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

export default async function CookiePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  const locale = localeParam as AppLocale;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "marketing" });
  const s2List = t.raw("legal.cookies.s2List") as string[];

  return (
    <LegalLayout
      title={t("legal.cookies.title")}
      description={t("legal.cookies.description")}
      lastUpdated={t("legal.lastUpdated")}
    >
      <Separator />

      <section className="space-y-4">
        <h2 className="text-xl font-semibold sm:text-2xl">{t("legal.cookies.s1Title")}</h2>
        <p className="text-sm text-muted-foreground sm:text-base">{t("legal.cookies.s1Body")}</p>
      </section>

      <Separator />

      <section className="space-y-4">
        <h2 className="text-xl font-semibold sm:text-2xl">{t("legal.cookies.s2Title")}</h2>
        <p className="text-sm text-muted-foreground sm:text-base">{t("legal.cookies.s2Intro")}</p>
        <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground sm:text-base ml-4">
          {s2List.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </section>

      <Separator />

      <section className="space-y-4">
        <h2 className="text-xl font-semibold sm:text-2xl">{t("legal.cookies.s3Title")}</h2>

        <div className="space-y-3">
          <h3 className="text-base font-medium sm:text-lg">{t("legal.cookies.s3aTitle")}</h3>
          <p className="text-sm text-muted-foreground sm:text-base">{t("legal.cookies.s3aBody")}</p>
        </div>

        <div className="space-y-3">
          <h3 className="text-base font-medium sm:text-lg">{t("legal.cookies.s3bTitle")}</h3>
          <p className="text-sm text-muted-foreground sm:text-base">{t("legal.cookies.s3bBody")}</p>
        </div>

        <div className="space-y-3">
          <h3 className="text-base font-medium sm:text-lg">{t("legal.cookies.s3cTitle")}</h3>
          <p className="text-sm text-muted-foreground sm:text-base">{t("legal.cookies.s3cBody")}</p>
        </div>
      </section>

      <Separator />

      <section className="space-y-4">
        <h2 className="text-xl font-semibold sm:text-2xl">{t("legal.cookies.s4Title")}</h2>
        <p className="text-sm text-muted-foreground sm:text-base">{t("legal.cookies.s4Body")}</p>
      </section>

      <Separator />

      <section className="space-y-4">
        <h2 className="text-xl font-semibold sm:text-2xl">{t("legal.cookies.s5Title")}</h2>
        <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground sm:text-base ml-4">
          <li>{t.rich("legal.cookies.s5L1", richStrong)}</li>
          <li>{t.rich("legal.cookies.s5L2", richStrong)}</li>
        </ul>
        <p className="text-sm text-muted-foreground sm:text-base">{t("legal.cookies.s5Body")}</p>
      </section>

      <Separator />

      <section className="space-y-4">
        <h2 className="text-xl font-semibold sm:text-2xl">{t("legal.cookies.s6Title")}</h2>
        <p className="text-sm text-muted-foreground sm:text-base">{t("legal.cookies.s6Body")}</p>
      </section>

      <Separator />

      <section className="space-y-4">
        <h2 className="text-xl font-semibold sm:text-2xl">{t("legal.cookies.s7Title")}</h2>
        <p className="text-sm text-muted-foreground sm:text-base">{t("legal.cookies.s7Body")}</p>
      </section>

      <Separator />

      <section className="space-y-4">
        <h2 className="text-xl font-semibold sm:text-2xl">{t("legal.cookies.s8Title")}</h2>
        <p className="text-sm text-muted-foreground sm:text-base">
          {t.rich("legal.cookies.s8Body", {
            link: (chunks) => (
              <Link
                href={`mailto:${chunks}`}
                className="text-primary hover:underline inline-flex items-center gap-1"
              >
                <Mail className="h-4 w-4" />
                {chunks}
              </Link>
            ),
          })}
        </p>
      </section>
    </LegalLayout>
  );
}
