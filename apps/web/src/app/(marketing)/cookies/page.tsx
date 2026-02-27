import { LegalLayout } from "@/components/layouts/legal-layout";
import Link from "next/link";
import { Mail } from "@ws/ui/internal-lib/icons";
import { Metadata } from "next";
import { Separator } from "@ws/ui/components/ui/separator";

export async function generateMetadata(): Promise<Metadata> {
  const title = "Cookies Policy";
  const description = "This Cookies Policy explains how Linky uses cookies and similar technologies to keep the Service secure, remember your preferences, and understand how the Service is used.";
  const images = [`/og/simple?title=${encodeURIComponent(title)}`];

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images,
    },
  }
}

export default function CookiePage() {

  return (
    <LegalLayout title="Cookies Policy" description="This Cookies Policy explains how Linky uses cookies and similar technologies to keep the Service secure, remember your preferences, and understand how the Service is used." lastUpdated="January 2026">
      <Separator />

      <section className="space-y-4">
        <h2 className="text-xl font-semibold sm:text-2xl">1. What Are Cookies?</h2>
        <p className="text-sm text-muted-foreground sm:text-base">
          Cookies are small text files stored on your device when you visit a website. Similar technologies (like local storage)
          may also be used to store settings or identifiers that help the Service function properly.
        </p>
      </section>

      <Separator />

      <section className="space-y-4">
        <h2 className="text-xl font-semibold sm:text-2xl">2. How We Use Cookies</h2>
        <p className="text-sm text-muted-foreground sm:text-base">
          We use cookies and similar technologies to:
        </p>
        <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground sm:text-base ml-4">
          <li>Keep you signed in and maintain your session</li>
          <li>Protect the Service from abuse, fraud, and suspicious activity</li>
          <li>Remember preferences (for example, theme or UI settings)</li>
          <li>Measure performance and understand how features are used</li>
        </ul>
      </section>

      <Separator />

      <section className="space-y-4">
        <h2 className="text-xl font-semibold sm:text-2xl">3. Types of Cookies We Use</h2>

        <div className="space-y-3">
          <h3 className="text-base font-medium sm:text-lg">a. Strictly Necessary Cookies</h3>
          <p className="text-sm text-muted-foreground sm:text-base">
            These cookies are required for core functionality such as authentication, security, and maintaining sessions. Without
            them, parts of the Service may not work.
          </p>
        </div>

        <div className="space-y-3">
          <h3 className="text-base font-medium sm:text-lg">b. Preference Cookies</h3>
          <p className="text-sm text-muted-foreground sm:text-base">
            These cookies help remember your choices (like interface preferences) so you don&apos;t need to reconfigure them each
            time you visit.
          </p>
        </div>

        <div className="space-y-3">
          <h3 className="text-base font-medium sm:text-lg">c. Analytics Cookies</h3>
          <p className="text-sm text-muted-foreground sm:text-base">
            These cookies help us understand usage patterns and improve reliability and user experience. We aim to keep analytics
            data aggregated and minimize what is collected.
          </p>
        </div>
      </section>

      <Separator />

      <section className="space-y-4">
        <h2 className="text-xl font-semibold sm:text-2xl">4. Third-Party Cookies</h2>
        <p className="text-sm text-muted-foreground sm:text-base">
          Some cookies may be set by third-party services we use to provide essential features (such as authentication, hosting,
          or security). These providers may process information according to their own policies.
        </p>
      </section>

      <Separator />

      <section className="space-y-4">
        <h2 className="text-xl font-semibold sm:text-2xl">5. How Long Cookies Last</h2>
        <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground sm:text-base ml-4">
          <li><strong>Session cookies</strong> typically expire when you close your browser</li>
          <li><strong>Persistent cookies</strong> remain until they expire or you delete them</li>
        </ul>
        <p className="text-sm text-muted-foreground sm:text-base">
          Expiration times vary depending on the purpose of the cookie and how the Service is configured.
        </p>
      </section>

      <Separator />

      <section className="space-y-4">
        <h2 className="text-xl font-semibold sm:text-2xl">6. Your Choices</h2>
        <p className="text-sm text-muted-foreground sm:text-base">
          You can control cookies through your browser settings. You may block or delete cookies, or configure your browser to
          alert you when cookies are being set. If you disable cookies, some features (like sign-in or saving preferences) may not
          function correctly.
        </p>
      </section>

      <Separator />

      <section className="space-y-4">
        <h2 className="text-xl font-semibold sm:text-2xl">7. Changes to This Cookie Policy</h2>
        <p className="text-sm text-muted-foreground sm:text-base">
          We may update this Cookie Policy from time to time. The latest version will be posted on this page with the updated
          date.
        </p>
      </section>

      <Separator />

      <section className="space-y-4">
        <h2 className="text-xl font-semibold sm:text-2xl">8. Contact Us</h2>
        <p className="text-sm text-muted-foreground sm:text-base">
          If you have questions about cookies or this Cookie Policy, contact us at{" "}
          <Link
            href="mailto:privacy@linkynow.site"
            className="text-primary hover:underline inline-flex items-center gap-1"
          >
            <Mail className="h-4 w-4" />
            privacy@linkynow.site
          </Link>
          .
        </p>
      </section>
    </LegalLayout>

  );
}
