"use client";

import * as Sentry from "@sentry/nextjs";

import {
  blockUser as blockUserAction,
  getBlockedUsers as getBlockedUsersAction,
  unblockUser as unblockUserAction,
} from "@/features/user/api/blocks";
import { useCallback, useEffect, useRef } from "react";

import { toast } from "@ws/ui/components/ui/sonner";
import { useTranslations } from "next-intl";
import { trackEvent } from "@/lib/telemetry/events/client";
import { useBlockedUsersStore } from "@/features/user/model/blocked-users-store";
import { useUserContext } from "@/providers/user/user-provider";

export function useBlockUser() {
  const t = useTranslations("user");
  const { authReady } = useUserContext();
  const blockedUserIds = useBlockedUsersStore((s) => s.blockedUserIds);
  const isLoading = useBlockedUsersStore((s) => s.isLoading);
  const isBlocked = useBlockedUsersStore((s) => s.isBlocked);
  const fetchedRef = useRef(false);

  const fetchBlockedUsers = useCallback(async () => {
    Sentry.metrics.count("fetch_blocked_users", 1);
    useBlockedUsersStore.getState().setLoading(true);
    try {
      const data = await getBlockedUsersAction();
      useBlockedUsersStore.getState().setBlockedUsers(
        data.blocked_users.map((u) => u.blocked_user_id)
      );
    } catch (error) {
      Sentry.metrics.count("fetch_blocked_users_failed", 1);
      Sentry.logger.error("Failed to fetch blocked users", { error: error instanceof Error ? error.message : "Unknown error" });
      useBlockedUsersStore.getState().setError(
        error instanceof Error ? error.message : "Failed to fetch blocked users"
      );
    } finally {
      Sentry.metrics.count("fetch_blocked_users_completed", 1);
      useBlockedUsersStore.getState().setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authReady && !fetchedRef.current) {
      Sentry.metrics.count("fetch_blocked_users_started", 1);
      fetchedRef.current = true;
      void fetchBlockedUsers();
    }
  }, [authReady, fetchBlockedUsers]);

  const blockUser = useCallback(async (userId: string) => {
    try {
      Sentry.metrics.count("block_user", 1);
      await blockUserAction(userId);
      useBlockedUsersStore.getState().blockUser(userId);
      trackEvent({ name: "user_blocked" });
      toast.success(t("userBlocked"));
    } catch (error) {
      Sentry.metrics.count("block_user_failed", 1);
      Sentry.logger.error("Failed to block user", { error: error instanceof Error ? error.message : "Unknown error" });
      toast.error(
        error instanceof Error ? error.message : t("blockFailed")
      );
      throw error;
    }
  }, [t]);

  const unblockUser = useCallback(async (userId: string) => {
    try {
      Sentry.metrics.count("unblock_user", 1);
      await unblockUserAction(userId);
      useBlockedUsersStore.getState().unblockUser(userId);
      trackEvent({ name: "user_unblocked" });
      toast.success(t("userUnblocked"));
    } catch (error) {
      Sentry.metrics.count("unblock_user_failed", 1);
      Sentry.logger.error("Failed to unblock user", { error: error instanceof Error ? error.message : "Unknown error" });
      toast.error(
        error instanceof Error ? error.message : t("unblockFailed")
      );
      throw error;
    }
  }, [t]);

  return {
    blockUser,
    unblockUser,
    isBlocked,
    blockedUserIds,
    isLoading,
    fetchBlockedUsers,
  };
}
