"use client";

import dynamic from "next/dynamic";

import { AppLayout } from "@/components/layouts/app-layout";
import { Button } from "@ws/ui/components/ui/button";
import type { CallHistoryResponse } from "@/types/call-history.types";
import {
  IconRefresh
} from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useUserTokenContext } from "@/components/providers/user/user-token-provider";
import { apiUrl } from "@/lib/api/fetch/api-url";
import { fetchData } from "@/lib/api/fetch/client-api";

const CallHistoryDataTable = dynamic(
  () => import("@/components/data-table/call-history/data-table").then(mod => ({ default: mod.CallHistoryDataTable })),
  { ssr: false }
);

export default function CallHistoryPage() {
  const { token } = useUserTokenContext();

  const { data: callHistory, isLoading, refetch } = useQuery({
    queryKey: ['call-history'],
    queryFn: async () => {
      return fetchData<CallHistoryResponse>(
        apiUrl.resources.callHistory(),
        { token: token ?? undefined }
      );
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
