'use client';

import { useEffect, useMemo, useState } from 'react';

import type { AdminAPI } from '@/features/admin/types/admin.types';
import { useSocket } from "@/features/realtime/hooks/use-socket";

export function useUsersPresence(users: AdminAPI.User[], enabled = true) {
  const { adminSocket } = useSocket();
  const [presenceMap, setPresenceMap] = useState<Record<string, AdminAPI.PresenceState>>({});

  useEffect(() => {
    if (!enabled || !adminSocket) return;
    const onPresenceUpdate = (update: { userId: string; state: string; updatedAt: number }) => {
      setPresenceMap((m) => {
        const next = update.state as AdminAPI.PresenceState;
        if (m[update.userId] === next) return m;
        return { ...m, [update.userId]: next };
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
