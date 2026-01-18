'use client'

import dynamic from "next/dynamic";

import { Logo } from "./logo";
import { motion, type Variants } from "motion/react"
import { useIsMobile } from "@repo/ui/hooks/use-mobile";
import { ModeToggle } from "../mode-toggle";
import { useUserContext } from "@/components/providers/user/user-provider";

const UserButton = dynamic(() => import("../../auth/user-button").then(mod => ({ default: mod.UserButton })), {
  ssr: false,
});

const LOGO_WRAPPER_VARIANTS: Variants = {
  center: {
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    height: '100%',
  },
  topLeft: {
    top: 0,
    left: 0,
    right: 0,
    bottom: 'auto',
    height: 'auto',
  },
};

export const Header = ({ transition }: { transition: boolean }) => {
  const isMobile = useIsMobile();
  const { auth: { isSignedIn, isLoaded } } = useUserContext();

  return (
    <motion.div
      variants={LOGO_WRAPPER_VARIANTS}
      initial="center"
      animate={transition ? 'topLeft' : 'center'}
      transition={{ type: 'spring', stiffness: 200, damping: 30 }}
      className="fixed z-40 flex items-center justify-center"
    >
      <motion.div className="absolute inset-x-0 top-0 h-14 z-100 w-full bg-transparent md:bg-background/10 backdrop-blur-md" />
      <div className="relative max-w-7xl size-full">
        {transition ? (
          <motion.div
            layoutId="logo"
            className="absolute z-110 left-5"
            animate={{
              top: 32,
            }}
          >
            <Logo size="sm" />
          </motion.div>
        ) : (
          <motion.div
            layoutId="logo"
            className="absolute z-110 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          >
            <Logo size={isMobile ? 'lg' : 'xl'} draw />
          </motion.div>
        )}

        <motion.div
          initial={{
            top: 28,
            right: -43,
            opacity: 0,
          }}
          animate={
            transition
              ? {
                top: 28,
                right: 20,
                opacity: 1,
              }
              : {
                top: 28,
                right: -43,
                opacity: 0,
              }
          }
          transition={{ type: 'spring', stiffness: 200, damping: 30 }}
          className="absolute z-110 flex items-center gap-x-4"
        >
          <ModeToggle />
          {isLoaded && isSignedIn && <UserButton />}
        </motion.div>
      </div>
    </motion.div>
  );
};