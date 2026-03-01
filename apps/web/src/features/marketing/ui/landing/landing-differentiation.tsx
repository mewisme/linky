"use client";

import { IconHeart, IconSparkles, IconTrophy, IconUserCheck } from "@tabler/icons-react";

import { Card } from "@ws/ui/components/ui/card";
import { MotionEffect } from "@/shared/ui/effects/motion-effect";

const FEATURES = [
  {
    icon: IconUserCheck,
    title: "Account-Based Identity",
    description: "Real profiles, not anonymous chaos. Every user has a verified account.",
  },
  {
    icon: IconHeart,
    title: "Favorites & Re-matching",
    description: "Found someone interesting? Add them to favorites and reconnect later.",
  },
  {
    icon: IconSparkles,
    title: "Interest-Based Matching",
    description: "Match with people who share your interests, not just random strangers.",
  },
  {
    icon: IconTrophy,
    title: "Progression System",
    description: "Earn XP, unlock features, and build streaks. A reason to keep coming back.",
  },
];

export function LandingDifferentiation() {
  return (
    <section className="w-full py-12 sm:py-16 md:py-20">
      <div className="space-y-8 sm:space-y-10 md:space-y-12">
        <MotionEffect
          slide={{ direction: 'up' }}
          fade
          inView
          className="text-center space-y-3 sm:space-y-4"
        >
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold">
            Not Just Another Random Chat
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base md:text-lg max-w-2xl mx-auto">
            Tired of Omegle clones? Linky brings structure, safety, and progression to random video chat.
          </p>
        </MotionEffect>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 md:gap-6">
          {FEATURES.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <MotionEffect
                key={feature.title}
                slide={{ direction: 'up' }}
                fade
                inView
                delay={0.1 * index}
              >
                <Card className="p-5 sm:p-6 h-full border-border/50 hover:border-border transition-colors bg-gradient-to-br from-primary/5 to-transparent">
                  <div className="space-y-3 sm:space-y-4">
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div className="rounded-lg bg-primary/10 p-2 sm:p-2.5 flex-shrink-0">
                        <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-base sm:text-lg mb-1.5 sm:mb-2">
                          {feature.title}
                        </h3>
                        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>
              </MotionEffect>
            );
          })}
        </div>
      </div>
    </section>
  );
}
