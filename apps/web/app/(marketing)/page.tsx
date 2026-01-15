"use client";

import { Suspense, useEffect, useState } from "react";

import { Header } from "@/components/header/landing/index";
import { cn } from "@repo/ui/lib/utils";
import { motion, type Variants } from "motion/react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { usePageView } from "@/hooks/use-page-view";
import { useVisitorTracking } from "@/hooks/use-visitor-tracking";
import { Hero } from "./components/landing/hero";
import { LandingFooter } from "@/components/landing/footer";
import { HeroBackground } from "./components/landing/hero-background";

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
  const [isLoadedTransition, setIsLoadedTransition] = useState(false);

  // Track visitor on session start
  useVisitorTracking();

  useEffect(() => {
    const timer = setTimeout(() => setTransition(true), 1250);
    const timer2 = setTimeout(() => setIsLoadedTransition(true), 2500);
    return () => {
      clearTimeout(timer);
      clearTimeout(timer2);
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

            <div className={cn("relative z-10 w-full max-w-4xl py-6 mt-8 bg-transparent backdrop-blur-xl")}>
              <Hero handleStartChat={handleStartChat} isSignedIn={isSignedIn} isLoaded={isLoaded} key={String(transition)} />
              <LandingFooter />
            </div>

          </motion.div>
        </div >
      </main >
    </>
  );
}
