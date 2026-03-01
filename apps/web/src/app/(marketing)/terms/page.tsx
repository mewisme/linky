import { LegalLayout } from "@/shared/ui/layouts/legal-layout";
import Link from "next/link";
import { Mail } from "@ws/ui/internal-lib/icons";
import { Metadata } from "next";
import { Separator } from "@ws/ui/components/ui/separator";

export async function generateMetadata(): Promise<Metadata> {
  const title = "Terms of Service";
  const description = "Welcome to Linky. By accessing or using our website and services (&quot;Service&quot;), you agree to be bound by these Terms of Service (&quot;Terms&quot;). If you do not agree, please do not use the Service.";
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

export default function TermsPage() {

  return (
    <LegalLayout title="Terms of Service" description="Welcome to Linky. By accessing or using our website and services (&quot;Service&quot;), you agree to be bound by these Terms of Service (&quot;Terms&quot;). If you do not agree, please do not use the Service." lastUpdated="January 2026">
      <Separator />

      <section className="space-y-4">
        <h2 className="text-xl font-semibold sm:text-2xl">1. Eligibility</h2>
        <p className="text-sm text-muted-foreground sm:text-base">
          You must be at least <strong>18 years old</strong> to use Linky. By using the Service, you represent and warrant that you meet this requirement.
        </p>
      </section>

      <Separator />

      <section className="space-y-4">
        <h2 className="text-xl font-semibold sm:text-2xl">2. Account Registration</h2>
        <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground sm:text-base ml-4">
          <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
          <li>You agree to provide accurate and complete information during registration.</li>
          <li>You are solely responsible for all activities that occur under your account.</li>
        </ul>
      </section>

      <Separator />

      <section className="space-y-4">
        <h2 className="text-xl font-semibold sm:text-2xl">3. Acceptable Use</h2>
        <p className="text-sm text-muted-foreground sm:text-base">
          You agree <strong>NOT</strong> to:
        </p>
        <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground sm:text-base ml-4">
          <li>Use the Service for any illegal or unauthorized purpose</li>
          <li>Harass, abuse, threaten, or harm other users</li>
          <li>Share nudity, sexually explicit, violent, or hateful content</li>
          <li>Record, distribute, or capture video/audio without consent</li>
          <li>Attempt to bypass security, moderation, or matching systems</li>
          <li>Use bots, scripts, or automated systems to access the Service</li>
        </ul>
        <p className="text-sm text-muted-foreground sm:text-base">
          Violation of these rules may result in <strong>suspension or permanent termination</strong> of your account.
        </p>
      </section>

      <Separator />

      <section className="space-y-4">
        <h2 className="text-xl font-semibold sm:text-2xl">4. Video & Real-Time Communication</h2>
        <p className="text-sm text-muted-foreground sm:text-base">
          Linky provides real-time video and text communication between users. You acknowledge that:
        </p>
        <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground sm:text-base ml-4">
          <li>Interactions are conducted with strangers</li>
          <li>Linky is not responsible for user behavior</li>
          <li>You use the Service at your own risk</li>
        </ul>
        <p className="text-sm text-muted-foreground sm:text-base">
          We reserve the right to monitor metadata and take action based on reports or abuse signals.
        </p>
      </section>

      <Separator />

      <section className="space-y-4">
        <h2 className="text-xl font-semibold sm:text-2xl">5. User Content</h2>
        <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground sm:text-base ml-4">
          <li>You retain ownership of your content</li>
          <li>You grant Linky a limited license to process content solely to operate the Service</li>
          <li>We do <strong>not</strong> record video or audio calls by default</li>
        </ul>
      </section>

      <Separator />

      <section className="space-y-4">
        <h2 className="text-xl font-semibold sm:text-2xl">6. Termination</h2>
        <p className="text-sm text-muted-foreground sm:text-base">
          We may suspend or terminate your access at any time if you violate these Terms or if required by law.
        </p>
      </section>

      <Separator />

      <section className="space-y-4">
        <h2 className="text-xl font-semibold sm:text-2xl">7. Disclaimer of Warranties</h2>
        <p className="text-sm text-muted-foreground sm:text-base">
          The Service is provided <strong>&quot;AS IS&quot;</strong> and <strong>&quot;AS AVAILABLE&quot;</strong> without warranties of any kind.
        </p>
      </section>

      <Separator />

      <section className="space-y-4">
        <h2 className="text-xl font-semibold sm:text-2xl">8. Limitation of Liability</h2>
        <p className="text-sm text-muted-foreground sm:text-base">
          To the maximum extent permitted by law, Linky shall not be liable for any indirect, incidental, or consequential damages.
        </p>
      </section>

      <Separator />

      <section className="space-y-4">
        <h2 className="text-xl font-semibold sm:text-2xl">9. Changes to These Terms</h2>
        <p className="text-sm text-muted-foreground sm:text-base">
          We may update these Terms from time to time. Continued use of the Service means you accept the updated Terms.
        </p>
      </section>

      <Separator />

      <section className="space-y-4">
        <h2 className="text-xl font-semibold sm:text-2xl">10. Contact</h2>
        <p className="text-sm text-muted-foreground sm:text-base">
          If you have questions about these Terms, please contact us at{" "}
          <Link
            href="mailto:support@linkynow.site"
            className="text-primary hover:underline inline-flex items-center gap-1"
          >
            <Mail className="h-4 w-4" />
            support@linkynow.site
          </Link>
        </p>
      </section>
    </LegalLayout>
  );
}