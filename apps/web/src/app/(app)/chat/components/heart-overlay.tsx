"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

import Image from "next/image";
import { useHeartReactionContext } from "@/components/providers/realtime/heart-reaction-provider";

interface HeartInstance {
  id: string;
  x: number;
  y: number;
  scale: number;
  delay: number;
  initialRotation: number;
  swayAmplitude: number;
}

interface HeartOverlayProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export function HeartOverlay({ containerRef }: HeartOverlayProps) {
  const { hearts, removeHeart } = useHeartReactionContext();
  const [heartInstances, setHeartInstances] = useState<Map<string, HeartInstance[]>>(new Map());
  const processedHeartIdsRef = useRef<Set<string>>(new Set());
  const heartInstancesRef = useRef<Map<string, HeartInstance[]>>(new Map());
  const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 800;

  useEffect(() => {
    heartInstancesRef.current = heartInstances;
  }, [heartInstances]);

  useEffect(() => {
    hearts.forEach((heart) => {
      if (processedHeartIdsRef.current.has(heart.id)) return;

      const container = containerRef.current;
      if (!container) return;

      const containerRect = container.getBoundingClientRect();
      const containerWidth = containerRect.width;
      const containerHeight = containerRect.height;
      const containerTop = containerRect.top;
      const containerLeft = containerRect.left;

      const instances: HeartInstance[] = [];

      if (heart.isLocal && heart.tapPosition) {
        const screenX = containerLeft + heart.tapPosition.x;
        const screenY = containerTop + heart.tapPosition.y;
        instances.push({
          id: heart.id,
          x: screenX,
          y: screenY,
          scale: 1,
          delay: 0,
          initialRotation: (Math.random() - 0.5) * 30,
          swayAmplitude: Math.random() * 8 + 4,
        });
      } else {
        const idParts = heart.id.split("-");
        const heartIndexStr = idParts.length >= 3 ? idParts[2] : undefined;
        const heartIndex = heartIndexStr ? parseInt(heartIndexStr, 10) : 0;
        const minX = containerWidth * 0.2;
        const maxX = containerWidth * 0.8;
        const randomX = Math.random() * (maxX - minX) + minX;
        const screenX = containerLeft + randomX;
        const screenY = containerTop + containerHeight;
        const randomScale = Math.random() * 0.45 + 1.15;
        const initialRotation = (Math.random() - 0.5) * 30;
        const swayAmplitude = Math.random() * 8 + 4;

        instances.push({
          id: heart.id,
          x: screenX,
          y: screenY,
          scale: randomScale,
          delay: isNaN(heartIndex) ? 0 : heartIndex * 0.1,
          initialRotation,
          swayAmplitude,
        });
      }

      processedHeartIdsRef.current.add(heart.id);
      setHeartInstances((prev) => {
        const next = new Map(prev);
        next.set(heart.id, instances);
        return next;
      });
    });

    const currentHeartIds = new Set(hearts.map((h) => h.id));
    const removedHeartIds = Array.from(heartInstancesRef.current.keys()).filter(
      (id) => !currentHeartIds.has(id)
    );

    if (removedHeartIds.length > 0) {
      removedHeartIds.forEach((id) => processedHeartIdsRef.current.delete(id));
      setHeartInstances((prev) => {
        const next = new Map(prev);
        removedHeartIds.forEach((id) => next.delete(id));
        return next;
      });
    }
  }, [hearts, containerRef]);

  const handleHeartComplete = (heartId: string) => {
    setHeartInstances((prev) => {
      const next = new Map(prev);
      next.delete(heartId);
      return next;
    });
    setTimeout(() => {
      removeHeart(heartId);
    }, 0);
  };

  const allInstances: Array<{ heartId: string; instance: HeartInstance; isLocal: boolean }> = [];
  heartInstances.forEach((instances, heartId) => {
    const heart = hearts.find((h) => h.id === heartId);
    if (!heart) return;
    instances.forEach((instance) => {
      allInstances.push({ heartId, instance, isLocal: heart.isLocal });
    });
  });

  return (
    <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 100 }}>
      <AnimatePresence>
        {allInstances.map(({ heartId, instance, isLocal }) => {
          const remoteDistance = -(viewportHeight * 2 / 3);
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
              onAnimationComplete={() => handleHeartComplete(heartId)}
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
                  src="/images/heart.png"
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
