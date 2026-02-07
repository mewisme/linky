"use client";

import { Suspense, useEffect, useState } from "react";

import { Header } from "@/components/header/landing/index";
import { cn } from "@repo/ui/lib/utils";
import { motion, type Variants } from "motion/react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { usePageView } from "@/hooks/ui/use-page-view";
import { useVisitorTracking } from "@/hooks/analytics/use-visitor-tracking";
import { Hero } from "./components/landing/hero";
import { LandingDifferentiation } from "./components/landing/landing-differentiation";
import { LandingSafety } from "./components/landing/landing-safety";
import { LandingPreview } from "./components/landing/landing-preview";
import { LandingVision } from "./components/landing/landing-vision";
import { LandingFooter } from "@/components/landing/footer";
import { Separator } from "@repo/ui/components/ui/separator";

const CONTENT_VARIANTS: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
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

function PageTracker() {
  usePageView();
  return null;
}

export default function Home() {
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();
  const [transition, setTransition] = useState(false);

  useVisitorTracking();

  useEffect(() => {
    const timer = setTimeout(() => setTransition(true), 1250);
    return () => {
      clearTimeout(timer);
    };
  }, []);

  const handleStartChat = () => {
    router.push(isSignedIn && isLoaded ? "/chat" : "/sign-in");
  };

  return (
    <>
      <Suspense fallback={null}>
        <PageTracker />
      </Suspense>
      <main className="relative min-h-dvh">
        <Header transition={transition} />
        <div className="w-full flex flex-col items-center pt-0">
          <motion.div
            variants={CONTENT_VARIANTS}
            initial="hidden"
            animate={transition ? 'visible' : 'hidden'}
            className={cn(
              "w-full relative flex flex-col items-center overflow-hidden",
              !transition && 'fixed inset-0'
            )}
          >
            <motion.div
              variants={BACKGROUND_VARIANTS}
              initial="hidden"
              animate={transition ? 'visible' : 'hidden'}
              className="pointer-events-none fixed inset-0 overflow-hidden">
              <div className="absolute -top-20 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl sm:-top-32 sm:h-64 sm:w-64 md:-top-40 md:h-80 md:w-80" />
              <div className="absolute bottom-0 right-0 h-36 w-36 rounded-full bg-purple-500/20 blur-3xl sm:h-56 sm:w-56 md:h-72 md:w-72" />
              <div className="absolute top-1/2 left-0 h-32 w-32 -translate-y-1/2 rounded-full bg-blue-500/10 blur-3xl sm:h-48 sm:w-48 md:h-64 md:w-64" />
            </motion.div>

            <div className="relative z-10 w-full max-w-4xl px-4 py-6 mt-8">
              <div className="space-y-0">
                <Hero handleStartChat={handleStartChat} isSignedIn={isSignedIn} isLoaded={isLoaded} key={String(transition)} />

                <Separator className="my-12" />

                <LandingDifferentiation />

                <Separator className="my-12" />

                <LandingSafety />

                <Separator className="my-12" />

                <LandingPreview />

                <Separator className="my-12" />

                <LandingVision />

                <div className="pt-12">
                  <LandingFooter />
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </main>
    </>
  );
}
