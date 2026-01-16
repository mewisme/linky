"use client";

import { useEffect, useState } from "react";
import { motion, type Variants } from "motion/react";
import { Header } from "@/components/header/landing/index";
import { cn } from "@repo/ui/lib/utils";

interface AuthLayoutProps {
  children: React.ReactNode;
}

const CONTENT_VARIANTS: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: { type: 'spring', stiffness: 100, damping: 30 },
  },
};

export function AuthLayout({ children }: AuthLayoutProps) {
  const [transition] = useState(true);
  const [isLoadedTransition, setIsLoadedTransition] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoadedTransition(true), 2500);
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
          {children}
        </motion.div>
      </div>
    </main>
  );
}