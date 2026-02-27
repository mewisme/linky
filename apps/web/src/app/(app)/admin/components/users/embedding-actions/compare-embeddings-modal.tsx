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
import { Label } from '@ws/ui/components/ui/label';
import { UserSearchSelect } from './user-search-select';
import { compareEmbeddings } from '@/lib/actions/admin/embeddings';
import { useIsMobile } from '@ws/ui/hooks/use-mobile';
import { useState } from 'react';

interface CompareResult {
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

function formatUserLabel(user: AdminAPI.User): string {
  const email = user.email ?? 'no-email';
  const name = [user.first_name, user.last_name].filter(Boolean).join(' ') || 'Unknown';
  return `${name} (${email})`;
}

export function CompareEmbeddingsModal({
  open,
  onOpenChange,
  user,
  users,
}: CompareEmbeddingsModalProps) {
  const isMobile = useIsMobile();
  const [secondUser, setSecondUser] = useState<AdminAPI.User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<CompareResult | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      const data = await compareEmbeddings(user.id, secondUser.id);
      setResult(data as unknown as CompareResult);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to compare embeddings');
    } finally {
      setIsLoading(false);
    }
  };

  const body = (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>User A (from row)</Label>
        <div className="rounded-md border bg-muted/50 px-3 py-2 text-sm">
          {formatUserLabel(user)}
        </div>
      </div>
      <div className="space-y-2">
        <Label>User B</Label>
        <UserSearchSelect
          users={users}
          value={secondUser}
          onChange={setSecondUser}
          excludeUserId={user.id}
          placeholder="Select user to compare"
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
          <p className="text-sm font-medium">Similarity score: {(result.similarity_score * 100).toFixed(2)}%</p>
          <p className="text-xs text-muted-foreground">Model: {result.model_name}</p>
          <p className="text-xs text-muted-foreground">
            User A updated: {result.user_a_updated_at}
          </p>
          <p className="text-xs text-muted-foreground">
            User B updated: {result.user_b_updated_at}
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
          Close
        </Button>
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={!secondUser || isLoading}
        >
          {isLoading && <IconLoader2 className="mr-2 size-4 animate-spin" />}
          Compare
        </Button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={handleOpenChange} dismissible={false}>
        <DrawerContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DrawerHeader>
            <DrawerTitle>Compare embeddings</DrawerTitle>
            <DrawerDescription>
              Compare embedding similarity between two users.
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
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Compare embeddings</DialogTitle>
          <DialogDescription>
            Compare embedding similarity between two users.
          </DialogDescription>
        </DialogHeader>
        {body}
      </DialogContent>
    </Dialog>
  );
}
