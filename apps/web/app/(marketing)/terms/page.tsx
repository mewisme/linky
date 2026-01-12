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

export default function TermsPage() {
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
                  Terms of Service
                </CardTitle>
                <p className="text-sm text-muted-foreground sm:text-base">
                  <strong>Last updated:</strong> January 2026
                </p>
                <p className="text-sm leading-relaxed sm:text-base md:text-lg">
                  Welcome to <strong>Linky</strong>. By accessing or using our website and services (&quot;Service&quot;), you agree to be bound by these Terms of Service (&quot;Terms&quot;). If you do not agree, please do not use the Service.
                </p>
              </CardHeader>

              <CardContent className="space-y-8 px-4 pb-6 sm:px-6 sm:pb-8 md:px-8">
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
              </CardContent>
            </Card>
            <LandingFooter />
          </div>
        </motion.div>
      </div>
    </main>
  );
}