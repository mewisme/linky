'use client'

import { AppLayout } from "@/components/layouts/app-layout";
import { Button } from "@repo/ui/components/ui/button";
import { ChangelogsDataTable } from "@/components/data-table/changelogs/data-table";
import { IconPlus } from "@tabler/icons-react";
import { useRouter } from "next/navigation";

export default function ChangeLogsPage() {
  const router = useRouter();
  return (
    <AppLayout label="Changelogs" description="Manage changelogs for the app">
      <ChangelogsDataTable
        initialData={[]}
        className="w-full"
        callbacks={{}}
        leftColumnVisibilityContent={<div>Left</div>}
        rightColumnVisibilityContent={
          <Button onClick={() => router.push('/admin/changelogs/create')} className="bg-primary hover:opacity-90 shadow-md" size="sm">
            <IconPlus className="w-4 h-4 mr-2" /> New Changelog
          </Button>
        }
      />
    </AppLayout>
  )
}