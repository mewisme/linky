"use client";

import { useEffect, useState } from "react";

import { AppLayout } from "@/components/layouts/app-layout";
import type { BlockedUserWithDetails } from "@/types/notifications.types";
import { BlockedUsersDataTable } from "@/components/data-table/blocked-users/data-table";
import { Button } from "@ws/ui/components/ui/button";
import { IconRefresh } from "@tabler/icons-react";
import { fetchData } from "@/lib/api/fetch/client-api";
import { apiUrl } from "@/lib/api/fetch/api-url";
import { toast } from "@ws/ui/components/ui/sonner";
import { useBlockUser } from "@/hooks/user/use-block-user";
import { useUserContext } from "@/components/providers/user/user-provider";

export default function BlockedUsersPage() {
  const { state } = useUserContext();
  const { unblockUser } = useBlockUser();
  const [data, setData] = useState<BlockedUserWithDetails[]>([]);
  const [isFetching, setIsFetching] = useState(false);

  const fetchBlockedUsers = async () => {
    setIsFetching(true);
    try {
      const token = await state.getToken();
      if (!token) return;

      const res = await fetchData<{ blocked_users: BlockedUserWithDetails[] }>(
        apiUrl.users.blocksMe(),
        { token }
      );
      setData(res.blocked_users);
    } catch {
      toast.error("Failed to load blocked users");
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    void fetchBlockedUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUnblock = async (user: BlockedUserWithDetails) => {
    try {
      await unblockUser(user.blocked_user_id);
      setData((prev) => prev.filter((u) => u.id !== user.id));
    } catch {
      // WARNING: toast already shown in hook
    }
  };

  return (
    <AppLayout
      label="Blocked Users"
      description="Manage users you have blocked"
    >
      <BlockedUsersDataTable
        initialData={data}
        callbacks={{
          onUnblock: handleUnblock,
        }}
        leftColumnVisibilityContent={
          <Button
            variant="outline"
            size="sm"
            onClick={() => void fetchBlockedUsers()}
            disabled={isFetching}
          >
            <IconRefresh
              className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`}
            />
          </Button>
        }
      />
    </AppLayout>
  );
}
