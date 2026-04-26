'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@ws/ui/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@ws/ui/components/ui/drawer';

import type { AdminAPI } from '@/features/admin/types/admin.types';
import { Button } from '@ws/ui/components/ui/button';
import { IconLoader2 } from '@tabler/icons-react';
import { Label } from '@ws/ui/components/ui/label';
import { UserSearchSelect } from './user-search-select';
import { fetchFromActionRoute } from '@/shared/lib/fetch-action-route';
import { useIsMobile } from '@ws/ui/hooks/use-mobile';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

interface EmbeddingCompareResponse {
  similarity_score: number;
  model_name: string;
  user_a_updated_at: string;
  user_b_updated_at: string;
}

interface CompareEmbeddingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: AdminAPI.User;
  users: AdminAPI.User[];
}

export function CompareEmbeddingsModal({
  open,
  onOpenChange,
  user,
  users,
}: CompareEmbeddingsModalProps) {
  const te = useTranslations('admin.embedding');
  const isMobile = useIsMobile();
  const [secondUser, setSecondUser] = useState<AdminAPI.User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<EmbeddingCompareResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const formatUserLabel = (u: AdminAPI.User): string => {
    const email = u.email ?? te('noEmail');
    const name = [u.first_name, u.last_name].filter(Boolean).join(' ') || te('unknownName');
    return `${name} (${email})`;
  };

  const handleOpenChange = (next: boolean) => {
    if (!next && isLoading) return;
    if (!next) {
      setSecondUser(null);
      setResult(null);
      setError(null);
    }
    onOpenChange(next);
  };

  const handleSubmit = async () => {
    if (!secondUser) return;
    setIsLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await fetchFromActionRoute<EmbeddingCompareResponse>('/api/admin/embeddings/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id_a: user.id, user_id_b: secondUser.id }),
      });
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : te('compareFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const body = (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>{te('userA')}</Label>
        <div className="rounded-md border bg-muted/50 px-3 py-2 text-sm">
          {formatUserLabel(user)}
        </div>
      </div>
      <div className="space-y-2">
        <Label>{te('userB')}</Label>
        <UserSearchSelect
          users={users}
          value={secondUser}
          onChange={setSecondUser}
          excludeUserId={user.id}
          placeholder={te('selectComparePlaceholder')}
          disabled={isLoading}
        />
      </div>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      {result && (
        <div className="space-y-2 rounded-md border p-3">
          <p className="text-sm font-medium">
            {te('similarityScore', { score: (result.similarity_score * 100).toFixed(2) })}
          </p>
          <p className="text-xs text-muted-foreground">
            {te('modelLabel')} {result.model_name}
          </p>
          <p className="text-xs text-muted-foreground">
            {te('userAUpdated')} {result.user_a_updated_at}
          </p>
          <p className="text-xs text-muted-foreground">
            {te('userBUpdated')} {result.user_b_updated_at}
          </p>
        </div>
      )}
      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={() => handleOpenChange(false)}
          disabled={isLoading}
        >
          {te('close')}
        </Button>
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={!secondUser || isLoading}
        >
          {isLoading && <IconLoader2 className="mr-2 size-4 animate-spin" />}
          {te('compare')}
        </Button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={handleOpenChange} dismissible={false}>
        <DrawerContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DrawerHeader>
            <DrawerTitle>{te('compareTitle')}</DrawerTitle>
            <DrawerDescription>
              {te('compareDescription')}
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-4">{body}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-md"
      >
        <DialogHeader>
          <DialogTitle>{te('compareTitle')}</DialogTitle>
          <DialogDescription>
            {te('compareDescription')}
          </DialogDescription>
        </DialogHeader>
        {body}
      </DialogContent>
    </Dialog>
  );
}
