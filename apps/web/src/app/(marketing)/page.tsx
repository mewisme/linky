"use client";

import { useEffect, useState } from "react";

import { Header } from "@/components/header/landing/index";
import { cn } from "@ws/ui/lib/utils";
import { motion, type Variants } from "@ws/ui/internal-lib/motion";
import { useUser } from "@clerk/nextjs";
import { Hero } from "./components/landing/hero";
import { LandingDifferentiation } from "./components/landing/landing-differentiation";
import { LandingSafety } from "./components/landing/landing-safety";
import { LandingPreview } from "./components/landing/landing-preview";
import { LandingVision } from "./components/landing/landing-vision";
import { LandingFooter } from "@/app/(marketing)/components/landing/footer";
import { ShapeBackground } from "./components/landing/shapes-background";

const CONTENT_VARIANTS: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: { type: 'spring', stiffness: 100, damping: 30 },
  },
};

export default function Home() {
  const { isSignedIn, isLoaded } = useUser();
  const [transition, setTransition] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setTransition(true), 1250);
    return () => {
      clearTimeout(timer);
    };
  }, []);

  const startChatHref = isSignedIn && isLoaded ? "/chat" : "/sign-in";

  return (
    <>
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
            <ShapeBackground transition={transition} className="hidden sm:block" />
            <div className="relative z-10 max-w-5xl mx-auto px-4 py-6 mt-8">
              <Hero startChatHref={startChatHref} isSignedIn={isSignedIn} isLoaded={isLoaded} key={String(transition)} />
              <div className="space-y-12">
                <LandingDifferentiation />
                <LandingSafety />
                <LandingPreview />
                <LandingVision />
                <LandingFooter />
              </div>
            </div>
          </motion.div>
        </div>
      </main >
    </>
  );
}
