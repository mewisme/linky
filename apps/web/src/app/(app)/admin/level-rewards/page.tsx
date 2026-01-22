"use client";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@repo/ui/components/ui/dialog";
import { IconPlus, IconRefresh } from "@tabler/icons-react";
import React, { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { AdminAPI } from "@/types/admin.types";
import { AppLayout } from "@/components/layouts/app-layout";
import { Button } from "@repo/ui/components/ui/button";
import { Input } from "@repo/ui/components/ui/input";
import { LevelRewardsDataTable } from '@/components/data-table/level-rewards/data-table';
import { Label } from "@repo/ui/components/ui/label";
import { Loader2 } from "lucide-react";
import { Textarea } from "@repo/ui/components/ui/textarea";
import { toast } from "@repo/ui/components/ui/sonner";
import { useSoundWithSettings } from '@/hooks/audio/use-sound-with-settings';
import { useUserContext } from "@/components/providers/user/user-provider";

export default function LevelRewardsPage() {
  const { state } = useUserContext();
  const { play: playSound } = useSoundWithSettings();
  const [token, setToken] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReward, setEditingReward] = useState<AdminAPI.LevelRewards.LevelReward | null>(null);
  const [formData, setFormData] = useState<Partial<AdminAPI.LevelRewards.Create.Body>>({
    level_required: 1,
    reward_type: "",
    reward_payload: {},
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
    queryKey: ["level-rewards"],
    queryFn: async () => {
      const res = await fetch(`/api/admin/level-rewards`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to load data");
      return res.json() as Promise<AdminAPI.LevelRewards.Get.Response>;
    },
    enabled: !!token,
  });

  const upsertMutation = useMutation({
    mutationFn: async (payload: Partial<AdminAPI.LevelRewards.Create.Body> & { id?: string }) => {
      const rewardId = payload.id || editingReward?.id;
      const isUpdate = !!rewardId;

      const requestPayload = { ...payload };
      if ('id' in requestPayload) {
        delete requestPayload.id;
      }

      try {
        requestPayload.reward_payload = JSON.parse(payloadText);
      } catch {
        throw new Error("Invalid JSON in reward payload");
      }

      const url = isUpdate ? `/api/admin/level-rewards/${rewardId}` : `/api/admin/level-rewards`;
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
        queryKey: ["level-rewards"],
        refetchType: 'active'
      });
      await refetch();

      const isUpdate = !!variables.id || !!editingReward?.id;
      playSound('success');
      toast.success(isUpdate ? "Updated successfully!" : "Created successfully!");

      if (isModalOpen) {
        setIsModalOpen(false);
        setEditingReward(null);
        setFormData({ level_required: 1, reward_type: "", reward_payload: {} });
        setPayloadText("{}");
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "An error occurred");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/level-rewards/${id}`, {
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
        queryKey: ["level-rewards"],
        refetchType: 'active'
      });
      await refetch();
      toast.success("Reward deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "An error occurred during deletion");
    },
  });

  const handleOpenCreate = () => {
    setEditingReward(null);
    setFormData({ level_required: 1, reward_type: "", reward_payload: {} });
    setPayloadText("{}");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (reward: AdminAPI.LevelRewards.LevelReward) => {
    setEditingReward(reward);
    setFormData({
      level_required: reward.level_required,
      reward_type: reward.reward_type,
      reward_payload: reward.reward_payload,
    });
    setPayloadText(JSON.stringify(reward.reward_payload, null, 2));
    setIsModalOpen(true);
  };

  const onFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    upsertMutation.mutate(formData);
  };

  const rowCallbacks = {
    onEdit: (reward: AdminAPI.LevelRewards.LevelReward) => handleOpenEdit(reward),
    onDelete: (reward: AdminAPI.LevelRewards.LevelReward) => deleteMutation.mutate(reward.id),
  }

  return (
    <AppLayout label="Level Rewards" description="Manage rewards granted at level milestones">
      <LevelRewardsDataTable
        initialData={data?.data || []}
        callbacks={rowCallbacks}
        leftColumnVisibilityContent={
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <IconRefresh className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
        }
        rightColumnVisibilityContent={
          <Button onClick={handleOpenCreate} className="bg-primary hover:opacity-90 shadow-md" size="sm">
            <IconPlus className="w-4 h-4 mr-2" /> Add New Reward
          </Button>
        }
      />
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={onFormSubmit}>
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">
                {editingReward ? "Update Level Reward" : "Create Level Reward"}
              </DialogTitle>
              <DialogDescription>
                Define rewards that are automatically granted when users reach specific levels.
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
                    placeholder="e.g. 5"
                    value={formData.level_required || ""}
                    required
                    onChange={e => setFormData({ ...formData, level_required: parseInt(e.target.value) || 1 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reward_type">Reward Type <span className="text-destructive">*</span></Label>
                  <Input
                    id="reward_type"
                    placeholder="e.g. avatar_frame, badge, currency"
                    value={formData.reward_type || ""}
                    required
                    onChange={e => setFormData({ ...formData, reward_type: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reward_payload">Reward Payload (JSON) <span className="text-destructive">*</span></Label>
                <Textarea
                  id="reward_payload"
                  rows={6}
                  placeholder='{"name": "Gold Frame", "value": 100}'
                  value={payloadText}
                  onChange={e => setPayloadText(e.target.value)}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  JSON object containing reward-specific data. Must be valid JSON.
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
