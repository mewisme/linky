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
import { cn } from "@repo/ui/lib/utils";

interface LegalLayoutProps {
  children: React.ReactNode;
  title: string;
  description: string;
  lastUpdated?: string;
  updatedBy?: string;
  updatedAt?: string;
}

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

export function LegalLayout({ children, title, description, lastUpdated, updatedBy, updatedAt }: LegalLayoutProps) {
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
                  {title}
                </CardTitle>
                <p className="text-sm text-muted-foreground sm:text-base">
                  {updatedBy ? `Last updated by: ${updatedBy}` : ''} {updatedAt ? ` on ${updatedAt}` : ''} {lastUpdated ? `Last updated: ${lastUpdated}` : ''}
                </p>
                <p className="text-sm leading-relaxed sm:text-base md:text-lg">
                  {description}
                </p>
              </CardHeader>

              <CardContent className="space-y-8 px-4 pb-6 sm:px-6 sm:pb-8 md:px-8">
                {children}
              </CardContent>
            </Card>
            <LandingFooter />
          </div>
        </motion.div>
      </div>
    </main>
  );
}