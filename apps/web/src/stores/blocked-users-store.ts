"use client";

import { create } from "zustand";

interface BlockedUsersStore {
  blockedUserIds: string[];
  isLoading: boolean;
  error: string | null;

  setBlockedUsers: (userIds: string[]) => void;
  blockUser: (userId: string) => void;
  unblockUser: (userId: string) => void;
  isBlocked: (userId: string) => boolean;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  resetState: () => void;
}

export const useBlockedUsersStore = create<BlockedUsersStore>((set, get) => ({
  blockedUserIds: [],
  isLoading: false,
  error: null,

  setBlockedUsers: (userIds) => set({ blockedUserIds: userIds, error: null }),
  blockUser: (userId) =>
    set((s) => ({
      blockedUserIds: s.blockedUserIds.includes(userId)
        ? s.blockedUserIds
        : [...s.blockedUserIds, userId],
      error: null,
    })),
  unblockUser: (userId) =>
    set((s) => ({
      blockedUserIds: s.blockedUserIds.filter((id) => id !== userId),
      error: null,
    })),
  isBlocked: (userId) => get().blockedUserIds.includes(userId),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error, isLoading: false }),
  resetState: () => set({ blockedUserIds: [], isLoading: false, error: null }),
}));
