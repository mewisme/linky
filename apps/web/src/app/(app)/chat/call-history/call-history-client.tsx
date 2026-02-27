'use client'

import dynamic from 'next/dynamic'
import { useQuery } from '@tanstack/react-query'

import { AppLayout } from '@/components/layouts/app-layout'
import { Button } from '@ws/ui/components/ui/button'
import type { CallHistoryResponse } from '@/types/call-history.types'
import { IconRefresh } from '@tabler/icons-react'
import { getCallHistory } from '@/lib/actions/resources/call-history'

const CallHistoryDataTable = dynamic(
  () => import('@/components/data-table/call-history/data-table').then(mod => ({ default: mod.CallHistoryDataTable })),
  { ssr: false }
)

interface Props {
  initialData: CallHistoryResponse
}

export function CallHistoryClient({ initialData }: Props) {
  const { data, isFetching, refetch } = useQuery({
    queryKey: ['call-history'],
    queryFn: () => getCallHistory(),
    initialData,
    staleTime: Infinity,
  })

  return (
    <AppLayout label="Call History" description="View your call history">
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
