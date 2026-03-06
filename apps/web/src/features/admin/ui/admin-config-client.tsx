'use client';

import { IconPlus, IconRefresh } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  getAdminConfig,
  setAdminConfig,
  unsetAdminConfig,
} from '@/features/admin/api/admin-config';
import { useMutation, useQuery, useQueryClient } from '@ws/ui/internal-lib/react-query';
import type { AdminAPI } from '@/features/admin/types/admin.types';
import { AppLayout } from '@/shared/ui/layouts/app-layout';
import { Button } from '@ws/ui/components/ui/button';
import { Input } from '@ws/ui/components/ui/input';
import { Label } from '@ws/ui/components/ui/label';
import { Textarea } from '@ws/ui/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@ws/ui/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@ws/ui/components/ui/alert-dialog';
import { Loader2 } from '@ws/ui/internal-lib/icons';
import { toast } from '@ws/ui/components/ui/sonner';
import { useSoundWithSettings } from '@/shared/hooks/audio/use-sound-with-settings';
import { useUserStore } from '@/entities/user/model/user-store';
import { isSuperAdmin } from '@/shared/utils/roles';

const AdminConfigDataTable = dynamic(
  () =>
    import('@/shared/ui/data-table/admin-config/data-table').then((mod) => ({
      default: mod.AdminConfigDataTable,
    })),
  { ssr: false },
);

interface AdminConfigClientProps {
  initialData: AdminAPI.Config.Get.Response | null;
}

function parseValue(raw: string): AdminAPI.Config.Set.Body['value'] {
  const t = raw.trim();
  if (t === '') return null;
  if (t === 'true') return true;
  if (t === 'false') return false;
  const n = Number(t);
  if (!Number.isNaN(n) && t !== '') return n;
  try {
    return JSON.parse(t) as AdminAPI.Config.Set.Body['value'];
  } catch {
    return t;
  }
}

export function AdminConfigClient({ initialData }: AdminConfigClientProps) {
  const router = useRouter();
  const { user: userStore } = useUserStore();
  const { play: playSound } = useSoundWithSettings();
  const queryClient = useQueryClient();

  const [setDialogOpen, setSetDialogOpen] = useState(false);
  const [unsetKey, setUnsetKey] = useState<string | null>(null);
  const [formKey, setFormKey] = useState('');
  const [formValue, setFormValue] = useState('');

  useEffect(() => {
    if (userStore && !isSuperAdmin(userStore.role)) {
      router.replace('/admin');
    }
  }, [userStore, router]);

  const { data, isFetching, refetch } = useQuery({
    queryKey: ['admin-config'],
    queryFn: () => getAdminConfig(),
    initialData: initialData ?? undefined,
    staleTime: 30_000,
    enabled: isSuperAdmin(userStore?.role ?? null),
  });

  const setMutation = useMutation({
    mutationFn: (body: AdminAPI.Config.Set.Body) => setAdminConfig(body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-config'], refetchType: 'active' });
      await refetch();
      playSound('success');
      toast.success('Config set successfully');
      setSetDialogOpen(false);
      setFormKey('');
      setFormValue('');
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Failed to set config');
    },
  });

  const unsetMutation = useMutation({
    mutationFn: (key: string) => unsetAdminConfig(key),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-config'], refetchType: 'active' });
      await refetch();
      playSound('success');
      toast.success('Config unset successfully');
      setUnsetKey(null);
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Failed to unset config');
    },
  });

  const handleSet = () => {
    if (!formKey.trim()) {
      toast.error('Key is required');
      return;
    }
    setMutation.mutate({ key: formKey.trim(), value: parseValue(formValue) });
  };

  const handleUnset = (key: string) => setUnsetKey(key);

  if (userStore && !isSuperAdmin(userStore.role)) {
    return null;
  }

  const rows = data?.data ?? [];

  return (
    <AppLayout
      label="Admin Config"
      description="Key-value config (superadmin only). Used by backend e.g. clerk_auto_remove_email_prefix."
    >
      <div className="space-y-4">
        <AdminConfigDataTable
          initialData={rows}
          callbacks={{ onUnset: handleUnset }}
          leftColumnVisibilityContent={
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <IconRefresh className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            </Button>
          }
          rightColumnVisibilityContent={
            <Button size="sm" onClick={() => setSetDialogOpen(true)} className="bg-primary hover:opacity-90 shadow-md">
              <IconPlus className="h-4 w-4 mr-2" />
              Set
            </Button>
          }
        />
      </div>

      <Dialog open={setDialogOpen} onOpenChange={setSetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set config</DialogTitle>
            <DialogDescription>
              Key (e.g. clerk_auto_remove_email_prefix). Value: string, number, boolean, or JSON.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="config-key">Key</Label>
              <Input
                id="config-key"
                value={formKey}
                onChange={(e) => setFormKey(e.target.value)}
                placeholder="e.g. clerk_auto_remove_email_prefix"
                className="font-mono"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="config-value">Value</Label>
              <Textarea
                id="config-value"
                value={formValue}
                onChange={(e) => setFormValue(e.target.value)}
                placeholder='e.g. "automationtest" or true or {"nested": true}'
                rows={3}
                className="font-mono"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSetDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSet}
              disabled={setMutation.isPending || !formKey.trim()}
            >
              {setMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Set
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!unsetKey} onOpenChange={(open) => !open && setUnsetKey(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unset config</AlertDialogTitle>
            <AlertDialogDescription>
              Remove key &quot;{unsetKey}&quot;? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => unsetKey && unsetMutation.mutate(unsetKey)}
              disabled={unsetMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {unsetMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Unset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
