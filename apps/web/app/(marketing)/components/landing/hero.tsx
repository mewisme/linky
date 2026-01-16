"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/ui/card";
import {
  Globe,
  Shield,
  Zap,
} from "lucide-react";

import { Badge } from "@repo/ui/components/ui/badge";
import { BorderBeam } from "@repo/ui/components/ui/border-beam"
import { MotionEffect } from "@/components/effects/motion-effect";
import { Outfit } from "next/font/google";
import { RainbowButton } from "@repo/ui/components/ui/rainbow-button";
import { Separator } from "@repo/ui/components/ui/separator";
import { SocialProof } from "@/components/landing/social-proof";
import { SplittingText } from "@repo/ui/components/animate-ui/primitives/texts/splitting";
import { cn } from "@repo/ui/lib/utils";

interface HeroProps {
  handleStartChat: () => void;
  isSignedIn?: boolean;
  isLoaded: boolean;
}

const outfit = Outfit({ subsets: ['latin'] });
const TITLE = "Connect with the World";

export function Hero({ handleStartChat, isSignedIn, isLoaded }: HeroProps) {
  return (
    <Card className={cn("border-none bg-transparent backdrop-blur-xl", outfit.className)}>
      <CardHeader className="space-y-4 px-4 text-center sm:space-y-5 sm:px-6 sm:py-8 md:space-y-6 md:px-8">
        <MotionEffect
          slide={{
            direction: 'down',
          }}
          fade
          zoom
          inView
        >
          <div className="flex items-center justify-center gap-2 mt-4 md:mt-0">
            <Badge variant="secondary" className="gap-1 px-2.5 py-0.5 text-xs sm:px-3 sm:py-1 sm:text-sm">
              Live · Global · Instant
            </Badge>
          </div>
        </MotionEffect>
        <MotionEffect
          slide={{
            direction: 'down',
          }}
          fade
          zoom
          inView
          delay={0.15}
        >
          <CardTitle className="relative z-10">
            <h1 className="md:max-w-[800px] max-w-[320px]">
              <SplittingText
                text={TITLE}
                aria-hidden="true"
                className="block md:text-5xl text-4xl font-medium text-center text-neutral-200 dark:text-neutral-800"
                disableAnimation
              />
            </h1>
            <div className="md:max-w-[800px] max-w-[320px] absolute inset-0 flex items-center justify-center">
              <SplittingText
                text={TITLE}
                className="block md:text-5xl text-4xl font-medium text-center"
                type="chars"
                delay={400}
                initial={{ y: 0, opacity: 0, x: 0, filter: 'blur(10px)' }}
                animate={{ y: 0, opacity: 1, x: 0, filter: 'blur(0px)' }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              />
            </div>
          </CardTitle>
        </MotionEffect>
        <MotionEffect
          slide={{
            direction: 'down',
          }}
          fade
          zoom
          inView
          delay={0.3}
        >
          <CardDescription className="mx-auto max-w-2xl text-sm leading-relaxed sm:text-base md:text-lg">
            Instantly connect with people around the world through secure,
            real-time video conversations. No registration required to start.
          </CardDescription>
        </MotionEffect>
      </CardHeader>

      <CardContent className="flex flex-col gap-6 px-4 pb-6 sm:gap-7 sm:px-6 sm:pb-8 md:gap-8 md:px-8">
        <MotionEffect
          slide={{
            direction: 'down',
          }}
          fade
          zoom
          inView
          delay={0.45}
          className="w-full flex"
        >

          <RainbowButton
            size={'lg'}
            variant={'outline'}
            onClick={handleStartChat}
            className="mx-auto font-semibold text-sm sm:text-base md:text-md"
          >
            Start Chatting Now
          </RainbowButton>
        </MotionEffect>

        <MotionEffect
          slide={{
            direction: 'down',
          }}
          fade
          zoom
          inView
          delay={0.6}
        >
          <p className="text-center text-xs text-muted-foreground sm:text-sm">
            {isSignedIn && isLoaded
              ? "Jump into a new random video session"
              : "Sign in to start chatting instantly"}
          </p>
        </MotionEffect>

        <Separator className="my-2 sm:my-4" />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-5 md:gap-6">
          <MotionEffect
            slide={{
              direction: 'down',
            }}
            fade
            zoom
            delay={0.75}
          >
            <div className="flex flex-col items-center gap-2.5 text-center sm:gap-3">
              <div className="rounded-full bg-primary/10 p-2.5 sm:p-3">
                <Globe className="h-5 w-5 text-primary sm:h-6 sm:w-6" />
              </div>
              <div>
                <h3 className="text-sm font-semibold sm:text-base">Global Reach</h3>
                <p className="text-xs text-muted-foreground sm:text-sm">
                  Connect with people worldwide
                </p>
              </div>
            </div>
          </MotionEffect>

          <MotionEffect
            slide={{
              direction: 'down',
            }}
            fade
            zoom
            delay={0.75}
          >
            <div className="flex flex-col items-center gap-2.5 text-center sm:gap-3">
              <div className="rounded-full bg-primary/10 p-2.5 sm:p-3">
                <Zap className="h-5 w-5 text-primary sm:h-6 sm:w-6" />
              </div>
              <div>
                <h3 className="text-sm font-semibold sm:text-base">Instant Connection</h3>
                <p className="text-xs text-muted-foreground sm:text-sm">
                  Start chatting in seconds
                </p>
              </div>
            </div>
          </MotionEffect>

          <MotionEffect
            slide={{
              direction: 'down',
            }}
            fade
            zoom
            delay={0.75}
          >

            <div className="flex flex-col items-center gap-2.5 text-center sm:gap-3">
              <div className="rounded-full bg-primary/10 p-2.5 sm:p-3">
                <Shield className="h-5 w-5 text-primary sm:h-6 sm:w-6" />
              </div>
              <div>
                <h3 className="text-sm font-semibold sm:text-base">Secure & Private</h3>
                <p className="text-xs text-muted-foreground sm:text-sm">
                  Your conversations are protected
                </p>
              </div>
            </div>
          </MotionEffect>
        </div>

        <div className="flex flex-col items-center gap-3 pt-2 sm:gap-4 sm:pt-4">
          <SocialProof />
          <p className="text-xs text-muted-foreground sm:text-sm">
            Join <span className="font-semibold text-foreground">1,000+</span> people
            chatting right now
          </p>
        </div>
      </CardContent>
      <BorderBeam duration={8} size={100} />
    </Card>
  )
}