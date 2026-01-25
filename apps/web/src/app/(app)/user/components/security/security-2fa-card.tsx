'use client'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@repo/ui/components/ui/alert-dialog'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/ui/card'
import { IconLoader2, IconShieldCheck, IconShieldOff, IconShieldX } from '@tabler/icons-react'

import { Badge } from '@repo/ui/components/ui/badge'
import { Button } from '@repo/ui/components/ui/button'

interface Security2FaCardProps {
  totpEnabled: boolean
  disable2FaPending: boolean
  confirmDisable2Fa: boolean
  onConfirmDisable2FaChange: (open: boolean) => void
  onEnable2Fa: () => void
  onDisable2Fa: () => void
}

export function Security2FaCard({
  totpEnabled,
  disable2FaPending,
  confirmDisable2Fa,
  onConfirmDisable2FaChange,
  onEnable2Fa,
  onDisable2Fa,
}: Security2FaCardProps) {
  return (
    <Card>
      <CardHeader className="space-y-2">
        <div className="flex items-center gap-2">
          {totpEnabled ? <IconShieldCheck className="size-5" /> : <IconShieldX className="size-5" />}
          <CardTitle>{totpEnabled ? 'Two-Factor Authentication' : 'Two-Factor Authentication Disabled'}</CardTitle>
        </div>
        <CardDescription>
          {totpEnabled ? 'Add an extra layer of security using an authenticator app.' : 'Two-factor authentication is disabled. You can enable it at any time.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
            <span className="text-sm font-medium">Status</span>
            <Badge variant={totpEnabled ? 'default' : 'secondary'}>
              {totpEnabled ? 'Enabled' : 'Disabled'}
            </Badge>
          </div>
          {totpEnabled ? (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => onConfirmDisable2FaChange(true)}
              disabled={disable2FaPending}
            >
              {disable2FaPending ? (
                <IconLoader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <IconShieldOff className="mr-2 size-4" />
              )}
              Disable 2FA
            </Button>
          ) : (
            <Button className="w-full" onClick={onEnable2Fa}>
              <IconShieldCheck className="mr-2 size-4" />
              Enable 2FA
            </Button>
          )}
        </div>
      </CardContent>

      <AlertDialog open={confirmDisable2Fa} onOpenChange={onConfirmDisable2FaChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disable two-factor authentication?</AlertDialogTitle>
            <AlertDialogDescription>
              Your account will be less secure. You can enable 2FA again at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={onDisable2Fa}
              disabled={disable2FaPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {disable2FaPending ? <IconLoader2 className="mr-2 size-4 animate-spin" /> : null}
              Disable 2FA
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
