"use client";

import { AnimatePresence, motion } from "@ws/ui/internal-lib/motion";
import { useEffect, useState } from "react";

import Image from "next/image";
import { useReactionEffectContext } from "@/providers/realtime/reaction-effect-provider";

type ReactionMode = "single" | "burst";

interface ReactionInstance {
  id: string;
  x: number;
  y: number;
  scale: number;
  delay: number;
  duration: number;
  initialRotation: number;
  swayAmplitude: number;
}

const BURST_COUNT_MIN = 10;
const BURST_COUNT_MAX = 20;
const ANIMATION_DURATION_MIN = 1.25;
const ANIMATION_DURATION_MAX = 1.9;

function randomInRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randomIntInRange(min: number, max: number): number {
  return Math.floor(randomInRange(min, max + 1));
}

function reactionTypeRendersAsEmojiGlyph(type: string): boolean {
  if (type === "heart") return false;
  return /\p{Extended_Pictographic}/u.test(type);
}

function toNormalizedReactionTypes(type: string | string[]): string[] {
  const types = Array.isArray(type) ? type : [type];
  const normalizedTypes = types.filter((value): value is string => typeof value === "string" && value.length > 0);
  return normalizedTypes.length > 0 ? normalizedTypes : ["heart"];
}

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const current = result[i]!;
    result[i] = result[j]!;
    result[j] = current;
  }
  return result;
}

function buildDisplayTypesForInstances(types: string[], instanceCount: number): string[] {
  if (instanceCount <= 0) {
    return [];
  }

  const uniqueTypes = Array.from(new Set(types));
  const resolvedTypes = uniqueTypes.length > 0 ? uniqueTypes : ["heart"];
  const selected = shuffle(resolvedTypes).slice(0, Math.min(instanceCount, resolvedTypes.length));

  while (selected.length < instanceCount) {
    const randomIndex = Math.floor(Math.random() * resolvedTypes.length);
    selected.push(resolvedTypes[randomIndex]!);
  }

  return shuffle(selected);
}

export function ReactionOverlay() {
  const { reactions, removeReaction } = useReactionEffectContext();
  const [reactionInstancesById, setReactionInstancesById] = useState<Record<string, ReactionInstance[]>>({});
  const [completedCountByReaction, setCompletedCountByReaction] = useState<Record<string, number>>({});
  const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 800;

  useEffect(() => {
    setReactionInstancesById((prev) => {
      const next: Record<string, ReactionInstance[]> = { ...prev };
      const activeIds = new Set(reactions.map((reaction) => reaction.id));
      let hasChanges = false;

      for (const reaction of reactions) {
        if (next[reaction.id]) {
          continue;
        }

        const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 1280;
        const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 800;
        const instances: ReactionInstance[] = [];
        const displayTypes = toNormalizedReactionTypes(reaction.type);
        const burstCount = reaction.mode === "burst" ? randomIntInRange(BURST_COUNT_MIN, BURST_COUNT_MAX) : 1;

        if (reaction.isLocal && reaction.tapPosition) {
          for (let i = 0; i < burstCount; i++) {
            const spreadX = randomInRange(-24, 24);
            const spreadY = randomInRange(-16, 16);
            instances.push({
              id: `${reaction.id}-${i}`,
              x: reaction.tapPosition.x + spreadX,
              y: reaction.tapPosition.y + spreadY,
              scale: randomInRange(0.9, 1.2),
              delay: i * randomInRange(0.03, 0.08),
              duration: randomInRange(ANIMATION_DURATION_MIN, ANIMATION_DURATION_MAX),
              initialRotation: (Math.random() - 0.5) * 30,
              swayAmplitude: Math.random() * 8 + 4,
            });
          }
        } else {
          const idParts = reaction.id.split("-");
          const reactionIndexStr = idParts.length >= 3 ? idParts[2] : undefined;
          const reactionIndex = reactionIndexStr ? parseInt(reactionIndexStr, 10) : 0;
          const minX = viewportWidth * 0.2;
          const maxX = viewportWidth * 0.8;

          for (let i = 0; i < burstCount; i++) {
            const randomX = Math.random() * (maxX - minX) + minX;
            const randomScale = Math.random() * 0.45 + 1.15;
            const initialRotation = (Math.random() - 0.5) * 30;
            const swayAmplitude = Math.random() * 8 + 4;

            instances.push({
              id: `${reaction.id}-${i}`,
              x: randomX,
              y: viewportHeight,
              scale: randomScale,
              delay: (isNaN(reactionIndex) ? 0 : reactionIndex * 0.1) + i * randomInRange(0.04, 0.1),
              duration: randomInRange(ANIMATION_DURATION_MIN, ANIMATION_DURATION_MAX),
              initialRotation,
              swayAmplitude,
            });
          }
        }

        next[reaction.id] = instances;
        hasChanges = true;
      }

      for (const reactionId of Object.keys(next)) {
        if (!activeIds.has(reactionId)) {
          delete next[reactionId];
          hasChanges = true;
        }
      }

      return hasChanges ? next : prev;
    });

    setCompletedCountByReaction((prev) => {
      const next = { ...prev };
      let hasChanges = false;
      for (const reactionId of reactions.map((reaction) => reaction.id)) {
        if (next[reactionId] === undefined) {
          next[reactionId] = 0;
          hasChanges = true;
        }
      }
      for (const reactionId of Object.keys(next)) {
        if (!reactions.some((reaction) => reaction.id === reactionId)) {
          delete next[reactionId];
          hasChanges = true;
        }
      }
      return hasChanges ? next : prev;
    });
  }, [reactions]);

  const handleReactionComplete = (reactionId: string, totalInstances: number) => {
    setCompletedCountByReaction((prev) => {
      const nextCount = (prev[reactionId] ?? 0) + 1;
      if (nextCount >= totalInstances) {
        removeReaction(reactionId);
      }
      return {
        ...prev,
        [reactionId]: nextCount,
      };
    });
  };

  const allInstances: Array<{ reactionId: string; instance: ReactionInstance; isLocal: boolean; displayType: string; mode: ReactionMode }> = [];
  const instanceCountByReaction: Record<string, number> = {};
  Object.entries(reactionInstancesById).forEach(([reactionId, instances]) => {
    const reaction = reactions.find((r) => r.id === reactionId);
    if (!reaction) return;
    instanceCountByReaction[reactionId] = instances.length;
    const displayTypes = buildDisplayTypesForInstances(
      toNormalizedReactionTypes(reaction.type),
      instances.length
    );
    instances.forEach((instance) => {
      allInstances.push({
        reactionId,
        instance,
        isLocal: reaction.isLocal,
        displayType: displayTypes.shift() ?? "heart",
        mode: reaction.mode,
      });
    });
  });

  if (allInstances.length === 0) {
    return null;
  }

  return (
    <div className="fixed inset-0 pointer-events-none">
      <AnimatePresence>
        {allInstances.map(({ reactionId, instance, isLocal, displayType, mode }) => {
          const remoteDistance = -(viewportHeight * 2 / 3);
          const isEmojiGlyph = reactionTypeRendersAsEmojiGlyph(displayType);
          const imagePath =
            isEmojiGlyph
              ? null
              : displayType === "heart"
                ? "/images/heart.png"
                : `/images/reactions/${displayType}.png`;
          return (
            <motion.div
              key={instance.id}
              initial={{
                opacity: 0,
                scale: isLocal ? 0.8 : instance.scale * 0.8,
                rotate: instance.initialRotation,
              }}
              animate={{
                opacity: [0, 1, 1, 0],
                scale: isLocal
                  ? [0.8, 1.1, 1.1, 0.8]
                  : [instance.scale * 0.8, instance.scale, instance.scale, instance.scale * 0.8],
                rotate: [
                  instance.initialRotation,
                  instance.initialRotation + instance.swayAmplitude,
                  instance.initialRotation - instance.swayAmplitude,
                  instance.initialRotation,
                ],
              }}
              exit={{
                opacity: 0,
                scale: 0.5,
                rotate: instance.initialRotation,
              }}
              transition={{
                duration: instance.duration,
                delay: instance.delay,
                times: [0, 0.1, 0.7, 1],
                ease: "easeOut",
              }}
              onAnimationComplete={() => handleReactionComplete(reactionId, instanceCountByReaction[reactionId] ?? 1)}
              className="pointer-events-none fixed"
              style={{
                left: `${instance.x}px`,
                top: `${instance.y}px`,
                zIndex: 120,
                transform: "translate(-50%, -50%)",
                willChange: "transform, opacity",
              }}
            >
              <motion.div
                initial={{ y: 0 }}
                animate={{ y: isLocal ? (mode === "burst" ? -140 : -120) : remoteDistance }}
                transition={{
                  duration: instance.duration,
                  delay: instance.delay,
                  ease: "easeOut",
                }}
                className="pointer-events-none"
              >
                {isEmojiGlyph ? (
                  <span
                    className="pointer-events-none select-none leading-none"
                    style={{
                      fontSize: `${32 * instance.scale}px`,
                      pointerEvents: "none",
                    }}
                    aria-hidden
                  >
                    {displayType}
                  </span>
                ) : imagePath ? (
                  <Image
                    src={imagePath}
                    alt=""
                    width={32}
                    height={32}
                    className="w-8 h-8 pointer-events-none"
                    style={{
                      width: `${32 * instance.scale}px`,
                      height: `${32 * instance.scale}px`,
                      pointerEvents: "none",
                    }}
                  />
                ) : null}
              </motion.div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
