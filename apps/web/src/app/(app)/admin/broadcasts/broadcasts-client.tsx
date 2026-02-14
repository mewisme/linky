"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@ws/ui/components/ui/card";

import type { AdminAPI } from "@/types/admin.types";
import { AppLayout } from "@/components/layouts/app-layout";
import { Button } from "@ws/ui/components/ui/button";
import { FormCreateBroadcast } from "./components/form-create";
import { IconRefresh } from "@tabler/icons-react";
import { apiUrl } from "@/lib/api/fetch/api-url";
import dynamic from "next/dynamic";
import { fetchData } from "@/lib/api/fetch/client-api";
import { useQuery } from "@tanstack/react-query";
import { useUserTokenContext } from "@/components/providers/user/user-token-provider";

const BroadcastsDataTable = dynamic(
  () =>
    import("@/components/data-table/broadcasts/data-table").then((mod) => ({
      default: mod.BroadcastsDataTable,
    }))
);

interface BroadcastsClientProps {
  initialData: AdminAPI.Broadcasts.Get.Response;
}

export function BroadcastsClient({ initialData }: BroadcastsClientProps) {
  const { token } = useUserTokenContext();

  const { data, isFetching, refetch } = useQuery({
    queryKey: ["admin", "broadcasts"],
    queryFn: async () => {
      return fetchData<AdminAPI.Broadcasts.Get.Response>(
        apiUrl.admin.broadcasts(new URLSearchParams({ limit: "50", offset: "0" })),
        {
          token: token ?? undefined,
        }
      );
    },
    initialData,
  });

  const history = data?.data ?? [];

  return (
    <AppLayout
      label="Broadcasts"
      description="Send an announcement to all users"
      className="space-y-4"
    >
      <div className="space-y-6">
        <FormCreateBroadcast onSuccess={() => void refetch()} />

        <Card>
          <CardHeader>
            <CardTitle>Broadcast history</CardTitle>
            <CardDescription>
              Recent broadcasts and who created them.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BroadcastsDataTable
              initialData={history}
              leftColumnVisibilityContent={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void refetch()}
                  disabled={isFetching}
                >
                  <IconRefresh
                    className={`size-4 ${isFetching ? "animate-spin" : ""}`}
                  />
                </Button>
              }
            />
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
