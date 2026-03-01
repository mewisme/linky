'use client'

import { IconPlus, IconRefresh } from "@tabler/icons-react";

import type { AdminAPI } from "@/features/admin/types/admin.types";
import { AppLayout } from "@/shared/ui/layouts/app-layout";
import { Button } from "@ws/ui/components/ui/button";
import Link from "next/link";
import dynamic from "next/dynamic";
import { getAdminChangelogs } from "@/features/admin/api/changelogs";
import { useQuery } from "@ws/ui/internal-lib/react-query";

const ChangelogsDataTable = dynamic(
  () => import("@/shared/ui/data-table/changelogs/data-table").then(mod => ({ default: mod.ChangelogsDataTable })),
);

interface ChangelogsClientProps {
  initialData: AdminAPI.Changelogs.Get.Response;
}

export function ChangelogsClient({ initialData }: ChangelogsClientProps) {
  const { data, isFetching, refetch } = useQuery({
    queryKey: ['changelogs'],
    queryFn: () => getAdminChangelogs(),
    initialData,
    staleTime: Infinity,
  });

  return (
    <AppLayout label="Changelogs" description="Manage changelogs for the app">
      <ChangelogsDataTable
        initialData={data?.data ?? []}
        className="w-full"
        callbacks={{}}
        leftColumnVisibilityContent={
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <IconRefresh className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
        }
        rightColumnVisibilityContent={
          <Button className="bg-primary hover:opacity-90 shadow-md" size="sm" asChild>
            <Link href='/admin/changelogs/create'>
              <IconPlus className="w-4 h-4 mr-2" /> New Changelog
            </Link>
          </Button>
        }
      />
    </AppLayout>
  );
}
