'use client'

import { IconPlus, IconRefresh } from "@tabler/icons-react";
import { useEffect, useState } from "react";

import type { AdminAPI } from "@/types/admin.types";
import { AppLayout } from "@/components/layouts/app-layout";
import { Button } from "@ws/ui/components/ui/button";
import { ChangelogsDataTable } from "@/components/data-table/changelogs/data-table";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useUserContext } from "@/components/providers/user/user-provider";

export default function ChangeLogsPage() {
  const { state } = useUserContext();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const fetchToken = async () => {
      const token = await state.getToken();
      setToken(token);
    }
    fetchToken();
  }, [state]);

  const { data, isFetching, refetch } = useQuery({
    queryKey: ['changelogs'],
    queryFn: async () => {
      const res = await fetch(`/api/admin/changelogs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to load data");
      return res.json() as Promise<AdminAPI.Changelogs.Get.Response>;
    },
    enabled: !!token,
  });



  return (
    <AppLayout label="Changelogs" description="Manage changelogs for the app">
      <ChangelogsDataTable
        initialData={data?.data || []}
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
  )
}