"use client";

import { AspectRatio } from "@ws/ui/components/ui/aspect-ratio";
import { Badge } from "@ws/ui/components/ui/badge";
import { Card } from "@ws/ui/components/ui/card";
import { IconVideo } from "@tabler/icons-react";
import { MotionEffect } from "@/components/effects/motion-effect";

export function LandingPreview() {
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
            See How It Works
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base md:text-lg max-w-2xl mx-auto">
            Clean, intuitive interface designed for real conversations.
          </p>
        </MotionEffect>

        <MotionEffect slide={{ direction: 'up' }} fade inView delay={0.1}>
          <Card className="overflow-hidden border-border/50 bg-gradient-to-br from-primary/10 to-transparent">
            <AspectRatio ratio={16 / 6}>
              <div className="relative w-full h-full flex items-center justify-center p-8 sm:p-12 md:p-16">
                <div className="grid grid-cols-2 gap-4 sm:gap-6 w-full max-w-4xl">
                  <div className="aspect-video rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 border-2 border-primary/30 flex items-center justify-center">
                    <div className="text-center space-y-2">
                      <IconVideo className="h-8 w-8 sm:h-12 sm:w-12 mx-auto text-primary/60" />
                      <p className="text-xs sm:text-sm text-muted-foreground">Your Video</p>
                    </div>
                  </div>
                  <div className="aspect-video rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-500/5 border-2 border-blue-500/30 flex items-center justify-center">
                    <div className="text-center space-y-2">
                      <IconVideo className="h-8 w-8 sm:h-12 sm:w-12 mx-auto text-blue-500/60" />
                      <p className="text-xs sm:text-sm text-muted-foreground">Peer Video</p>
                    </div>
                  </div>
                </div>
              </div>
            </AspectRatio>
            <div className="p-4 sm:p-5 md:p-6 bg-muted/30 border-t border-border/50">
              <div className="flex flex-wrap gap-2 justify-center">
                <Badge variant="secondary" className="text-xs sm:text-sm">
                  WebRTC Peer-to-Peer
                </Badge>
                <Badge variant="secondary" className="text-xs sm:text-sm">
                  Real-time Messaging
                </Badge>
                <Badge variant="secondary" className="text-xs sm:text-sm">
                  Instant Reconnection
                </Badge>
              </div>
            </div>
          </Card>
        </MotionEffect>

        <MotionEffect slide={{ direction: 'up' }} fade inView delay={0.2}>
          <p className="text-center text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
            This is a representation of the actual video chat interface. All calls are peer-to-peer with end-to-end encryption via WebRTC.
          </p>
        </MotionEffect>
      </div>
    </section>
  );
}
