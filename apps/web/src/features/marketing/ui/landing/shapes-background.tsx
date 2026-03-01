"use client";

import { Variants, motion } from "@ws/ui/internal-lib/motion";

import { cn } from "@ws/ui/lib/utils";

const BACKGROUND_VARIANTS: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: { type: 'spring', stiffness: 100, damping: 30, delay: 0.75 },
  },
};


function ElegantShape({
  className,
  delay = 0,
  width = 400,
  height = 100,
  rotate = 0,
  gradient = "from-white/[0.08]",
  borderRadius = 16,
}: {
  className?: string;
  delay?: number;
  width?: number;
  height?: number;
  rotate?: number;
  gradient?: string;
  borderRadius?: number;
}) {
  return (
    <motion.div
      animate={{
        opacity: 1,
        y: 0,
        rotate,
      }}
      className={cn("absolute", className)}
      initial={{
        opacity: 0,
        y: -150,
        rotate: rotate - 15,
      }}
      transition={{
        duration: 2.4,
        delay,
        ease: [0.23, 0.86, 0.39, 0.96],
        opacity: { duration: 1.2 },
      }}
    >
      <motion.div
        animate={{
          y: [0, 15, 0],
        }}
        className="relative"
        style={{
          width,
          height,
        }}
        transition={{
          duration: 12,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
        }}
      >
        <div
          className={cn(
            "absolute inset-0",
            "bg-linear-to-r to-transparent",
            gradient,
            "backdrop-blur-[1px]",
            "ring-1 ring-white/30 dark:ring-white/20",
            "shadow-[0_2px_16px_-2px_rgba(255,255,255,0.04)]",
            "after:absolute after:inset-0",
            "after:bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.12),transparent_70%)]",
            "after:rounded-[inherit]"
          )}
          style={{ borderRadius }}
        />
      </motion.div>
    </motion.div>
  );
}

export function ShapeBackground({
  transition,
  className,
}: {
  transition: boolean;
  className?: string;
}) {
  return (
    <motion.div
      variants={BACKGROUND_VARIANTS}
      initial="hidden"
      animate={transition ? 'visible' : 'hidden'}
      className={cn("pointer-events-none fixed inset-0 overflow-hidden", className)}>
      <div className="absolute inset-0 bg-linear-to-br from-indigo-500/2 via-transparent to-rose-500/2 blur-3xl dark:from-indigo-500/5 dark:via-transparent dark:to-rose-500/5" />

      <div className="absolute inset-0 overflow-hidden">
        {/* Tall rectangle - top left */}
        <ElegantShape
          borderRadius={24}
          className="top-[-10%] left-[-15%]"
          delay={0.3}
          gradient="from-indigo-500/[0.25] dark:from-indigo-500/[0.35]"
          height={500}
          rotate={-8}
          width={300}
        />

        {/* Wide rectangle - bottom right */}
        <ElegantShape
          borderRadius={20}
          className="right-[-20%] bottom-[-5%]"
          delay={0.5}
          gradient="from-rose-500/[0.25] dark:from-rose-500/[0.35]"
          height={200}
          rotate={15}
          width={600}
        />

        {/* Square - middle left */}
        <ElegantShape
          borderRadius={32}
          className="top-[40%] left-[-5%]"
          delay={0.4}
          gradient="from-violet-500/[0.25] dark:from-violet-500/[0.35]"
          height={300}
          rotate={24}
          width={300}
        />

        {/* Small rectangle - top right */}
        <ElegantShape
          borderRadius={12}
          className="top-[5%] right-[10%]"
          delay={0.6}
          gradient="from-amber-500/[0.25] dark:from-amber-500/[0.35]"
          height={100}
          rotate={-20}
          width={250}
        />

        {/* New shapes */}
        {/* Medium rectangle - center right */}
        <ElegantShape
          borderRadius={16}
          className="top-[45%] right-[-10%]"
          delay={0.7}
          gradient="from-emerald-500/[0.25] dark:from-emerald-500/[0.35]"
          height={150}
          rotate={35}
          width={400}
        />

        {/* Small square - bottom left */}
        <ElegantShape
          borderRadius={28}
          className="bottom-[10%] left-[20%]"
          delay={0.2}
          gradient="from-blue-500/[0.25] dark:from-blue-500/[0.35]"
          height={200}
          rotate={-25}
          width={200}
        />

        {/* Tiny rectangle - top center */}
        <ElegantShape
          borderRadius={10}
          className="top-[15%] left-[40%]"
          delay={0.8}
          gradient="from-purple-500/[0.25] dark:from-purple-500/[0.35]"
          height={80}
          rotate={45}
          width={150}
        />

        {/* Wide rectangle - middle */}
        <ElegantShape
          borderRadius={18}
          className="top-[60%] left-[25%]"
          delay={0.9}
          gradient="from-teal-500/[0.25] dark:from-teal-500/[0.35]"
          height={120}
          rotate={-12}
          width={450}
        />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-white via-transparent to-white/80 dark:from-[#030303] dark:via-transparent dark:to-[#030303]/80" />
    </motion.div>
  );
}
