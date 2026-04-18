"use client";

import { IconBolt, IconShieldCheck, IconWorld } from "@tabler/icons-react";

import { BorderBeamSimple } from "@ws/ui/components/ui/border-beam-simple";
import { Link } from "@/i18n/navigation";
import { MotionEffect } from "@/shared/ui/effects/motion-effect";
import { Outfit } from "next/font/google";
import { RainbowButton } from "@ws/ui/components/ui/rainbow-button";
import { SocialProof } from "./social-proof";
import { SplittingText } from "@ws/ui/components/animate-ui/primitives/texts/splitting";
import { cn } from "@ws/ui/lib/utils";
import { motion } from "@ws/ui/internal-lib/motion";

interface HeroProps {
  startChatHref: string;
  isSignedIn?: boolean;
  isLoaded: boolean;
}

const outfit = Outfit({ subsets: ["latin"] });
const TITLE = "Meet the World. Live.";

export function Hero({ startChatHref, isSignedIn, isLoaded }: HeroProps) {
  return (
    <div className={cn(outfit.className, 'min-h-dvh')}>
      <div className="h-[calc(100dvh-16rem)]">

        {/* Header */}
        <div className="space-y-4 text-center py-6 sm:space-y-5 sm:py-8 md:space-y-6">
          <MotionEffect slide={{ direction: "down" }} fade zoom inView>
            <motion.div
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.3, ease: [0.23, 1, 0.32, 1] }}
              className="relative inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-zinc-100/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-600 dark:text-zinc-100 mb-8 backdrop-blur-sm shadow-sm overflow-hidden"
            >
              <BorderBeamSimple
                size={40}
                duration={3}
                delay={0}
                borderWidth={1.5}
                colorFrom="rgba(0, 0, 0, 0.5)"
                colorTo="transparent"
                className="dark:hidden"
              />
              <BorderBeamSimple
                size={40}
                duration={3}
                delay={0}
                borderWidth={1.5}
                colorFrom="rgba(255, 255, 255, 0.5)"
                colorTo="transparent"
                className="hidden dark:block"
              />
              <span className="tracking-widest uppercase text-zinc-500 dark:text-zinc-400 z-10 pointer-events-none">Live · Global · Instant</span>
            </motion.div>
          </MotionEffect>

          <MotionEffect slide={{ direction: "down" }} fade zoom inView delay={0.15}>
            <div className="relative z-10 pointer-events-none">
              <h1 className="mx-auto pointer-events-none">
                <SplittingText
                  text={TITLE}
                  aria-hidden="true"
                  className="block xl:text-7xl lg:text-6xl md:text-5xl text-4xl font-medium text-center text-neutral-200 dark:text-neutral-800"
                  disableAnimation
                />
              </h1>

              <div className="absolute inset-0 mx-auto flex items-center justify-center">
                <SplittingText
                  text={TITLE}
                  className="block xl:text-7xl lg:text-6xl md:text-5xl text-4xl font-medium text-center"
                  type="chars"
                  delay={400}
                  initial={{ opacity: 0, filter: "blur(10px)" }}
                  animate={{ opacity: 1, filter: "blur(0px)" }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                />
              </div>
            </div>
          </MotionEffect>

          <MotionEffect slide={{ direction: "down" }} fade zoom inView delay={0.3}>
            <p className="mx-auto max-w-2xl text-sm leading-relaxed sm:text-base md:text-xl text-muted-foreground">
              Secure, real-time video conversations — anywhere.
            </p>
          </MotionEffect>
        </div>

        {/* Content */}
        <div className="flex flex-col gap-6 px-4 sm:gap-7 sm:px-6 md:gap-8 md:px-8">
          <MotionEffect slide={{ direction: "down" }} fade zoom inView delay={0.45} className="w-full flex">
            <RainbowButton
              asChild
              size="lg"
              variant="outline"
              className="mx-auto font-semibold text-sm sm:text-base md:text-md"
            >
              <Link href={startChatHref} prefetch data-testid="start-chat-button">
                {isSignedIn && isLoaded ? "Start Chatting Now" : "Sign in to Start Chatting"}
              </Link>
            </RainbowButton>
          </MotionEffect>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-5 md:gap-6">
            {[
              {
                icon: IconWorld,
                title: "GLOBAL",
                desc: "Connect with people worldwide",
              },
              {
                icon: IconBolt,
                title: "INSTANT",
                desc: "Start chatting in seconds",
              },
              {
                icon: IconShieldCheck,
                title: "SECURE",
                desc: "Your conversations are protected",
              },
            ].map(({ icon: Icon, title, desc }) => (
              <MotionEffect key={title} slide={{ direction: "down" }} fade zoom delay={0.75}>
                <div className="flex flex-col items-center gap-2.5 text-center sm:gap-3">
                  <div className="rounded-full bg-primary/10 p-2.5 sm:p-3">
                    <Icon className="h-5 w-5 text-primary sm:h-6 sm:w-6" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold sm:text-base text-foreground opacity-70">{title}</span>
                    <p className="text-xs text-muted-foreground sm:text-sm opacity-80">{desc}</p>
                  </div>
                </div>
              </MotionEffect>
            ))}
          </div>

          <div className="flex flex-col items-center gap-3 pt-2 sm:gap-4 sm:pt-4">
            <MotionEffect slide={{ direction: "down" }} fade zoom delay={0.85}>
              <SocialProof />
            </MotionEffect>
            <MotionEffect slide={{ direction: "down" }} fade zoom delay={0.9}>
              <p className="text-xs text-muted-foreground sm:text-sm">
                Join <span className="font-semibold text-foreground">1,000+</span> people chatting right now
              </p>
            </MotionEffect>
          </div>
        </div>
      </div>
    </div>
  );
}
