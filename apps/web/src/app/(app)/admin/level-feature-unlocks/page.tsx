"use client";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@repo/ui/components/ui/dialog";
import { IconPlus, IconRefresh } from "@tabler/icons-react";
import React, { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { AdminAPI } from "@/types/admin.types";
import { AppLayout } from "@/components/layouts/app-layout";
import { Button } from "@repo/ui/components/ui/button";
import { Input } from "@repo/ui/components/ui/input";
import { LevelFeatureUnlocksDataTable } from '@/components/data-table/level-feature-unlocks/data-table';
import { Label } from "@repo/ui/components/ui/label";
import { Loader2 } from "lucide-react";
import { Textarea } from "@repo/ui/components/ui/textarea";
import { toast } from "@repo/ui/components/ui/sonner";
import { useSoundWithSettings } from '@/hooks/audio/use-sound-with-settings';
import { useUserContext } from "@/components/providers/user/user-provider";

export default function LevelFeatureUnlocksPage() {
  const { state } = useUserContext();
  const { play: playSound } = useSoundWithSettings();
  const [token, setToken] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUnlock, setEditingUnlock] = useState<AdminAPI.LevelFeatureUnlocks.LevelFeatureUnlock | null>(null);
  const [formData, setFormData] = useState<Partial<AdminAPI.LevelFeatureUnlocks.Create.Body>>({
    level_required: 1,
    feature_key: "",
    feature_payload: {},
  });
  const [payloadText, setPayloadText] = useState("{}");

  useEffect(() => {
    const fetchToken = async () => {
      const token = await state.getToken();
      setToken(token);
    }
    fetchToken();
  }, [state])

  const { data, isFetching, refetch } = useQuery({
    queryKey: ["level-feature-unlocks"],
    queryFn: async () => {
      const res = await fetch(`/api/admin/level-feature-unlocks`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to load data");
      return res.json() as Promise<AdminAPI.LevelFeatureUnlocks.Get.Response>;
    },
    enabled: !!token,
  });

  const upsertMutation = useMutation({
    mutationFn: async (payload: Partial<AdminAPI.LevelFeatureUnlocks.Create.Body> & { id?: string }) => {
      const unlockId = payload.id || editingUnlock?.id;
      const isUpdate = !!unlockId;

      const requestPayload = { ...payload };
      if ('id' in requestPayload) {
        delete requestPayload.id;
      }

      try {
        requestPayload.feature_payload = JSON.parse(payloadText);
      } catch {
        throw new Error("Invalid JSON in feature payload");
      }

      const url = isUpdate ? `/api/admin/level-feature-unlocks/${unlockId}` : `/api/admin/level-feature-unlocks`;
      const method = isUpdate ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(requestPayload)
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Operation failed" }));
        throw new Error(err.message || err.error || "Operation failed");
      }

      return res.json();
    },
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({
        queryKey: ["level-feature-unlocks"],
        refetchType: 'active'
      });
      await refetch();

      const isUpdate = !!variables.id || !!editingUnlock?.id;
      playSound('success');
      toast.success(isUpdate ? "Updated successfully!" : "Created successfully!");

      if (isModalOpen) {
        setIsModalOpen(false);
        setEditingUnlock(null);
        setFormData({ level_required: 1, feature_key: "", feature_payload: {} });
        setPayloadText("{}");
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "An error occurred");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/level-feature-unlocks/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Delete failed" }));
        throw new Error(err.message || err.error || "Delete failed");
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["level-feature-unlocks"],
        refetchType: 'active'
      });
      await refetch();
      toast.success("Feature unlock deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "An error occurred during deletion");
    },
  });

  const handleOpenCreate = () => {
    setEditingUnlock(null);
    setFormData({ level_required: 1, feature_key: "", feature_payload: {} });
    setPayloadText("{}");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (unlock: AdminAPI.LevelFeatureUnlocks.LevelFeatureUnlock) => {
    setEditingUnlock(unlock);
    setFormData({
      level_required: unlock.level_required,
      feature_key: unlock.feature_key,
      feature_payload: unlock.feature_payload,
    });
    setPayloadText(JSON.stringify(unlock.feature_payload, null, 2));
    setIsModalOpen(true);
  };

  const onFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    upsertMutation.mutate(formData);
  };

  const rowCallbacks = {
    onEdit: (unlock: AdminAPI.LevelFeatureUnlocks.LevelFeatureUnlock) => handleOpenEdit(unlock),
    onDelete: (unlock: AdminAPI.LevelFeatureUnlocks.LevelFeatureUnlock) => deleteMutation.mutate(unlock.id),
  }

  return (
    <AppLayout label="Level Feature Unlocks" description="Manage features unlocked at level thresholds">
      <LevelFeatureUnlocksDataTable
        initialData={data?.data || []}
        callbacks={rowCallbacks}
        leftColumnVisibilityContent={
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <IconRefresh className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
        }
        rightColumnVisibilityContent={
          <Button onClick={handleOpenCreate} className="bg-primary hover:opacity-90 shadow-md" size="sm">
            <IconPlus className="w-4 h-4 mr-2" /> Add New Unlock
          </Button>
        }
      />
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={onFormSubmit}>
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">
                {editingUnlock ? "Update Feature Unlock" : "Create Feature Unlock"}
              </DialogTitle>
              <DialogDescription>
                Define features that unlock when users reach specific levels.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="level_required">Level Required <span className="text-destructive">*</span></Label>
                  <Input
                    id="level_required"
                    type="number"
                    min="1"
                    placeholder="e.g. 10"
                    value={formData.level_required || ""}
                    required
                    onChange={e => setFormData({ ...formData, level_required: parseInt(e.target.value) || 1 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="feature_key">Feature Key <span className="text-destructive">*</span></Label>
                  <Input
                    id="feature_key"
                    placeholder="e.g. reaction_types, favorite_limit"
                    value={formData.feature_key || ""}
                    required
                    onChange={e => setFormData({ ...formData, feature_key: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="feature_payload">Feature Payload (JSON) <span className="text-destructive">*</span></Label>
                <Textarea
                  id="feature_payload"
                  rows={6}
                  placeholder='{"limit": 20, "types": ["like", "love"]}'
                  value={payloadText}
                  onChange={e => setPayloadText(e.target.value)}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  JSON object containing feature-specific configuration. Must be valid JSON.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={upsertMutation.isPending} className="min-w-[100px]">
                {upsertMutation.isPending ? <Loader2 className="animate-spin h-4 w-4" /> : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
}
