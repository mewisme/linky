'use client'

import { AppLayout } from '@/shared/ui/layouts/app-layout'
import { Button } from '@ws/ui/components/ui/button'
import type { CallHistoryResponse } from '@/entities/call-history/types/call-history.types'
import { IconRefresh } from '@tabler/icons-react'
import dynamic from 'next/dynamic'
import { fetchFromActionRoute } from '@/shared/lib/fetch-action-route'
import { useQuery } from '@ws/ui/internal-lib/react-query'

const CallHistoryDataTable = dynamic(
  () => import('@/shared/ui/data-table/call-history/data-table').then(mod => ({ default: mod.CallHistoryDataTable })),
  { ssr: false }
)

interface Props {
  initialData: CallHistoryResponse
}

export function CallHistoryClient({ initialData }: Props) {
  const { data, isFetching, refetch } = useQuery({
    queryKey: ['call-history'],
    queryFn: () =>
      fetchFromActionRoute<CallHistoryResponse>('/api/resources/call-history?limit=50&offset=0'),
    initialData,
    staleTime: Infinity,
  })

  return (
    <AppLayout sidebarItem="callHistory">
      <CallHistoryDataTable
        initialData={data?.data || []}
        leftColumnVisibilityContent={
          <Button variant="outline" size="sm" onClick={() => void refetch()} disabled={isFetching}>
            <IconRefresh className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
        }
      />
    </AppLayout>
  )
}
