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
  const title = t("legal.terms.metaTitle");
  const description = t("legal.terms.metaDescription");
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

export default async function TermsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  const locale = localeParam as AppLocale;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "marketing" });
  const s2List = t.raw("legal.terms.s2List") as string[];
  const s3List = t.raw("legal.terms.s3List") as string[];
  const s4List = t.raw("legal.terms.s4List") as string[];

  return (
    <LegalLayout
      title={t("legal.terms.title")}
      description={t("legal.terms.description")}
      lastUpdated={t("legal.lastUpdated")}
    >
      <Separator />

      <section className="space-y-4">
        <h2 className="text-xl font-semibold sm:text-2xl">{t("legal.terms.s1Title")}</h2>
        <p className="text-sm text-muted-foreground sm:text-base">
          {t.rich("legal.terms.s1Body", richStrong)}
        </p>
      </section>

      <Separator />

      <section className="space-y-4">
        <h2 className="text-xl font-semibold sm:text-2xl">{t("legal.terms.s2Title")}</h2>
        <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground sm:text-base ml-4">
          {s2List.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </section>

      <Separator />

      <section className="space-y-4">
        <h2 className="text-xl font-semibold sm:text-2xl">{t("legal.terms.s3Title")}</h2>
        <p className="text-sm text-muted-foreground sm:text-base">{t.rich("legal.terms.s3Intro", richStrong)}</p>
        <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground sm:text-base ml-4">
          {s3List.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <p className="text-sm text-muted-foreground sm:text-base">{t.rich("legal.terms.s3Footer", richStrong)}</p>
      </section>

      <Separator />

      <section className="space-y-4">
        <h2 className="text-xl font-semibold sm:text-2xl">{t("legal.terms.s4Title")}</h2>
        <p className="text-sm text-muted-foreground sm:text-base">{t("legal.terms.s4Intro")}</p>
        <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground sm:text-base ml-4">
          {s4List.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <p className="text-sm text-muted-foreground sm:text-base">{t("legal.terms.s4Footer")}</p>
      </section>

      <Separator />

      <section className="space-y-4">
        <h2 className="text-xl font-semibold sm:text-2xl">{t("legal.terms.s5Title")}</h2>
        <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground sm:text-base ml-4">
          <li>{t("legal.terms.s5Item1")}</li>
          <li>{t("legal.terms.s5Item2")}</li>
          <li>{t.rich("legal.terms.s5Item3", richStrong)}</li>
        </ul>
      </section>

      <Separator />

      <section className="space-y-4">
        <h2 className="text-xl font-semibold sm:text-2xl">{t("legal.terms.s6Title")}</h2>
        <p className="text-sm text-muted-foreground sm:text-base">{t("legal.terms.s6Body")}</p>
      </section>

      <Separator />

      <section className="space-y-4">
        <h2 className="text-xl font-semibold sm:text-2xl">{t("legal.terms.s7Title")}</h2>
        <p className="text-sm text-muted-foreground sm:text-base">{t.rich("legal.terms.s7Body", richStrong)}</p>
      </section>

      <Separator />

      <section className="space-y-4">
        <h2 className="text-xl font-semibold sm:text-2xl">{t("legal.terms.s8Title")}</h2>
        <p className="text-sm text-muted-foreground sm:text-base">{t("legal.terms.s8Body")}</p>
      </section>

      <Separator />

      <section className="space-y-4">
        <h2 className="text-xl font-semibold sm:text-2xl">{t("legal.terms.s9Title")}</h2>
        <p className="text-sm text-muted-foreground sm:text-base">{t("legal.terms.s9Body")}</p>
      </section>

      <Separator />

      <section className="space-y-4">
        <h2 className="text-xl font-semibold sm:text-2xl">{t("legal.terms.s10Title")}</h2>
        <p className="text-sm text-muted-foreground sm:text-base">
          {t.rich("legal.terms.s10Body", {
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
