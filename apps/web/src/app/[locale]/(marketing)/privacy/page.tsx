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
  const title = t("legal.privacy.metaTitle");
  const description = t("legal.privacy.metaDescription");
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

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  const locale = localeParam as AppLocale;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "marketing" });
  const s1aList = t.raw("legal.privacy.s1aList") as string[];
  const s1bList = t.raw("legal.privacy.s1bList") as string[];
  const s2List = t.raw("legal.privacy.s2List") as string[];
  const s4List = t.raw("legal.privacy.s4List") as string[];
  const s5List = t.raw("legal.privacy.s5List") as string[];
  const s7List = t.raw("legal.privacy.s7List") as string[];
  const s8List = t.raw("legal.privacy.s8List") as string[];

  return (
    <LegalLayout
      title={t("legal.privacy.title")}
      description={t("legal.privacy.description")}
      lastUpdated={t("legal.lastUpdated")}
    >
      <Separator />

      <section className="space-y-4">
        <h2 className="text-xl font-semibold sm:text-2xl">{t("legal.privacy.s1Title")}</h2>

        <div className="space-y-3">
          <h3 className="text-base font-medium sm:text-lg">{t("legal.privacy.s1aTitle")}</h3>
          <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground sm:text-base ml-4">
            {s1aList.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>

        <div className="space-y-3">
          <h3 className="text-base font-medium sm:text-lg">{t("legal.privacy.s1bTitle")}</h3>
          <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground sm:text-base ml-4">
            {s1bList.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      </section>

      <Separator />

      <section className="space-y-4">
        <h2 className="text-xl font-semibold sm:text-2xl">{t("legal.privacy.s2Title")}</h2>
        <p className="text-sm text-muted-foreground sm:text-base">{t("legal.privacy.s2Intro")}</p>
        <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground sm:text-base ml-4">
          {s2List.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </section>

      <Separator />

      <section className="space-y-4">
        <h2 className="text-xl font-semibold sm:text-2xl">{t("legal.privacy.s3Title")}</h2>
        <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground sm:text-base ml-4">
          <li>{t.rich("legal.privacy.s3Item1", richStrong)}</li>
          <li>{t("legal.privacy.s3Item2")}</li>
          <li>{t("legal.privacy.s3Item3")}</li>
        </ul>
      </section>

      <Separator />

      <section className="space-y-4">
        <h2 className="text-xl font-semibold sm:text-2xl">{t("legal.privacy.s4Title")}</h2>
        <p className="text-sm text-muted-foreground sm:text-base">{t("legal.privacy.s4Intro")}</p>
        <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground sm:text-base ml-4">
          {s4List.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <p className="text-sm text-muted-foreground sm:text-base">{t("legal.privacy.s4Footer")}</p>
      </section>

      <Separator />

      <section className="space-y-4">
        <h2 className="text-xl font-semibold sm:text-2xl">{t("legal.privacy.s5Title")}</h2>
        <p className="text-sm text-muted-foreground sm:text-base">{t.rich("legal.privacy.s5P1", richStrong)}</p>
        <p className="text-sm text-muted-foreground sm:text-base">{t("legal.privacy.s5P2")}</p>
        <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground sm:text-base ml-4">
          {s5List.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </section>

      <Separator />

      <section className="space-y-4">
        <h2 className="text-xl font-semibold sm:text-2xl">{t("legal.privacy.s6Title")}</h2>
        <p className="text-sm text-muted-foreground sm:text-base">{t("legal.privacy.s6Body")}</p>
      </section>

      <Separator />

      <section className="space-y-4">
        <h2 className="text-xl font-semibold sm:text-2xl">{t("legal.privacy.s7Title")}</h2>
        <p className="text-sm text-muted-foreground sm:text-base">{t("legal.privacy.s7Intro")}</p>
        <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground sm:text-base ml-4">
          {s7List.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <p className="text-sm text-muted-foreground sm:text-base">{t("legal.privacy.s7Footer")}</p>
      </section>

      <Separator />

      <section className="space-y-4">
        <h2 className="text-xl font-semibold sm:text-2xl">{t("legal.privacy.s8Title")}</h2>
        <p className="text-sm text-muted-foreground sm:text-base">{t("legal.privacy.s8Intro")}</p>
        <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground sm:text-base ml-4">
          {s8List.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <p className="text-sm text-muted-foreground sm:text-base">{t("legal.privacy.s8Footer")}</p>
      </section>

      <Separator />

      <section className="space-y-4">
        <h2 className="text-xl font-semibold sm:text-2xl">{t("legal.privacy.s9Title")}</h2>
        <p className="text-sm text-muted-foreground sm:text-base">{t.rich("legal.privacy.s9Body", richStrong)}</p>
      </section>

      <Separator />

      <section className="space-y-4">
        <h2 className="text-xl font-semibold sm:text-2xl">{t("legal.privacy.s10Title")}</h2>
        <p className="text-sm text-muted-foreground sm:text-base">{t("legal.privacy.s10Body")}</p>
      </section>

      <Separator />

      <section className="space-y-4">
        <h2 className="text-xl font-semibold sm:text-2xl">{t("legal.privacy.s11Title")}</h2>
        <p className="text-sm text-muted-foreground sm:text-base">
          {t.rich("legal.privacy.s11Body", {
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
