"use client";

import { AnimatePresence, motion } from "@ws/ui/internal-lib/motion";
import { useEffect, useRef, useState } from "react";

import Image from "next/image";
import { useReactionEffectContext } from "@/providers/realtime/reaction-effect-provider";

interface ReactionInstance {
  id: string;
  x: number;
  y: number;
  scale: number;
  delay: number;
  initialRotation: number;
  swayAmplitude: number;
}

interface ReactionOverlayProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export function ReactionOverlay({ containerRef }: ReactionOverlayProps) {
  const { reactions, removeReaction } = useReactionEffectContext();
  const [reactionInstances, setReactionInstances] = useState<Map<string, ReactionInstance[]>>(new Map());
  const processedReactionIdsRef = useRef<Set<string>>(new Set());
  const reactionInstancesRef = useRef<Map<string, ReactionInstance[]>>(new Map());
  const removeReactionTimeoutIdsRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 800;

  useEffect(() => {
    return () => {
      removeReactionTimeoutIdsRef.current.forEach((id) => clearTimeout(id));
      removeReactionTimeoutIdsRef.current.clear();
    };
  }, []);

  useEffect(() => {
    reactionInstancesRef.current = reactionInstances;
  }, [reactionInstances]);

  useEffect(() => {
    reactions.forEach((reaction) => {
      if (processedReactionIdsRef.current.has(reaction.id)) return;

      const container = containerRef.current;
      if (!container) return;

      const containerRect = container.getBoundingClientRect();
      const containerWidth = containerRect.width;
      const containerHeight = containerRect.height;
      const containerTop = containerRect.top;
      const containerLeft = containerRect.left;

      const instances: ReactionInstance[] = [];

      if (reaction.isLocal && reaction.tapPosition) {
        const screenX = containerLeft + reaction.tapPosition.x;
        const screenY = containerTop + reaction.tapPosition.y;
        instances.push({
          id: reaction.id,
          x: screenX,
          y: screenY,
          scale: 1,
          delay: 0,
          initialRotation: (Math.random() - 0.5) * 30,
          swayAmplitude: Math.random() * 8 + 4,
        });
      } else {
        const idParts = reaction.id.split("-");
        const reactionIndexStr = idParts.length >= 3 ? idParts[2] : undefined;
        const reactionIndex = reactionIndexStr ? parseInt(reactionIndexStr, 10) : 0;
        const minX = containerWidth * 0.2;
        const maxX = containerWidth * 0.8;
        const randomX = Math.random() * (maxX - minX) + minX;
        const screenX = containerLeft + randomX;
        const screenY = containerTop + containerHeight;
        const randomScale = Math.random() * 0.45 + 1.15;
        const initialRotation = (Math.random() - 0.5) * 30;
        const swayAmplitude = Math.random() * 8 + 4;

        instances.push({
          id: reaction.id,
          x: screenX,
          y: screenY,
          scale: randomScale,
          delay: isNaN(reactionIndex) ? 0 : reactionIndex * 0.1,
          initialRotation,
          swayAmplitude,
        });
      }

      processedReactionIdsRef.current.add(reaction.id);
      setReactionInstances((prev) => {
        const next = new Map(prev);
        next.set(reaction.id, instances);
        return next;
      });
    });

    const currentReactionIds = new Set(reactions.map((r) => r.id));
    const removedReactionIds = Array.from(reactionInstancesRef.current.keys()).filter(
      (id) => !currentReactionIds.has(id)
    );

    if (removedReactionIds.length > 0) {
      removedReactionIds.forEach((id) => processedReactionIdsRef.current.delete(id));
      setReactionInstances((prev) => {
        const next = new Map(prev);
        removedReactionIds.forEach((id) => next.delete(id));
        return next;
      });
    }
  }, [reactions, containerRef]);

  const handleReactionComplete = (reactionId: string) => {
    setReactionInstances((prev) => {
      const next = new Map(prev);
      next.delete(reactionId);
      return next;
    });
    const timeoutId = setTimeout(() => {
      removeReactionTimeoutIdsRef.current.delete(timeoutId);
      removeReaction(reactionId);
    }, 0);
    removeReactionTimeoutIdsRef.current.add(timeoutId);
  };

  const allInstances: Array<{ reactionId: string; instance: ReactionInstance; isLocal: boolean; type: string }> = [];
  reactionInstances.forEach((instances, reactionId) => {
    const reaction = reactions.find((r) => r.id === reactionId);
    if (!reaction) return;
    instances.forEach((instance) => {
      allInstances.push({ reactionId, instance, isLocal: reaction.isLocal, type: reaction.type });
    });
  });

  return (
    <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 100 }}>
      <AnimatePresence>
        {allInstances.map(({ reactionId, instance, isLocal, type }) => {
          const remoteDistance = -(viewportHeight * 2 / 3);
          const imagePath = type === "heart" ? "/images/heart.png" : `/images/reactions/${type}.png`;
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
                duration: 1,
                delay: instance.delay,
                times: [0, 0.1, 0.7, 1],
                ease: "easeOut",
              }}
              onAnimationComplete={() => handleReactionComplete(reactionId)}
              className="pointer-events-none fixed"
              style={{
                left: `${instance.x}px`,
                top: `${instance.y}px`,
                transform: "translate(-50%, -50%)",
                willChange: "transform, opacity",
              }}
            >
              <motion.div
                initial={{ y: 0 }}
                animate={{ y: isLocal ? -120 : remoteDistance }}
                transition={{
                  duration: 1,
                  delay: instance.delay,
                  ease: "easeOut",
                }}
                className="pointer-events-none"
              >
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
              </motion.div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
