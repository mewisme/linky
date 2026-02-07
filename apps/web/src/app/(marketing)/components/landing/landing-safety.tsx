"use client";

import { Alert, AlertDescription } from "@repo/ui/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@repo/ui/components/ui/collapsible";
import { IconAlertCircle, IconChevronDown, IconLock, IconShieldCheck, IconUserX } from "@tabler/icons-react";

import { MotionEffect } from "@/components/effects/motion-effect";
import { useState } from "react";

const SAFETY_FEATURES = [
  {
    icon: IconShieldCheck,
    title: "Active Moderation",
    description: "Report inappropriate behavior instantly. Our team reviews reports and takes action.",
  },
  {
    icon: IconUserX,
    title: "Block & Skip Controls",
    description: "Not feeling the conversation? Skip instantly. Had a bad experience? Block permanently.",
  },
  {
    icon: IconLock,
    title: "Private & Temporary",
    description: "No chat logs stored. All video is peer-to-peer. When the call ends, it's gone.",
  },
];

export function LandingSafety() {
  const [detailsOpen, setDetailsOpen] = useState(false);

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
            Trust & Safety First
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base md:text-lg max-w-2xl mx-auto">
            We take your safety seriously. Here's how we protect our community.
          </p>
        </MotionEffect>

        <MotionEffect slide={{ direction: 'up' }} fade inView delay={0.1}>
          <Alert className="border-blue-500/50 bg-blue-500/5">
            <IconAlertCircle className="h-4 w-4 text-blue-500" />
            <AlertDescription className="text-sm sm:text-base">
              Linky is intended for users 18+. We verify accounts and enforce community guidelines.
            </AlertDescription>
          </Alert>
        </MotionEffect>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
          {SAFETY_FEATURES.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <MotionEffect
                key={feature.title}
                slide={{ direction: 'up' }}
                fade
                inView
                delay={0.15 + 0.1 * index}
              >
                <Card className="p-5 sm:p-6 h-full border-border/50 bg-gradient-to-br from-primary/5 to-transparent">
                  <div className="space-y-3 sm:space-y-4 text-center">
                    <div className="mx-auto rounded-full bg-primary/10 p-3 w-fit">
                      <Icon className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-base sm:text-lg mb-2">
                        {feature.title}
                      </h3>
                      <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </Card>
              </MotionEffect>
            );
          })}
        </div>

        <MotionEffect slide={{ direction: 'up' }} fade inView delay={0.45}>
          <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
            <Card className="border-border/50 bg-gradient-to-br from-primary/5 to-transparent">
              <CardHeader>
                <CollapsibleTrigger className="flex items-center justify-between w-full hover:opacity-80 transition-opacity">
                  <div className="text-left">
                    <CardTitle className="text-base sm:text-lg">Safety Details</CardTitle>
                    <CardDescription className="text-sm">
                      Click to learn more about our safety measures
                    </CardDescription>
                  </div>
                  <IconChevronDown
                    className={`h-5 w-5 text-muted-foreground transition-transform ${detailsOpen ? "rotate-180" : ""
                      }`}
                  />
                </CollapsibleTrigger>
              </CardHeader>
              <CollapsibleContent>
                <CardContent className="space-y-4 text-sm sm:text-base text-muted-foreground">
                  <div>
                    <strong className="text-foreground">What we do:</strong>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>Review user reports within 24 hours</li>
                      <li>Enforce community guidelines consistently</li>
                      <li>Provide block and skip controls to all users</li>
                      <li>Use peer-to-peer video with no server recording</li>
                    </ul>
                  </div>
                  <div>
                    <strong className="text-foreground">What we don't do:</strong>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>Store chat message history after sessions end</li>
                      <li>Record or archive video calls</li>
                      <li>Share personal information with other users</li>
                      <li>Allow anonymous accounts without verification</li>
                    </ul>
                  </div>
                  <p className="text-xs pt-2 border-t border-border/50">
                    If you feel unsafe, use the skip or block buttons immediately. Report serious violations to help keep the community safe.
                  </p>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </MotionEffect>
      </div>
    </section>
  );
}
