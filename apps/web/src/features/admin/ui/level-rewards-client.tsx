"use client";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@ws/ui/components/ui/dialog";
import { IconPlus, IconRefresh } from "@tabler/icons-react";
import React, { useState } from "react";
import { fetchFromActionRoute } from '@/shared/lib/fetch-action-route';
import { useMutation, useQuery, useQueryClient } from "@ws/ui/internal-lib/react-query";

import { AdminAPI } from "@/features/admin/types/admin.types";
import { AppLayout } from "@/shared/ui/layouts/app-layout";
import { Button } from "@ws/ui/components/ui/button";
import { Input } from "@ws/ui/components/ui/input";
import { Label } from "@ws/ui/components/ui/label";
import { Link } from "@/i18n/navigation";
import { Loader2 } from "@ws/ui/internal-lib/icons";
import { Textarea } from "@ws/ui/components/ui/textarea";
import dynamic from 'next/dynamic'
import { toast } from "@ws/ui/components/ui/sonner";
import { useTranslations } from "next-intl";
import { useSoundWithSettings } from '@/shared/hooks/audio/use-sound-with-settings';

const LevelRewardsDataTable = dynamic(
  () => import('@/shared/ui/data-table/level-rewards/data-table').then(mod => ({ default: mod.LevelRewardsDataTable })),
)

interface LevelRewardsClientProps {
  initialData: AdminAPI.LevelRewards.Get.Response;
}

export function LevelRewardsClient({ initialData }: LevelRewardsClientProps) {
  const t = useTranslations("admin");
  const tm = useTranslations("admin.levelRewardModal");
  const tf = useTranslations("admin.levelForm");
  const tc = useTranslations("common");
  const { play: playSound } = useSoundWithSettings();
  const queryClient = useQueryClient();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReward, setEditingReward] = useState<AdminAPI.LevelRewards.LevelReward | null>(null);
  const [formData, setFormData] = useState<Partial<AdminAPI.LevelRewards.Create.Body>>({
    level_required: 1,
    reward_type: "",
    reward_payload: {},
  });
  const [payloadText, setPayloadText] = useState("{}");

  const { data, isFetching, refetch } = useQuery({
    queryKey: ["level-rewards"],
    queryFn: () => fetchFromActionRoute<AdminAPI.LevelRewards.Get.Response>('/api/admin/level-rewards'),
    initialData,
    staleTime: Infinity,
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
        throw new Error(t("invalidRewardJson"));
      }

      if (isUpdate) {
        return fetchFromActionRoute<AdminAPI.LevelRewards.Update.Response>(
          `/api/admin/level-rewards/${encodeURIComponent(rewardId)}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestPayload as AdminAPI.LevelRewards.Update.Body),
          },
        );
      }
      return fetchFromActionRoute<AdminAPI.LevelRewards.Create.Response>('/api/admin/level-rewards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload as AdminAPI.LevelRewards.Create.Body),
      });
    },
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({
        queryKey: ["level-rewards"],
        refetchType: 'active'
      });
      await refetch();

      const isUpdate = !!variables.id || !!editingReward?.id;
      playSound('success');
      toast.success(isUpdate ? t("crudUpdated") : t("crudCreated"));

      if (isModalOpen) {
        setIsModalOpen(false);
        setEditingReward(null);
        setFormData({ level_required: 1, reward_type: "", reward_payload: {} });
        setPayloadText("{}");
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || t("genericError"));
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      fetchFromActionRoute<AdminAPI.LevelRewards.Delete.Response>(
        `/api/admin/level-rewards/${encodeURIComponent(id)}`,
        { method: 'DELETE' },
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["level-rewards"],
        refetchType: 'active'
      });
      await refetch();
      toast.success(t("rewardDeleted"));
    },
    onError: (error: Error) => {
      toast.error(error.message || t("deleteError"));
    },
  });

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
    <AppLayout sidebarItem="adminLevelRewards">
      <LevelRewardsDataTable
        initialData={data?.data || []}
        callbacks={rowCallbacks}
        leftColumnVisibilityContent={
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <IconRefresh className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
        }
        rightColumnVisibilityContent={
          <Button asChild className="bg-primary hover:opacity-90 shadow-md" size="sm">
            <Link href="/admin/level-rewards/create">
              <IconPlus className="w-4 h-4 mr-2" /> {tm("addNew")}
            </Link>
          </Button>
        }
      />
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={onFormSubmit}>
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">
                {editingReward ? tm("updateTitle") : tm("createTitle")}
              </DialogTitle>
              <DialogDescription>
                {tm("description")}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="level_required">{tf("levelRequired")} <span className="text-destructive">*</span></Label>
                  <Input
                    id="level_required"
                    type="number"
                    min="1"
                    placeholder={tf("levelPlaceholder")}
                    value={formData.level_required || ""}
                    required
                    onChange={e => setFormData({ ...formData, level_required: parseInt(e.target.value) || 1 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reward_type">{tf("rewardType")} <span className="text-destructive">*</span></Label>
                  <Input
                    id="reward_type"
                    placeholder={tf("rewardTypePlaceholder")}
                    value={formData.reward_type || ""}
                    required
                    onChange={e => setFormData({ ...formData, reward_type: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reward_payload">{tf("rewardPayload")} <span className="text-destructive">*</span></Label>
                <Textarea
                  id="reward_payload"
                  rows={6}
                  placeholder='{"name": "Gold Frame", "value": 100}'
                  value={payloadText}
                  onChange={e => setPayloadText(e.target.value)}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  {tm("payloadJsonHint")}
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>{tc("cancel")}</Button>
              <Button type="submit" disabled={upsertMutation.isPending} className="min-w-[100px]">
                {upsertMutation.isPending ? <Loader2 className="animate-spin h-4 w-4" /> : tm("saveChanges")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
}
