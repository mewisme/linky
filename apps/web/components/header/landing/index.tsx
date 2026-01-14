'use client'

import { useEffect, useState } from "react"
import dynamic from "next/dynamic";

import { Logo } from "./logo";
import { motion, type Variants } from "motion/react"
import { useIsMobile } from "@repo/ui/hooks/use-mobile";
import Link from "next/link";
import { ModeToggle } from "../mode-toggle";
import { ConnectionStatus, getConnectionStatusMessage } from "@/hooks/use-video-chat-state";
import { Badge } from "@repo/ui/components/ui/badge";
import { useAuth } from "@clerk/nextjs";

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

const logoVariants = (isScroll: boolean, isMobile: boolean) => ({
  center: {
    top: '50%',
    left: '50%',
    x: '-50%',
    y: '-50%',
    scale: 1,
  },
  topLeft: {
    top: isScroll ? (isMobile ? 3 : 0) : 10,
    left: isScroll ? (isMobile ? -10 : -61) : isMobile ? -10 : -10,
    x: 0,
    y: 0,
    scale: isScroll ? (isMobile ? 0.6 : 0.5) : 0.6,
  },
});

export const Header = ({ transition, connectionStatus }: { transition: boolean, connectionStatus?: ConnectionStatus }) => {
  const isMobile = useIsMobile();
  const [isScroll, setIsScroll] = useState(false);
  const { isSignedIn, isLoaded } = useAuth();

  useEffect(() => {
    const handleScroll = () => setIsScroll(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
        <motion.div
          className="absolute z-110"
          variants={logoVariants(isScroll, isMobile)}
          initial="center"
          animate={transition ? 'topLeft' : 'center'}
          transition={{ type: 'spring', stiffness: 200, damping: 30 }}
        >
          <Link href="/">
            <Logo size={isMobile ? 'lg' : 'xl'} draw />
          </Link>
        </motion.div>

        {connectionStatus && (
          <motion.div
            initial={{
              top: isScroll ? (isMobile ? 10 : 7.5) : 18,
              opacity: 0,
            }}
            animate={{
              top: isScroll ? (isMobile ? 10 : 7.5) : 18,
              opacity: 1,
            }}
            transition={{ type: 'spring', stiffness: 200, damping: 30 }}
            className="absolute left-1/2 -translate-x-1/2 z-110"
          >
            <Badge variant="outline">
              {getConnectionStatusMessage(connectionStatus)}
            </Badge>
          </motion.div>
        )}

        <motion.div
          initial={{
            top: isScroll ? (isMobile ? 10 : 7.5) : 18,
            right: -43,
            opacity: 0,
          }}
          animate={
            transition
              ? {
                top: isScroll ? (isMobile ? 10 : 7.5) : 18,
                right: 20,
                opacity: 1,
              }
              : {
                top: isScroll ? (isMobile ? 10 : 7.5) : 18,
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