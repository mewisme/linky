"use client";

import { useCallback, useEffect, useRef } from "react";

import { toast } from "@ws/ui/components/ui/sonner";
import { trackEvent } from "@/lib/analytics/events/client";
import {
  blockUser as blockUserAction,
  getBlockedUsers as getBlockedUsersAction,
  unblockUser as unblockUserAction,
} from "@/lib/actions/user/blocks";
import { useBlockedUsersStore } from "@/stores/blocked-users-store";
import { useUserContext } from "@/components/providers/user/user-provider";

export function useBlockUser() {
  const { authReady } = useUserContext();
  const blockedUserIds = useBlockedUsersStore((s) => s.blockedUserIds);
  const isLoading = useBlockedUsersStore((s) => s.isLoading);
  const isBlocked = useBlockedUsersStore((s) => s.isBlocked);
  const fetchedRef = useRef(false);

  const fetchBlockedUsers = useCallback(async () => {
    useBlockedUsersStore.getState().setLoading(true);
    try {
      const data = await getBlockedUsersAction();
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
  }, []);

  useEffect(() => {
    if (authReady && !fetchedRef.current) {
      fetchedRef.current = true;
      void fetchBlockedUsers();
    }
  }, [authReady, fetchBlockedUsers]);

  const blockUser = useCallback(async (userId: string) => {
    try {
      await blockUserAction(userId);
      useBlockedUsersStore.getState().blockUser(userId);
      trackEvent({ name: "user_blocked" });
      toast.success("User blocked");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to block user"
      );
      throw error;
    }
  }, []);

  const unblockUser = useCallback(async (userId: string) => {
    try {
      await unblockUserAction(userId);
      useBlockedUsersStore.getState().unblockUser(userId);
      trackEvent({ name: "user_unblocked" });
      toast.success("User unblocked");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to unblock user"
      );
      throw error;
    }
  }, []);

  return {
    blockUser,
    unblockUser,
    isBlocked,
    blockedUserIds,
    isLoading,
    fetchBlockedUsers,
  };
}
