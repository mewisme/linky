import { LegalLayout } from "@/components/layouts/legal-layout";
import Link from "next/link";
import { Mail } from "lucide-react";
import { Separator } from "@repo/ui/components/ui/separator";

export default function PrivacyPage() {

  return (
    <LegalLayout title="Privacy Policy" description="Your privacy is important to us. This Privacy Policy explains how Linky collects, uses, and protects your information." lastUpdated="January 2026">
      <Separator />

      <section className="space-y-4">
        <h2 className="text-xl font-semibold sm:text-2xl">1. Information We Collect</h2>

        <div className="space-y-3">
          <h3 className="text-base font-medium sm:text-lg">a. Information You Provide</h3>
          <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground sm:text-base ml-4">
            <li>Email address</li>
            <li>Profile information (name, avatar)</li>
            <li>Authentication data via third-party providers (e.g. Google, Apple)</li>
          </ul>
        </div>

        <div className="space-y-3">
          <h3 className="text-base font-medium sm:text-lg">b. Automatically Collected Information</h3>
          <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground sm:text-base ml-4">
            <li>IP address (for security and abuse prevention)</li>
            <li>Device and browser information</li>
            <li>Session and usage data</li>
            <li>Presence and connection status</li>
          </ul>
        </div>
      </section>

      <Separator />

      <section className="space-y-4">
        <h2 className="text-xl font-semibold sm:text-2xl">2. How We Use Your Information</h2>
        <p className="text-sm text-muted-foreground sm:text-base">
          We use your information to:
        </p>
        <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground sm:text-base ml-4">
          <li>Provide and operate the Service</li>
          <li>Authenticate users</li>
          <li>Enable real-time communication</li>
          <li>Improve performance and user experience</li>
          <li>Detect fraud, abuse, and violations</li>
          <li>Comply with legal obligations</li>
        </ul>
      </section>

      <Separator />

      <section className="space-y-4">
        <h2 className="text-xl font-semibold sm:text-2xl">3. Video & Audio Data</h2>
        <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground sm:text-base ml-4">
          <li>Linky does <strong>NOT</strong> record video or audio calls</li>
          <li>Media streams are peer-to-peer via WebRTC</li>
          <li>Temporary signaling data is used only to establish connections</li>
        </ul>
      </section>

      <Separator />

      <section className="space-y-4">
        <h2 className="text-xl font-semibold sm:text-2xl">4. Cookies & Tracking</h2>
        <p className="text-sm text-muted-foreground sm:text-base">
          We use cookies and similar technologies to:
        </p>
        <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground sm:text-base ml-4">
          <li>Maintain sessions</li>
          <li>Track anonymous usage analytics</li>
          <li>Remember preferences (e.g. theme)</li>
        </ul>
        <p className="text-sm text-muted-foreground sm:text-base">
          You can disable cookies in your browser, but some features may not work properly.
        </p>
      </section>

      <Separator />

      <section className="space-y-4">
        <h2 className="text-xl font-semibold sm:text-2xl">5. Data Sharing</h2>
        <p className="text-sm text-muted-foreground sm:text-base">
          We do <strong>NOT</strong> sell your personal data.
        </p>
        <p className="text-sm text-muted-foreground sm:text-base">
          We may share data only with:
        </p>
        <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground sm:text-base ml-4">
          <li>Service providers (authentication, hosting, analytics)</li>
          <li>Legal authorities if required by law</li>
        </ul>
      </section>

      <Separator />

      <section className="space-y-4">
        <h2 className="text-xl font-semibold sm:text-2xl">6. Data Retention</h2>
        <p className="text-sm text-muted-foreground sm:text-base">
          We retain personal data only as long as necessary to provide the Service or comply with legal obligations.
        </p>
      </section>

      <Separator />

      <section className="space-y-4">
        <h2 className="text-xl font-semibold sm:text-2xl">7. Security</h2>
        <p className="text-sm text-muted-foreground sm:text-base">
          We implement reasonable technical and organizational measures to protect your data, including:
        </p>
        <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground sm:text-base ml-4">
          <li>Encryption</li>
          <li>Secure authentication</li>
          <li>Access controls</li>
        </ul>
        <p className="text-sm text-muted-foreground sm:text-base">
          However, no system is 100% secure.
        </p>
      </section>

      <Separator />

      <section className="space-y-4">
        <h2 className="text-xl font-semibold sm:text-2xl">8. Your Rights</h2>
        <p className="text-sm text-muted-foreground sm:text-base">
          Depending on your location, you may have the right to:
        </p>
        <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground sm:text-base ml-4">
          <li>Access your data</li>
          <li>Correct or delete your data</li>
          <li>Withdraw consent</li>
        </ul>
        <p className="text-sm text-muted-foreground sm:text-base">
          You can manage your information through your account or contact us.
        </p>
      </section>

      <Separator />

      <section className="space-y-4">
        <h2 className="text-xl font-semibold sm:text-2xl">9. Children&apos;s Privacy</h2>
        <p className="text-sm text-muted-foreground sm:text-base">
          Linky is <strong>not intended for users under 18</strong>. We do not knowingly collect data from children.
        </p>
      </section>

      <Separator />

      <section className="space-y-4">
        <h2 className="text-xl font-semibold sm:text-2xl">10. Changes to This Policy</h2>
        <p className="text-sm text-muted-foreground sm:text-base">
          We may update this Privacy Policy from time to time. Changes will be posted on this page.
        </p>
      </section>

      <Separator />

      <section className="space-y-4">
        <h2 className="text-xl font-semibold sm:text-2xl">11. Contact Us</h2>
        <p className="text-sm text-muted-foreground sm:text-base">
          If you have questions or concerns about this Privacy Policy, contact us at{" "}
          <Link
            href="mailto:privacy@linkynow.site"
            className="text-primary hover:underline inline-flex items-center gap-1"
          >
            <Mail className="h-4 w-4" />
            privacy@linkynow.site
          </Link>
        </p>
      </section>
    </LegalLayout>

  );
}