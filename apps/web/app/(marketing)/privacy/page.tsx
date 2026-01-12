"use client";

import { useEffect, useState } from "react";
import { motion, type Variants } from "motion/react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/ui/card";
import { Header } from "@/components/header/landing/index";
import { LandingFooter } from "@/components/landing/footer";
import { Separator } from "@repo/ui/components/ui/separator";
import { cn } from "@repo/ui/lib/utils";
import { Mail } from "lucide-react";
import Link from "next/link";

const CONTENT_VARIANTS: Variants = {
  hidden: {
    y: 0,
    opacity: 0,
  },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: 'spring', stiffness: 100, damping: 30 },
  },
};

const BACKGROUND_VARIANTS: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: { type: 'spring', stiffness: 100, damping: 30, delay: 0.75 },
  },
};

export default function PrivacyPage() {
  const [transition] = useState(true);
  const [isLoadedTransition, setIsLoadedTransition] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoadedTransition(true), 3000);
    return () => {
      clearTimeout(timer);
    };
  }, []);

  return (
    <main className={cn('relative min-h-dvh', !isLoadedTransition && 'overflow-y-hidden')}>
      <Header transition={transition} />
      <div className="min-h-dvh w-full flex items-center pt-0">
        <motion.div
          variants={CONTENT_VARIANTS}
          initial="hidden"
          animate={transition ? 'visible' : 'hidden'}
          className={cn(
            "w-full relative flex flex-1 items-center justify-center overflow-hidden px-4 h-full",
            !transition && 'fixed inset-0'
          )}
        >
          <motion.div
            variants={BACKGROUND_VARIANTS}
            initial="hidden"
            animate={transition ? 'visible' : 'hidden'}
            className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -top-20 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl sm:-top-32 sm:h-64 sm:w-64 md:-top-40 md:h-80 md:w-80" />
            <div className="absolute bottom-0 right-0 h-36 w-36 rounded-full bg-purple-500/20 blur-3xl sm:h-56 sm:w-56 md:h-72 md:w-72" />
            <div className="absolute top-1/2 left-0 h-32 w-32 -translate-y-1/2 rounded-full bg-blue-500/10 blur-3xl sm:h-48 sm:w-48 md:h-64 md:w-64" />
          </motion.div>

          <div className="relative z-10 w-full max-w-4xl py-6 mt-10">
            <Card className="border-none bg-transparent backdrop-blur-xl">
              <CardHeader className="space-y-4 px-4 sm:px-6 sm:py-8 md:px-8">
                <CardTitle className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
                  Privacy Policy
                </CardTitle>
                <p className="text-sm text-muted-foreground sm:text-base">
                  <strong>Last updated:</strong> January 2026
                </p>
                <p className="text-sm leading-relaxed sm:text-base md:text-lg">
                  Your privacy is important to us. This Privacy Policy explains how Linky collects, uses, and protects your information.
                </p>
              </CardHeader>

              <CardContent className="space-y-8 px-4 pb-6 sm:px-6 sm:pb-8 md:px-8">
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
              </CardContent>
            </Card>
            <LandingFooter />
          </div>
        </motion.div>
      </div>
    </main>
  );
}