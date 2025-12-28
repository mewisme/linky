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
import { Header } from "@/components/header";
import { RainbowButton } from "@repo/ui/components/ui/rainbow-button";
import { Separator } from "@repo/ui/components/ui/separator";
import { SocialProof } from "@/components/landing/social-proof";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";

export default function Home() {
  const { isSignedIn } = useUser();
  const router = useRouter();

  const handleStartChat = () => {
    router.push(isSignedIn ? "/chat" : "/sign-in");
  };

  return (
    <>
      <Header />
      <main className="flex min-h-screen flex-col">
        {/* Hero Section */}
        <section className="relative flex flex-1 items-center justify-center overflow-hidden px-4">
          {/* Decorative background elements */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -top-20 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl sm:-top-32 sm:h-64 sm:w-64 md:-top-40 md:h-80 md:w-80" />
            <div className="absolute bottom-0 right-0 h-36 w-36 rounded-full bg-purple-500/20 blur-3xl sm:h-56 sm:w-56 md:h-72 md:w-72" />
            <div className="absolute top-1/2 left-0 h-32 w-32 -translate-y-1/2 rounded-full bg-blue-500/10 blur-3xl sm:h-48 sm:w-48 md:h-64 md:w-64" />
          </div>

          <div className="relative z-10 w-full max-w-4xl py-6 md:py-0">
            <Card className="border-none bg-transparent backdrop-blur-xl">
              <CardHeader className="space-y-4 px-4 py-6 text-center sm:space-y-5 sm:px-6 sm:py-8 md:space-y-6 md:px-8">
                {/* Badge */}
                <div className="flex items-center justify-center gap-2">
                  <Badge variant="secondary" className="gap-1 px-2.5 py-0.5 text-xs sm:px-3 sm:py-1 sm:text-sm">
                    Live · Global · Instant
                  </Badge>
                </div>

                {/* Title */}
                <CardTitle className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl lg:text-6xl">
                  Connect with the World
                </CardTitle>

                {/* Description */}
                <CardDescription className="mx-auto max-w-2xl text-sm leading-relaxed sm:text-base md:text-lg">
                  Instantly connect with people around the world through secure,
                  real-time video conversations. No registration required to start.
                </CardDescription>
              </CardHeader>

              <CardContent className="flex flex-col gap-6 px-4 pb-6 sm:gap-7 sm:px-6 sm:pb-8 md:gap-8 md:px-8">
                {/* CTA Button */}
                <RainbowButton
                  size={'lg'}
                  variant={'outline'}
                  onClick={handleStartChat}
                  className="w-full mx-auto font-semibold text-sm sm:w-fit sm:text-base md:text-md"
                >
                  Start Chatting Now
                </RainbowButton>

                {/* Helper text */}
                <p className="text-center text-xs text-muted-foreground sm:text-sm">
                  {isSignedIn
                    ? "Jump into a new random video session"
                    : "Sign in to start chatting instantly"}
                </p>

                <Separator className="my-2 sm:my-4" />

                {/* Feature Grid */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-5 md:gap-6">
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
                </div>

                {/* Social Proof */}
                <div className="flex flex-col items-center gap-3 pt-2 sm:gap-4 sm:pt-4">
                  <SocialProof />
                  <p className="text-xs text-muted-foreground sm:text-sm">
                    Join <span className="font-semibold text-foreground">1,000+</span> people
                    chatting right now
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
    </>
  );
}
