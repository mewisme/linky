"use client";

import {
  blockUser as blockUserAPI,
  getBlockedUsers as getBlockedUsersAPI,
  unblockUser as unblockUserAPI,
} from "@/lib/api/user-blocks";
import { useCallback, useEffect, useRef } from "react";

import { toast } from "@ws/ui/components/ui/sonner";
import { trackEvent } from "@/lib/analytics/events/client";
import { useBlockedUsersStore } from "@/stores/blocked-users-store";
import { useUserContext } from "@/components/providers/user/user-provider";

export function useBlockUser() {
  const { state: { getToken }, authReady } = useUserContext();
  const blockedUserIds = useBlockedUsersStore((s) => s.blockedUserIds);
  const isLoading = useBlockedUsersStore((s) => s.isLoading);
  const isBlocked = useBlockedUsersStore((s) => s.isBlocked);
  const fetchedRef = useRef(false);

  const fetchBlockedUsers = useCallback(async () => {
    const token = await getToken();
    if (!token) return;

    useBlockedUsersStore.getState().setLoading(true);
    try {
      const data = await getBlockedUsersAPI(token);
      useBlockedUsersStore.getState().setBlockedUsers(
        data.blocked_users.map((u) => u.blocked_user_id)
      );
    } catch (error) {
      useBlockedUsersStore.getState().setError(
        error instanceof Error ? error.message : "Failed to fetch blocked users"
      );
    } finally {
      useBlockedUsersStore.getState().setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    if (authReady && !fetchedRef.current) {
      fetchedRef.current = true;
      void fetchBlockedUsers();
    }
  }, [authReady, fetchBlockedUsers]);

  const blockUser = useCallback(
    async (userId: string) => {
      const token = await getToken();
      if (!token) return;

      try {
        await blockUserAPI(userId, token);
        useBlockedUsersStore.getState().blockUser(userId);
        trackEvent({ name: "user_blocked" });
        toast.success("User blocked");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to block user"
        );
        throw error;
      }
    },
    [getToken]
  );

  const unblockUser = useCallback(
    async (userId: string) => {
      const token = await getToken();
      if (!token) return;

      try {
        await unblockUserAPI(userId, token);
        useBlockedUsersStore.getState().unblockUser(userId);
        trackEvent({ name: "user_unblocked" });
        toast.success("User unblocked");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to unblock user"
        );
        throw error;
      }
    },
    [getToken]
  );

  return {
    blockUser,
    unblockUser,
    isBlocked,
    blockedUserIds,
    isLoading,
    fetchBlockedUsers,
  };
}
