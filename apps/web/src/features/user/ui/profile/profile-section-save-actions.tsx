'use client'

import { IconCheck, IconLoader2 } from '@tabler/icons-react'

import { Button } from '@ws/ui/components/ui/button'
import { useTranslations } from 'next-intl'

interface ProfileSectionSaveActionsProps {
  cancelName: string
  saveName: string
  isPending: boolean
  isDone: boolean
  onCancel: () => void
  onSave: () => void
  saveDisabled?: boolean
  className?: string
}

export function ProfileSectionSaveActions({
  cancelName,
  saveName,
  isPending,
  isDone,
  onCancel,
  onSave,
  saveDisabled = false,
  className,
}: ProfileSectionSaveActionsProps) {
  const tc = useTranslations('common')

  return (
    <div className={className ?? 'flex justify-end gap-2'}>
      {!isDone && (
        <Button
          name={cancelName}
          size="sm"
          variant="ghost"
          onClick={onCancel}
          disabled={isPending}
        >
          {tc('cancel')}
        </Button>
      )}
      {isDone ? (
        <p className="flex items-center gap-1.5 px-2 text-sm font-medium text-muted-foreground">
          <IconCheck className="size-4 text-primary" aria-hidden />
          {tc('done')}
        </p>
      ) : (
        <Button
          name={saveName}
          size="sm"
          onClick={onSave}
          disabled={isPending || saveDisabled}
        >
          {isPending && <IconLoader2 className="mr-2 size-4 animate-spin" />}
          {tc('save')}
        </Button>
      )}
    </div>
  )
}
