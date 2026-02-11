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

import type { AdminAPI } from '@/types/admin.types';
import { Button } from '@ws/ui/components/ui/button';
import { IconLoader2 } from '@tabler/icons-react';
import { Input } from '@ws/ui/components/ui/input';
import { Label } from '@ws/ui/components/ui/label';
import { useIsMobile } from '@ws/ui/hooks/use-mobile';
import { useState } from 'react';
import { apiUrl } from '@/lib/api/fetch/api-url';
import { postData } from '@/lib/api/fetch/client-api';

interface SimilarResult {
  user_id: string;
  similarity_score: number;
}

interface FindSimilarResponse {
  base_user_id: string;
  results: SimilarResult[];
}

interface FindSimilarUsersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: AdminAPI.User;
  users: AdminAPI.User[];
  token: string | null;
}

function formatUserLabel(user: AdminAPI.User): string {
  const email = user.email ?? 'no-email';
  const name = [user.first_name, user.last_name].filter(Boolean).join(' ') || 'Unknown';
  return `${name} (${email})`;
}

export function FindSimilarUsersModal({
  open,
  onOpenChange,
  user,
  users,
  token,
}: FindSimilarUsersModalProps) {
  const isMobile = useIsMobile();
  const [limit, setLimit] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<FindSimilarResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleOpenChange = (next: boolean) => {
    if (!next && isLoading) return;
    if (!next) {
      setResult(null);
      setError(null);
    }
    onOpenChange(next);
  };

  const handleSubmit = async () => {
    if (!token) return;
    const parsed = limit.trim() === '' ? null : Number(limit);
    const effectiveLimit = parsed === null || isNaN(parsed) ? 10 : Math.min(100, Math.max(1, parsed));
    setIsLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await postData<FindSimilarResponse>(apiUrl.admin.embeddingsSimilar(), {
        token,
        body: {
          user_id: user.id,
          limit: effectiveLimit,
        },
      });
      setResult(data);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to find similar users');
    } finally {
      setIsLoading(false);
    }
  };

  const userMap = new Map(users.map((u) => [u.id, u]));

  const formSection = (
    <>
      <div className="space-y-2">
        <Label>Base user (from row)</Label>
        <div className="rounded-md border bg-muted/50 px-3 py-2 text-sm">
          {formatUserLabel(user)}
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="limit">Result limit (1–100)</Label>
        <Input
          id="limit"
          type="number"
          max={100}
          value={limit}
          onChange={(e) => setLimit(e.target.value)}
          placeholder="10"
          disabled={isLoading}
        />
      </div>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </>
  );

  const resultSection = result && (
    <div className="space-y-2">
      <p className="text-sm font-medium">Similar users (ranked)</p>
      <div className="max-h-[200px] overflow-y-auto rounded-md border">
        <div className="space-y-1 p-2">
          {result.results.map((r, i) => {
            const u = userMap.get(r.user_id);
            const label = u ? formatUserLabel(u) : r.user_id;
            return (
              <div
                key={r.user_id}
                className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-muted/50"
              >
                <span className="truncate">
                  {i + 1}. {label}
                </span>
                <span className="ml-2 shrink-0 text-muted-foreground">
                  {(r.similarity_score * 100).toFixed(1)}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const actions = (
    <div className="flex shrink-0 flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
      <Button
        type="button"
        variant="outline"
        onClick={() => handleOpenChange(false)}
        disabled={isLoading}
      >
        Close
      </Button>
      <Button
        type="button"
        onClick={handleSubmit}
        disabled={isLoading}
      >
        {isLoading && <IconLoader2 className="mr-2 size-4 animate-spin" />}
        Find similar
      </Button>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={handleOpenChange} dismissible={false}>
        <DrawerContent className="flex max-h-[90vh] flex-col sm:max-w-md">
          <DrawerHeader className="shrink-0">
            <DrawerTitle>Find similar users</DrawerTitle>
            <DrawerDescription>
              Find users with similar embeddings to this user.
            </DrawerDescription>
          </DrawerHeader>
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4">
            {formSection}
            {resultSection}
          </div>
          <div className="shrink-0 px-4 pb-4">{actions}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="flex max-h-[90vh] flex-col sm:max-w-md"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="shrink-0">
          <DialogTitle>Find similar users</DialogTitle>
          <DialogDescription>
            Find users with similar embeddings to this user.
          </DialogDescription>
        </DialogHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
          {formSection}
          {resultSection}
        </div>
        <div className="shrink-0">{actions}</div>
      </DialogContent>
    </Dialog>
  );
}
