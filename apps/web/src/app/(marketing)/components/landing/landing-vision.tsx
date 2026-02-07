"use client";

import { Card, CardContent } from "@repo/ui/components/ui/card";
import { IconTrendingUp, IconBrain, IconUsers } from "@tabler/icons-react";
import { MotionEffect } from "@/components/effects/motion-effect";

const VISION_POINTS = [
  {
    icon: IconBrain,
    title: "Smarter Matching",
    description: "AI-powered interest matching that learns from your interactions",
  },
  {
    icon: IconTrendingUp,
    title: "Meaningful Progression",
    description: "Level up, earn rewards, and unlock premium features as you engage",
  },
  {
    icon: IconUsers,
    title: "Community Building",
    description: "Build a network of favorites and reconnect with people you enjoyed talking to",
  },
];

export function LandingVision() {
  return (
    <section className="w-full py-12 sm:py-16 md:py-20">
      <MotionEffect slide={{ direction: 'up' }} fade inView>
        <Card className="border-border/50 bg-gradient-to-br from-primary/5 to-transparent">
          <CardContent className="p-6 sm:p-8 md:p-10 space-y-8 sm:space-y-10">
            <div className="text-center space-y-3 sm:space-y-4">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold">
                Where We're Going
              </h2>
              <p className="text-muted-foreground text-sm sm:text-base md:text-lg max-w-2xl mx-auto">
                Random chat with purpose. We're building features that reward meaningful connections and encourage you to come back.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
              {VISION_POINTS.map((point, index) => {
                const Icon = point.icon;
                return (
                  <MotionEffect
                    key={point.title}
                    slide={{ direction: 'up' }}
                    fade
                    inView
                    delay={0.1 * index}
                  >
                    <div className="text-center space-y-3 sm:space-y-4">
                      <div className="mx-auto rounded-full bg-primary/10 p-3 w-fit">
                        <Icon className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-base sm:text-lg mb-2">
                          {point.title}
                        </h3>
                        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                          {point.description}
                        </p>
                      </div>
                    </div>
                  </MotionEffect>
                );
              })}
            </div>

            <div className="pt-4 sm:pt-6 border-t border-border/50">
              <p className="text-center text-xs sm:text-sm text-muted-foreground">
                This isn't a roadmap promise. These are active features in development that will roll out as they're ready.
              </p>
            </div>
          </CardContent>
        </Card>
      </MotionEffect>
    </section>
  );
}
