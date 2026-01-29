'use client';

import { useEffect, useState } from 'react';

import type { AdminAPI } from '@/types/admin.types';
import { useSocket } from '@/hooks/socket/use-socket';

export function useUsersPresence(users: AdminAPI.User[]) {
  const { adminSocket } = useSocket();
  const [presenceMap, setPresenceMap] = useState<Record<string, AdminAPI.PresenceState>>({});

  useEffect(() => {
    if (!adminSocket) return;
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
  }, [adminSocket]);

  const dataWithPresence = users.map((u) => ({
    ...u,
    presence: presenceMap[u.clerk_user_id] ?? u.presence ?? 'offline',
  }));

  return dataWithPresence;
}
