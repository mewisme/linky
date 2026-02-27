'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ws/ui/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ws/ui/components/ui/select'
import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'

import type { AdminAPI } from '@/types/admin.types'
import { AppLayout } from '@/components/layouts/app-layout'
import { Badge } from '@ws/ui/components/ui/badge'
import { Button } from '@ws/ui/components/ui/button'
import { Label } from '@ws/ui/components/ui/label'
import { Separator } from '@ws/ui/components/ui/separator'
import { Textarea } from '@ws/ui/components/ui/textarea'
import { formatDuration } from '@/utils/call-history'
import { toast } from '@ws/ui/components/ui/sonner'
import { updateAdminReport } from '@/lib/actions/admin/reports'
import { useSoundWithSettings } from '@/hooks/audio/use-sound-with-settings'

const getStatusBadgeVariant = (status: AdminAPI.Reports.ReportStatus) => {
  switch (status) {
    case 'pending': return 'secondary'
    case 'reviewed': return 'default'
    case 'resolved': return 'outline'
    case 'dismissed': return 'outline'
    default: return 'secondary'
  }
}

const getStatusColor = (status: AdminAPI.Reports.ReportStatus) => {
  switch (status) {
    case 'pending': return 'text-amber-600 dark:text-amber-400'
    case 'reviewed': return 'text-blue-600 dark:text-blue-400'
    case 'resolved': return 'text-green-600 dark:text-green-400'
    case 'dismissed': return 'text-muted-foreground'
    default: return 'text-muted-foreground'
  }
}

interface Props {
  report: AdminAPI.Reports.GetById.Response
}

export function AdminReportDetailClient({ report }: Props) {
  const { play: playSound } = useSoundWithSettings()
  const router = useRouter()
  const queryClient = useQueryClient()

  const [status, setStatus] = useState<AdminAPI.Reports.ReportStatus>(report.status)
  const [adminNotes, setAdminNotes] = useState<string>(report.admin_notes || '')

  useEffect(() => {
    setStatus(report.status)
    setAdminNotes(report.admin_notes || '')
  }, [report])

  const updateMutation = useMutation({
    mutationFn: (body: AdminAPI.Reports.Update.Body) => updateAdminReport(report.id, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-report', report.id] })
      await queryClient.invalidateQueries({ queryKey: ['admin-reports'] })
      playSound('success')
      toast.success('Report updated successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'An error occurred during update')
    }
  })

  const handleSave = () => {
    updateMutation.mutate({ status, admin_notes: adminNotes || null })
  }

  const context = report.context

  return (
    <AppLayout label="Report Details" description="View and manage report" backButton className="space-y-4">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Report Information</CardTitle>
                <CardDescription>Report ID: <span className="font-mono text-xs">{report.id}</span></CardDescription>
              </div>
              <Badge variant={getStatusBadgeVariant(report.status)} className={getStatusColor(report.status)}>
                {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">Reporter User ID</Label>
                <div className="font-mono text-sm mt-1">{report.reporter_user_id}</div>
              </div>
              <div>
                <Label className="text-muted-foreground">Reported User ID</Label>
                <div className="font-mono text-sm mt-1">{report.reported_user_id}</div>
              </div>
              <div>
                <Label className="text-muted-foreground">Created At</Label>
                <div className="text-sm mt-1">
                  {new Date(report.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Updated At</Label>
                <div className="text-sm mt-1">
                  {new Date(report.updated_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              {report.reviewed_by && (
                <div>
                  <Label className="text-muted-foreground">Reviewed By</Label>
                  <div className="font-mono text-sm mt-1">{report.reviewed_by}</div>
                </div>
              )}
              {report.reviewed_at && (
                <div>
                  <Label className="text-muted-foreground">Reviewed At</Label>
                  <div className="text-sm mt-1">
                    {new Date(report.reviewed_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              )}
            </div>
            <Separator />
            <div>
              <Label className="text-muted-foreground">Reason</Label>
              <div className="mt-2 p-3 bg-muted rounded-md text-sm">{report.reason}</div>
            </div>
          </CardContent>
        </Card>

        {context && (
          <Card>
            <CardHeader>
              <CardTitle>Context Snapshot</CardTitle>
              <CardDescription>Call and behavior context at the time of report</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {context.call_id && (
                  <div>
                    <Label className="text-muted-foreground">Call ID</Label>
                    <div className="font-mono text-sm mt-1">{context.call_id}</div>
                  </div>
                )}
                {context.room_id && (
                  <div>
                    <Label className="text-muted-foreground">Room ID</Label>
                    <div className="font-mono text-sm mt-1">{context.room_id}</div>
                  </div>
                )}
                {context.duration_seconds !== null && (
                  <div>
                    <Label className="text-muted-foreground">Duration</Label>
                    <div className="text-sm mt-1">{formatDuration(context.duration_seconds)}</div>
                  </div>
                )}
                {context.ended_by && (
                  <div>
                    <Label className="text-muted-foreground">Ended By</Label>
                    <div className="text-sm mt-1">{context.ended_by}</div>
                  </div>
                )}
                {context.reporter_role && (
                  <div>
                    <Label className="text-muted-foreground">Reporter Role</Label>
                    <div className="text-sm mt-1">{context.reporter_role}</div>
                  </div>
                )}
                {context.reported_role && (
                  <div>
                    <Label className="text-muted-foreground">Reported Role</Label>
                    <div className="text-sm mt-1">{context.reported_role}</div>
                  </div>
                )}
                {context.call_started_at && (
                  <div>
                    <Label className="text-muted-foreground">Call Started At</Label>
                    <div className="text-sm mt-1">
                      {new Date(context.call_started_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                )}
                {context.call_ended_at && (
                  <div>
                    <Label className="text-muted-foreground">Call Ended At</Label>
                    <div className="text-sm mt-1">
                      {new Date(context.call_ended_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                )}
              </div>
              {context.behavior_flags != null && (
                <>
                  <Separator />
                  <div>
                    <Label className="text-muted-foreground">Behavior Flags</Label>
                    <div className="mt-2 p-3 bg-muted rounded-md">
                      <pre className="text-xs overflow-auto">
                        {JSON.stringify(context.behavior_flags, null, 2)}
                      </pre>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Admin Actions</CardTitle>
            <CardDescription>Update report status and add admin notes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={(value) => setStatus(value as AdminAPI.Reports.ReportStatus)}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="reviewed">Reviewed</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="dismissed">Dismissed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-notes">Admin Notes</Label>
              <Textarea
                id="admin-notes"
                placeholder="Add admin notes..."
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={6}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
