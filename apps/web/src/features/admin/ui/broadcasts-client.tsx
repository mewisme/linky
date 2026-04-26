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
import { fetchFromActionRoute } from "@/shared/lib/fetch-action-route";
import { useQuery } from "@ws/ui/internal-lib/react-query";
import { useTranslations } from "next-intl";

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
  const t = useTranslations("admin");
  const { data, isFetching, refetch } = useQuery({
    queryKey: ["admin", "broadcasts"],
    queryFn: () =>
      fetchFromActionRoute<AdminAPI.Broadcasts.Get.Response>(
        "/api/admin/broadcasts?limit=50&offset=0",
      ),
    initialData,
    staleTime: Infinity,
  });

  const history = data?.data ?? [];

  return (
    <AppLayout
      sidebarItem="adminBroadcasts"
      className="space-y-4"
    >
      <div className="space-y-6">
        <FormCreateBroadcast onSuccess={() => void refetch()} />

        <Card>
          <CardHeader>
            <CardTitle>{t("broadcastHistoryTitle")}</CardTitle>
            <CardDescription>
              {t("broadcastHistoryDescription")}
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
