'use client';

import { useEffect, useMemo, useState } from 'react';

import type { AdminAPI } from '@/features/admin/types/admin.types';
import { useSocket } from "@/features/realtime/hooks/use-socket";

function isAdminPresenceState(value: string): value is AdminAPI.PresenceState {
  return (
    value === "offline" ||
    value === "online" ||
    value === "available" ||
    value === "matching" ||
    value === "in_call" ||
    value === "idle"
  );
}

export function useUsersPresence(users: AdminAPI.User[], enabled = true) {
  const { adminSocket } = useSocket();
  const [presenceMap, setPresenceMap] = useState<Record<string, AdminAPI.PresenceState>>({});

  useEffect(() => {
    if (!enabled || !adminSocket) return;
    const onPresenceUpdate = (update: { userId: string; state: string; updatedAt: number }) => {
      if (!isAdminPresenceState(update.state)) return;
      setPresenceMap((m) => {
        const next = update.state;
        if (m[update.userId] === next) return m;
        return { ...m, [update.userId]: next } as Record<
          string,
          AdminAPI.PresenceState
        >;
      });
    };
    adminSocket.on('presence:update', onPresenceUpdate);
    return () => {
      adminSocket.off('presence:update', onPresenceUpdate);
    };
  }, [enabled, adminSocket]);

  return useMemo(() => {
    if (!enabled) return users;
    return users.map((u) => {
      const presence = presenceMap[u.clerk_user_id] ?? u.presence ?? 'offline';
      if (u.presence === presence) return u;
      return { ...u, presence };
    });
  }, [enabled, users, presenceMap]);
}
