'use client'

import { AppLayout } from '@/shared/ui/layouts/app-layout'
import type { CallHistoryResponse } from '@/entities/call-history/types/call-history.types'
import dynamic from 'next/dynamic'
import { fetchFromActionRoute } from '@/shared/lib/fetch-action-route'
import { useQuery } from '@ws/ui/internal-lib/react-query'
import { DataTableRefreshButton } from '@/shared/ui/data-table/refresh-button'

const CallHistoryDataTable = dynamic(
  () => import('@/shared/ui/data-table/call-history/data-table').then(mod => ({ default: mod.CallHistoryDataTable })),
  { ssr: false }
)

interface Props {
  initialData: CallHistoryResponse
}

export function CallHistoryClient({ initialData }: Props) {
  const { data, isPending, isFetching, refetch } = useQuery({
    queryKey: ['call-history'],
    queryFn: () =>
      fetchFromActionRoute<CallHistoryResponse>('/api/resources/call-history?limit=50&offset=0'),
    initialData,
    staleTime: Infinity,
  })

  return (
    <AppLayout sidebarItem="callHistory">
      <div data-testid="call-history-page">
        <CallHistoryDataTable
          initialData={data?.data || []}
          isLoading={isPending}
          leftColumnVisibilityContent={
            <DataTableRefreshButton
              onClick={() => void refetch()}
              isFetching={isFetching}
              testId="call-history-refresh-button"
            />
          }
        />
      </div>
    </AppLayout>
  )
}
