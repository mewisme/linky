"use client";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@ws/ui/components/ui/dialog";
import { IconPlus } from "@tabler/icons-react";
import { DataTableRefreshButton } from "@/shared/ui/data-table/refresh-button";
import { SimpleTooltip } from "@/shared/ui/common/simple-tooltip";
import React, { useMemo, useState } from "react";
import { fetchFromActionRoute } from '@/shared/lib/fetch-action-route';
import { useMutation, useQuery, useQueryClient } from "@ws/ui/internal-lib/react-query";

import { buildExpBonusConfig } from "@/features/admin/lib/exp-bonus-config";
import { AdminAPI } from "@/features/admin/types/admin.types";
import { AppLayout } from "@/shared/ui/layouts/app-layout";
import { Button } from "@ws/ui/components/ui/button";
import { Input } from "@ws/ui/components/ui/input";
import { Label } from "@ws/ui/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ws/ui/components/ui/select";
import { Loader2 } from "@ws/ui/internal-lib/icons";
import dynamic from "next/dynamic";
import { toast } from "@ws/ui/components/ui/sonner";
import { useTranslations } from "next-intl";
import { useSoundWithSettings } from '@/shared/hooks/audio/use-sound-with-settings';

const ExpBonusesDataTable = dynamic(
  () => import('@/shared/ui/data-table/exp-bonuses/data-table').then(mod => ({ default: mod.ExpBonusesDataTable })),
  { ssr: false }
);

interface ExpBonusesClientProps {
  initialData: AdminAPI.ExpBonuses.Get.Response;
}

const DEFAULT_FORM: AdminAPI.ExpBonuses.Create.Body = {
  type: "streak",
  config: {},
  bonus_multiplier: 1.0,
};

export function ExpBonusesClient({ initialData }: ExpBonusesClientProps) {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const { play: playSound } = useSoundWithSettings();
  const queryClient = useQueryClient();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBonus, setEditingBonus] = useState<AdminAPI.ExpBonuses.ExpBonus | null>(null);
  const [formData, setFormData] = useState<AdminAPI.ExpBonuses.Create.Body>(DEFAULT_FORM);

  const rangeLabels = useMemo(() => {
    if (formData.type === "level") {
      return {
        min: t("expBonusModal.minLevel"),
        max: t("expBonusModal.maxLevel"),
        minPlaceholder: t("expBonusModal.minLevelPlaceholder"),
        maxPlaceholder: t("expBonusModal.maxLevelPlaceholder"),
      };
    }
    return {
      min: t("expBonusModal.minStreak"),
      max: t("expBonusModal.maxStreak"),
      minPlaceholder: t("expBonusModal.minStreakPlaceholder"),
      maxPlaceholder: t("expBonusModal.maxStreakPlaceholder"),
    };
  }, [formData.type, t]);

  const { data, isPending, isFetching, refetch } = useQuery({
    queryKey: ["exp-bonuses"],
    queryFn: () =>
      fetchFromActionRoute<AdminAPI.ExpBonuses.Get.Response>('/api/admin/exp-bonuses'),
    initialData,
    staleTime: Infinity,
  });

  const upsertMutation = useMutation({
    mutationFn: async (payload: Partial<AdminAPI.ExpBonuses.Create.Body> & { id?: string }) => {
      const bonusId = payload.id || editingBonus?.id;
      const isUpdate = !!bonusId;

      const requestPayload = { ...payload };
      if ('id' in requestPayload) {
        delete requestPayload.id;
      }

      if (isUpdate) {
        return fetchFromActionRoute<AdminAPI.ExpBonuses.Update.Response>(
          `/api/admin/exp-bonuses/${encodeURIComponent(bonusId)}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestPayload as AdminAPI.ExpBonuses.Update.Body),
          },
        );
      }
      return fetchFromActionRoute<AdminAPI.ExpBonuses.Create.Response>(
        '/api/admin/exp-bonuses',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestPayload as AdminAPI.ExpBonuses.Create.Body),
        },
      );
    },
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({
        queryKey: ["exp-bonuses"],
        refetchType: 'active'
      });
      await refetch();

      const isUpdate = !!variables.id || !!editingBonus?.id;
      playSound('success');
      toast.success(isUpdate ? t("crudUpdated") : t("crudCreated"));

      if (isModalOpen) {
        setIsModalOpen(false);
        setEditingBonus(null);
        setFormData(DEFAULT_FORM);
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || t("genericError"));
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      fetchFromActionRoute<AdminAPI.ExpBonuses.Delete.Response>(
        `/api/admin/exp-bonuses/${encodeURIComponent(id)}`,
        { method: 'DELETE' },
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["exp-bonuses"],
        refetchType: 'active'
      });
      await refetch();
      toast.success(t("expBonusDeleted"));
    },
    onError: (error: Error) => {
      toast.error(error.message || t("deleteError"));
    },
  });

  const handleOpenCreate = () => {
    setEditingBonus(null);
    setFormData(DEFAULT_FORM);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (bonus: AdminAPI.ExpBonuses.ExpBonus) => {
    setEditingBonus(bonus);
    setFormData({
      type: bonus.type,
      config:
        bonus.type === 'favorite'
          ? { relation: bonus.config.relation }
          : {
              ...(bonus.config.min !== undefined ? { min: bonus.config.min } : {}),
              ...(bonus.config.max !== undefined ? { max: bonus.config.max } : {}),
            },
      bonus_multiplier: bonus.bonus_multiplier,
    });
    setIsModalOpen(true);
  };

  const onFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const config = buildExpBonusConfig(formData.type, formData.config);
    if (!config) {
      toast.error(
        formData.type === 'favorite'
          ? t('expBonusModal.relationRequired')
          : t('expBonusModal.rangeRequired'),
      );
      return;
    }
    upsertMutation.mutate({ ...formData, config });
  };

  const isFavoriteType = formData.type === 'favorite';

  const rowCallbacks = {
    onEdit: (bonus: AdminAPI.ExpBonuses.ExpBonus) => handleOpenEdit(bonus),
    onDelete: (bonus: AdminAPI.ExpBonuses.ExpBonus) => deleteMutation.mutate(bonus.id),
  }

  return (
    <AppLayout sidebarItem="adminExpBonuses">
      <ExpBonusesDataTable
        initialData={data?.data || []}
        isLoading={isPending}
        callbacks={rowCallbacks}
        leftColumnVisibilityContent={
          <DataTableRefreshButton onClick={() => refetch()} isFetching={isFetching} />
        }
        rightColumnVisibilityContent={
          <SimpleTooltip content={t("expBonusModal.addNew")}>
            <Button onClick={handleOpenCreate} className="bg-primary hover:opacity-90 shadow-md" size="sm">
              <IconPlus className="w-4 h-4" />
              <span className="hidden lg:inline">{t("expBonusModal.addNew")}</span>
            </Button>
          </SimpleTooltip>
        }
      />
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={onFormSubmit}>
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">
                {editingBonus ? t("expBonusModal.updateTitle") : t("expBonusModal.createTitle")}
              </DialogTitle>
              <DialogDescription>
                {t("expBonusModal.description")}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-6">
              <div className="space-y-2">
                <Label htmlFor="type">{t("expBonusModal.type")} <span className="text-destructive">*</span></Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: AdminAPI.ExpBonuses.ExpBonusType) =>
                    setFormData({
                      type: value,
                      config: value === 'favorite' ? {} : {},
                      bonus_multiplier: formData.bonus_multiplier,
                    })
                  }
                >
                  <SelectTrigger id="type" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="w-full">
                    <SelectItem value="streak">{t("expBonusModal.typeStreak")}</SelectItem>
                    <SelectItem value="level">{t("expBonusModal.typeLevel")}</SelectItem>
                    <SelectItem value="favorite">{t("expBonusModal.typeFavorite")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {isFavoriteType ? (
                <div className="space-y-2">
                  <Label htmlFor="config_relation">
                    {t('expBonusModal.relation')} <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formData.config.relation ?? ''}
                    onValueChange={(value: AdminAPI.ExpBonuses.ExpBonusRelation) =>
                      setFormData({ ...formData, config: { relation: value } })
                    }
                  >
                    <SelectTrigger id="config_relation" className="w-full">
                      <SelectValue placeholder={t('expBonusModal.relationPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent className="w-full">
                      <SelectItem value="mutual">{t('expBonusModal.relationMutual')}</SelectItem>
                      <SelectItem value="one_way">{t('expBonusModal.relationOneWay')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {t('expBonusModal.favoriteHint')}
                  </p>
                </div>
              ) : (
              <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="config_min">{rangeLabels.min}</Label>
                  <Input
                    id="config_min"
                    type="number"
                    min="0"
                    placeholder={rangeLabels.minPlaceholder}
                    value={formData.config.min ?? ''}
                    onChange={e => {
                      const raw = e.target.value;
                      const next = { ...formData.config };
                      if (raw === '') {
                        delete next.min;
                      } else {
                        const parsed = parseInt(raw, 10);
                        if (!Number.isNaN(parsed)) {
                          next.min = parsed;
                        }
                      }
                      setFormData({ ...formData, config: next });
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="config_max">{rangeLabels.max}</Label>
                  <Input
                    id="config_max"
                    type="number"
                    min={formData.config.min ?? 0}
                    placeholder={rangeLabels.maxPlaceholder}
                    value={formData.config.max ?? ''}
                    onChange={e => {
                      const raw = e.target.value;
                      const next = { ...formData.config };
                      if (raw === '') {
                        delete next.max;
                      } else {
                        const parsed = parseInt(raw, 10);
                        if (!Number.isNaN(parsed)) {
                          next.max = parsed;
                        }
                      }
                      setFormData({ ...formData, config: next });
                    }}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground -mt-2">
                {t("expBonusModal.rangeOptionalHint")}
              </p>
              </>
              )}
              <div className="space-y-2">
                <Label htmlFor="bonus_multiplier">{t("expBonusModal.bonusMultiplier")} <span className="text-destructive">*</span></Label>
                <Input
                  id="bonus_multiplier"
                  type="number"
                  min="1.0"
                  step="0.01"
                  placeholder={t("expBonusModal.bonusPlaceholder")}
                  value={formData.bonus_multiplier}
                  required
                  onChange={e => setFormData({ ...formData, bonus_multiplier: parseFloat(e.target.value) || 1.0 })}
                />
                <p className="text-xs text-muted-foreground">
                  {t("expBonusModal.multiplierHint")}
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>{tc("cancel")}</Button>
              <Button type="submit" disabled={upsertMutation.isPending} className="min-w-[100px]">
                {upsertMutation.isPending ? <Loader2 className="animate-spin h-4 w-4" /> : tc("saveChanges")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
}
