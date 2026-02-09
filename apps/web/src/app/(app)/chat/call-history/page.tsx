"use client";

import { useEffect, useState } from "react";

import { AppLayout } from "@/components/layouts/app-layout";
import { Button } from "@ws/ui/components/ui/button";
import { CallHistoryDataTable } from "@/components/data-table/call-history/data-table";
import type { CallHistoryResponse } from "@/types/call-history.types";
import {
  IconRefresh
} from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useUserContext } from "@/components/providers/user/user-provider";

export default function CallHistoryPage() {
  const { state } = useUserContext();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const fetchToken = async () => {
      const token = await state.getToken();
      setToken(token);
    }
    fetchToken();
  }, [state]);

  const { data: callHistory, isLoading, refetch } = useQuery({
    queryKey: ['call-history'],
    queryFn: async () => {
      const res = await fetch(`/api/resources/call-history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to load data");
      return res.json() as Promise<CallHistoryResponse>;
    },
    enabled: !!token,
  })

  return (
    <AppLayout label="Call History" description="View your call history" >
      <CallHistoryDataTable
        initialData={callHistory?.data || []}
        leftColumnVisibilityContent={
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
            <IconRefresh className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        }
      />
    </AppLayout>
  )
}
