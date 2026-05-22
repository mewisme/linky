'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@ws/ui/components/ui/dialog';
import { Button } from '@ws/ui/components/ui/button';
import { Input } from '@ws/ui/components/ui/input';
import { Label } from '@ws/ui/components/ui/label';
import { Checkbox } from '@ws/ui/components/ui/checkbox';
import { useTranslations } from 'next-intl';

import type { AdminAPI } from '@/features/admin/types/admin.types';
import type { SetClerkPasswordPayload } from '@/features/admin/hooks/use-users-mutations';

interface SetClerkPasswordDialogProps {
  user: AdminAPI.User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: SetClerkPasswordPayload) => void;
  isPending: boolean;
}

export function SetClerkPasswordDialog({
  user,
  open,
  onOpenChange,
  onSubmit,
  isPending,
}: SetClerkPasswordDialogProps) {
  const t = useTranslations('admin');
  const tc = useTranslations('common');
  const [password, setPassword] = useState('');
  const [skipPasswordChecks, setSkipPasswordChecks] = useState(false);
  const [signOutOfOtherSessions, setSignOutOfOtherSessions] = useState(true);
  const [setPasswordCompromised, setSetPasswordCompromised] = useState(false);

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setPassword('');
      setSkipPasswordChecks(false);
      setSignOutOfOtherSessions(true);
      setSetPasswordCompromised(false);
    }
    onOpenChange(next);
  };

  const handleSubmit = () => {
    if (!user || password.length < 8) return;
    onSubmit({
      clerkUserId: user.clerk_user_id,
      password,
      skipPasswordChecks,
      signOutOfOtherSessions,
      setPasswordCompromised,
    });
  };

  const displayName =
    [user?.first_name, user?.last_name].filter(Boolean).join(' ') ||
    user?.email ||
    user?.clerk_user_id ||
    '';

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('setClerkPasswordTitle')}</DialogTitle>
          <DialogDescription>
            {t('setClerkPasswordDescription', { name: displayName })}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="admin-clerk-password">{t('setClerkPasswordLabel')}</Label>
            <Input
              id="admin-clerk-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="admin-skip-password-checks"
              checked={skipPasswordChecks}
              onCheckedChange={(v) => setSkipPasswordChecks(v === true)}
            />
            <Label htmlFor="admin-skip-password-checks" className="font-normal">
              {t('setClerkPasswordSkipChecks')}
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="admin-sign-out-sessions"
              checked={signOutOfOtherSessions}
              onCheckedChange={(v) => setSignOutOfOtherSessions(v === true)}
            />
            <Label htmlFor="admin-sign-out-sessions" className="font-normal">
              {t('setClerkPasswordSignOutSessions')}
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="admin-set-password-compromised"
              checked={setPasswordCompromised}
              onCheckedChange={(v) => setSetPasswordCompromised(v === true)}
            />
            <Label htmlFor="admin-set-password-compromised" className="font-normal">
              {t('setClerkPasswordMarkCompromised')}
            </Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isPending}>
            {tc('cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending || password.length < 8 || !user}
          >
            {isPending ? t('setClerkPasswordSaving') : t('setClerkPasswordConfirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
