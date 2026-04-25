"use client";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@ws/ui/components/ui/dialog";
import { IconPlus, IconRefresh } from "@tabler/icons-react";
import React, { useState } from "react";
import { createLevelFeatureUnlock, deleteLevelFeatureUnlock, getAdminLevelFeatureUnlocks, updateLevelFeatureUnlock } from '@/features/admin/api/level-feature-unlocks';
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

const LevelFeatureUnlocksDataTable = dynamic(
  () => import('@/shared/ui/data-table/level-feature-unlocks/data-table').then(mod => ({ default: mod.LevelFeatureUnlocksDataTable })),
)

interface LevelFeatureUnlocksClientProps {
  initialData: AdminAPI.LevelFeatureUnlocks.Get.Response;
}

export function LevelFeatureUnlocksClient({ initialData }: LevelFeatureUnlocksClientProps) {
  const t = useTranslations("admin");
  const tm = useTranslations("admin.featureUnlockModal");
  const tf = useTranslations("admin.levelForm");
  const tc = useTranslations("common");
  const { play: playSound } = useSoundWithSettings();
  const queryClient = useQueryClient();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUnlock, setEditingUnlock] = useState<AdminAPI.LevelFeatureUnlocks.LevelFeatureUnlock | null>(null);
  const [formData, setFormData] = useState<Partial<AdminAPI.LevelFeatureUnlocks.Create.Body>>({
    level_required: 1,
    feature_key: "",
    feature_payload: {},
  });
  const [payloadText, setPayloadText] = useState("{}");

  const { data, isFetching, refetch } = useQuery({
    queryKey: ["level-feature-unlocks"],
    queryFn: () => getAdminLevelFeatureUnlocks(),
    initialData,
    staleTime: Infinity,
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
        throw new Error(t("invalidJsonPayload"));
      }

      if (isUpdate) {
        return updateLevelFeatureUnlock(unlockId, requestPayload as AdminAPI.LevelFeatureUnlocks.Update.Body);
      }
      return createLevelFeatureUnlock(requestPayload as AdminAPI.LevelFeatureUnlocks.Create.Body);
    },
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({
        queryKey: ["level-feature-unlocks"],
        refetchType: 'active'
      });
      await refetch();

      const isUpdate = !!variables.id || !!editingUnlock?.id;
      playSound('success');
      toast.success(isUpdate ? t("crudUpdated") : t("crudCreated"));

      if (isModalOpen) {
        setIsModalOpen(false);
        setEditingUnlock(null);
        setFormData({ level_required: 1, feature_key: "", feature_payload: {} });
        setPayloadText("{}");
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || t("genericError"));
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteLevelFeatureUnlock(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["level-feature-unlocks"],
        refetchType: 'active'
      });
      await refetch();
      toast.success(t("featureUnlockDeleted"));
    },
    onError: (error: Error) => {
      toast.error(error.message || t("deleteError"));
    },
  });

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
    <AppLayout sidebarItem="adminFeatureUnlocks">
      <LevelFeatureUnlocksDataTable
        initialData={data?.data || []}
        callbacks={rowCallbacks}
        leftColumnVisibilityContent={
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <IconRefresh className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
        }
        rightColumnVisibilityContent={
          <Button render={
            <Link href="/admin/level-feature-unlocks/create">
              <IconPlus className="w-4 h-4 mr-2" /> {tm("addNew")}
            </Link>
          } className="bg-primary hover:opacity-90 shadow-md" size="sm" />
        }
      />
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={onFormSubmit}>
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">
                {editingUnlock ? tm("updateTitle") : tm("createTitle")}
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
                  <Label htmlFor="feature_key">{tf("featureKey")} <span className="text-destructive">*</span></Label>
                  <Input
                    id="feature_key"
                    placeholder={tf("featureKeyPlaceholder")}
                    value={formData.feature_key || ""}
                    required
                    onChange={e => setFormData({ ...formData, feature_key: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="feature_payload">{tf("featurePayload")} <span className="text-destructive">*</span></Label>
                <Textarea
                  id="feature_payload"
                  rows={6}
                  placeholder='{"limit": 20, "types": ["like", "love"]}'
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
