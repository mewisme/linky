"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@ws/ui/components/ui/card";

import type { AdminAPI } from "@/features/admin/types/admin.types";
import { AppLayout } from "@/shared/ui/layouts/app-layout";
import { Button } from "@ws/ui/components/ui/button";
import { FormCreateBroadcast } from "./broadcasts/form-create";
import { IconRefresh } from "@tabler/icons-react";
import dynamic from "next/dynamic";
import { getBroadcasts } from "@/features/admin/api/broadcasts";
import { useQuery } from "@ws/ui/internal-lib/react-query";

const BroadcastsDataTable = dynamic(
  () =>
    import("@/shared/ui/data-table/broadcasts/data-table").then((mod) => ({
      default: mod.BroadcastsDataTable,
    }))
);

interface BroadcastsClientProps {
  initialData: AdminAPI.Broadcasts.Get.Response;
}

export function BroadcastsClient({ initialData }: BroadcastsClientProps) {
  const { data, isFetching, refetch } = useQuery({
    queryKey: ["admin", "broadcasts"],
    queryFn: () => getBroadcasts(new URLSearchParams({ limit: '50', offset: '0' })),
    initialData,
    staleTime: Infinity,
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
