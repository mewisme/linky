'use client'

import dynamic from "next/dynamic";

import { Logo } from "./logo";
import { motion, type Variants } from "@ws/ui/internal-lib/motion"
import { useIsMobile } from "@ws/ui/hooks/use-mobile";
import { ModeToggle } from "../mode-toggle";
import { useUserContext } from "@/components/providers/user/user-provider";
import { CommandMenu } from '@/components/header/command-menu'
import { Activity } from "react";

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
              top: 24,
            }}
          >
            <Logo size="sm" />
          </motion.div>
        ) : (
          <motion.div
            layoutId="logo"
            className="absolute z-110 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          >
            <Logo size={isMobile ? 'lg' : 'xxl'} draw />
          </motion.div>
        )}

        <motion.div
          layoutId="command-menu"
          initial={{
            opacity: 0,
            top: 18,
            left: '35%',
            right: '35%',
          }}
          animate={
            transition ? {
              opacity: 1,
              top: 18,
              left: '35%',
              right: '35%',
            } : {
              opacity: 0,
              top: 18,
              left: '35%',
              right: '35%',
            }
          }
          transition={{ type: 'spring', stiffness: 200, damping: 30 }}
          className="absolute z-110">
          <CommandMenu />
        </motion.div>

        <motion.div
          initial={{
            top: 18,
            right: -43,
            opacity: 0,
          }}
          animate={
            transition
              ? {
                top: 18,
                right: 20,
                opacity: 1,
              }
              : {
                top: 18,
                right: -43,
                opacity: 0,
              }
          }
          transition={{ type: 'spring', stiffness: 200, damping: 30 }}
          className="absolute z-110 flex items-center gap-x-4"
        >
          <ModeToggle />
          <Activity mode={isLoaded && isSignedIn ? 'visible' : 'hidden'}>
            <UserButton />
          </Activity>
        </motion.div>
      </div>
    </motion.div>
  );
};