'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ws/ui/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ws/ui/components/ui/select'
import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@ws/ui/internal-lib/react-query'
import { useRouter } from '@/i18n/navigation'

import type { AdminAPI } from '@/features/admin/types/admin.types'
import { AppLayout } from '@/shared/ui/layouts/app-layout'
import { Badge } from '@ws/ui/components/ui/badge'
import { Button } from '@ws/ui/components/ui/button'
import { Label } from '@ws/ui/components/ui/label'
import { Separator } from '@ws/ui/components/ui/separator'
import { Textarea } from '@ws/ui/components/ui/textarea'
import { formatDuration } from '@/entities/call-history/utils/call-history'
import { toast } from '@ws/ui/components/ui/sonner'
import { useLocale, useTranslations } from 'next-intl'
import { generateAdminReportAiSummary, updateAdminReport } from '@/features/admin/api/reports'
import { useSoundWithSettings } from '@/shared/hooks/audio/use-sound-with-settings'

const DATE_FMT: Intl.DateTimeFormatOptions = {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
}

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

function reportStatusLabel(
  status: AdminAPI.Reports.ReportStatus,
  t: (key: string) => string,
) {
  switch (status) {
    case 'pending': return t('reportDetail.statusPending')
    case 'reviewed': return t('reportDetail.statusReviewed')
    case 'resolved': return t('reportDetail.statusResolved')
    case 'dismissed': return t('reportDetail.statusDismissed')
    default: return status
  }
}

interface Props {
  report: AdminAPI.Reports.GetById.Response
}

export function AdminReportDetailClient({ report }: Props) {
  const t = useTranslations('admin')
  const tc = useTranslations('common')
  const locale = useLocale()
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
      toast.success(t('reportUpdated'))
    },
    onError: (error: Error) => {
      toast.error(error.message || t('reportUpdateFailed'))
    }
  })

  const generateAiMutation = useMutation({
    mutationFn: () => generateAdminReportAiSummary(report.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-report', report.id] })
      await queryClient.invalidateQueries({ queryKey: ['admin-reports'] })
      toast.success(t('aiSummaryStarted'))
      router.refresh()
    },
    onError: (error: Error) => {
      toast.error(error.message || t('aiSummaryFailed'))
    }
  })

  const handleSave = () => {
    updateMutation.mutate({ status, admin_notes: adminNotes || null })
  }

  const context = report.context
  const ai = report.ai_summary

  const shouldPollAi = useMemo(() => {
    return ai?.status === 'pending'
  }, [ai?.status])

  useEffect(() => {
    if (!shouldPollAi) return

    let active = true
    let attempts = 0
    const maxAttempts = 20
    const intervalMs = 1500

    const tick = () => {
      if (!active) return
      attempts += 1
      router.refresh()
      if (attempts >= maxAttempts) return
      setTimeout(tick, intervalMs)
    }

    const pollTimer = setTimeout(tick, intervalMs)
    return () => {
      active = false
      clearTimeout(pollTimer)
    }
  }, [router, shouldPollAi])

  const fmtDate = (iso: string) => new Date(iso).toLocaleString(locale, DATE_FMT)

  return (
    <AppLayout label={t('reportDetailTitle')} description={t('reportDetailDescription')} backButton className="space-y-4">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>{t('reportDetail.aiSummaryTitle')}</CardTitle>
                <CardDescription>{t('reportDetail.aiSummaryDescription')}</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => generateAiMutation.mutate()}
                disabled={generateAiMutation.isPending}
              >
                {generateAiMutation.isPending ? t('reportDetail.starting') : t('reportDetail.regenerate')}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {!ai && (
              <div className="text-sm text-muted-foreground">
                {t('reportDetail.noAiSummary')}
              </div>
            )}
            {ai && ai.status !== 'ready' && (
              <div className="text-sm text-muted-foreground">
                {t('reportDetail.statusLabel')} <span className="font-mono">{ai.status}</span>
                {ai.status === 'failed' && ai.error_message ? (
                  <div className="mt-2 text-destructive">{ai.error_message}</div>
                ) : null}
              </div>
            )}
            {ai && ai.status === 'ready' && (
              <div className="space-y-3">
                <div>
                  <Label className="text-muted-foreground">{t('reportDetail.severity')}</Label>
                  <div className="mt-1 text-sm bg-muted p-2 rounded-md">{ai.severity ?? t('reportDetail.unknown')}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">{t('reportDetail.summary')}</Label>
                  <div className="mt-2 p-3 bg-muted rounded-md text-sm">{ai.summary}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">{t('reportDetail.suggestedAction')}</Label>
                  <div className="mt-2 p-3 bg-muted rounded-md text-sm">{ai.suggested_action}</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{t('reportDetail.reportInfoTitle')}</CardTitle>
                <CardDescription>{t('reportDetail.reportIdLabel')} <span className="font-mono text-xs">{report.id}</span></CardDescription>
              </div>
              <Badge variant={getStatusBadgeVariant(report.status)} className={getStatusColor(report.status)}>
                {reportStatusLabel(report.status, t as unknown as (key: string) => string)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">{t('reportDetail.reporterUserId')}</Label>
                <div className="font-mono text-sm mt-1">{report.reporter_user_id}</div>
              </div>
              <div>
                <Label className="text-muted-foreground">{t('reportDetail.reportedUserId')}</Label>
                <div className="font-mono text-sm mt-1">{report.reported_user_id}</div>
              </div>
              <div>
                <Label className="text-muted-foreground">{t('reportDetail.createdAt')}</Label>
                <div className="text-sm mt-1">
                  {fmtDate(report.created_at)}
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">{t('reportDetail.updatedAt')}</Label>
                <div className="text-sm mt-1">
                  {fmtDate(report.updated_at)}
                </div>
              </div>
              {report.reviewed_by && (
                <div>
                  <Label className="text-muted-foreground">{t('reportDetail.reviewedBy')}</Label>
                  <div className="font-mono text-sm mt-1">{report.reviewed_by}</div>
                </div>
              )}
              {report.reviewed_at && (
                <div>
                  <Label className="text-muted-foreground">{t('reportDetail.reviewedAt')}</Label>
                  <div className="text-sm mt-1">
                    {fmtDate(report.reviewed_at)}
                  </div>
                </div>
              )}
            </div>
            <Separator />
            <div>
              <Label className="text-muted-foreground">{t('reportDetail.reason')}</Label>
              <div className="mt-2 p-3 bg-muted rounded-md text-sm">{report.reason}</div>
            </div>
          </CardContent>
        </Card>

        {context && (
          <Card>
            <CardHeader>
              <CardTitle>{t('reportDetail.contextSnapshotTitle')}</CardTitle>
              <CardDescription>{t('reportDetail.contextSnapshotDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {context.call_id && (
                  <div>
                    <Label className="text-muted-foreground">{t('reportDetail.callId')}</Label>
                    <div className="font-mono text-sm mt-1">{context.call_id}</div>
                  </div>
                )}
                {context.room_id && (
                  <div>
                    <Label className="text-muted-foreground">{t('reportDetail.roomId')}</Label>
                    <div className="font-mono text-sm mt-1">{context.room_id}</div>
                  </div>
                )}
                {context.duration_seconds !== null && (
                  <div>
                    <Label className="text-muted-foreground">{t('reportDetail.duration')}</Label>
                    <div className="text-sm mt-1">{formatDuration(context.duration_seconds)}</div>
                  </div>
                )}
                {context.ended_by && (
                  <div>
                    <Label className="text-muted-foreground">{t('reportDetail.endedBy')}</Label>
                    <div className="text-sm mt-1">{context.ended_by}</div>
                  </div>
                )}
                {context.reporter_role && (
                  <div>
                    <Label className="text-muted-foreground">{t('reportDetail.reporterRole')}</Label>
                    <div className="text-sm mt-1">{context.reporter_role}</div>
                  </div>
                )}
                {context.reported_role && (
                  <div>
                    <Label className="text-muted-foreground">{t('reportDetail.reportedRole')}</Label>
                    <div className="text-sm mt-1">{context.reported_role}</div>
                  </div>
                )}
                {context.call_started_at && (
                  <div>
                    <Label className="text-muted-foreground">{t('reportDetail.callStartedAt')}</Label>
                    <div className="text-sm mt-1">
                      {fmtDate(context.call_started_at)}
                    </div>
                  </div>
                )}
                {context.call_ended_at && (
                  <div>
                    <Label className="text-muted-foreground">{t('reportDetail.callEndedAt')}</Label>
                    <div className="text-sm mt-1">
                      {fmtDate(context.call_ended_at)}
                    </div>
                  </div>
                )}
              </div>
              {context.behavior_flags != null && (
                <>
                  <Separator />
                  <div>
                    <Label className="text-muted-foreground">{t('reportDetail.behaviorFlags')}</Label>
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
            <CardTitle>{t('reportDetail.adminActionsTitle')}</CardTitle>
            <CardDescription>{t('reportDetail.adminActionsDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="status">{t('reportDetail.statusField')}</Label>
              <Select value={status} onValueChange={(value) => setStatus(value as AdminAPI.Reports.ReportStatus)}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">{t('reportDetail.statusPending')}</SelectItem>
                  <SelectItem value="reviewed">{t('reportDetail.statusReviewed')}</SelectItem>
                  <SelectItem value="resolved">{t('reportDetail.statusResolved')}</SelectItem>
                  <SelectItem value="dismissed">{t('reportDetail.statusDismissed')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-notes">{t('reportDetail.adminNotes')}</Label>
              <Textarea
                id="admin-notes"
                placeholder={t('reportDetail.adminNotesPlaceholder')}
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={6}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => router.back()}>
                {tc('cancel')}
              </Button>
              <Button onClick={handleSave} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? t('reportDetail.saving') : t('reportDetail.saveChanges')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
