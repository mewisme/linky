"use client";

import { IconHeart, IconSparkles, IconTrophy, IconUserCheck } from "@tabler/icons-react";

import { Card } from "@ws/ui/components/ui/card";
import { MotionEffect } from "@/shared/ui/effects/motion-effect";
import { useTranslations } from "next-intl";

const ICONS = [IconUserCheck, IconHeart, IconSparkles, IconTrophy] as const;

export function LandingDifferentiation() {
  const t = useTranslations("marketing.differentiation");
  const items = t.raw("items") as { title: string; description: string }[];

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
            {t("heading")}
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base md:text-lg max-w-2xl mx-auto">
            {t("subheading")}
          </p>
        </MotionEffect>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 md:gap-6">
          {items.map((feature, index) => {
            const Icon = ICONS[index];
            if (!Icon) return null;
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
