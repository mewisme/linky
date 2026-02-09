"use client";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@ws/ui/components/ui/dialog";
import { IconPlus, IconRefresh } from "@tabler/icons-react";
import React, { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { AdminAPI } from "@/types/admin.types";
import { AppLayout } from "@/components/layouts/app-layout";
import { Button } from "@ws/ui/components/ui/button";
import { Input } from "@ws/ui/components/ui/input";
import { Label } from "@ws/ui/components/ui/label";
import { Loader2 } from "lucide-react";
import { StreakExpBonusesDataTable } from '@/components/data-table/streak-exp-bonuses/data-table';
import { toast } from "@ws/ui/components/ui/sonner";
import { useSoundWithSettings } from '@/hooks/audio/use-sound-with-settings';
import { useUserContext } from "@/components/providers/user/user-provider";

export default function StreakExpBonusesPage() {
  const { state } = useUserContext();
  const { play: playSound } = useSoundWithSettings();
  const [token, setToken] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBonus, setEditingBonus] = useState<AdminAPI.StreakExpBonuses.StreakExpBonus | null>(null);
  const [formData, setFormData] = useState<Partial<AdminAPI.StreakExpBonuses.Create.Body>>({
    min_streak: 0,
    max_streak: 0,
    bonus_multiplier: 1.0,
  });

  useEffect(() => {
    const fetchToken = async () => {
      const token = await state.getToken();
      setToken(token);
    }
    fetchToken();
  }, [state])

  const { data, isFetching, refetch } = useQuery({
    queryKey: ["streak-exp-bonuses"],
    queryFn: async () => {
      const res = await fetch(`/api/admin/streak-exp-bonuses`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to load data");
      return res.json() as Promise<AdminAPI.StreakExpBonuses.Get.Response>;
    },
    enabled: !!token,
  });

  const upsertMutation = useMutation({
    mutationFn: async (payload: Partial<AdminAPI.StreakExpBonuses.Create.Body> & { id?: string }) => {
      const bonusId = payload.id || editingBonus?.id;
      const isUpdate = !!bonusId;

      const requestPayload = { ...payload };
      if ('id' in requestPayload) {
        delete requestPayload.id;
      }

      const url = isUpdate ? `/api/admin/streak-exp-bonuses/${bonusId}` : `/api/admin/streak-exp-bonuses`;
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
        queryKey: ["streak-exp-bonuses"],
        refetchType: 'active'
      });
      await refetch();

      const isUpdate = !!variables.id || !!editingBonus?.id;
      playSound('success');
      toast.success(isUpdate ? "Updated successfully!" : "Created successfully!");

      if (isModalOpen) {
        setIsModalOpen(false);
        setEditingBonus(null);
        setFormData({ min_streak: 0, max_streak: 0, bonus_multiplier: 1.0 });
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "An error occurred");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/streak-exp-bonuses/${id}`, {
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
        queryKey: ["streak-exp-bonuses"],
        refetchType: 'active'
      });
      await refetch();
      toast.success("Streak EXP bonus deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "An error occurred during deletion");
    },
  });

  const handleOpenCreate = () => {
    setEditingBonus(null);
    setFormData({ min_streak: 0, max_streak: 0, bonus_multiplier: 1.0 });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (bonus: AdminAPI.StreakExpBonuses.StreakExpBonus) => {
    setEditingBonus(bonus);
    setFormData({
      min_streak: bonus.min_streak,
      max_streak: bonus.max_streak,
      bonus_multiplier: bonus.bonus_multiplier,
    });
    setIsModalOpen(true);
  };

  const onFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    upsertMutation.mutate(formData);
  };

  const rowCallbacks = {
    onEdit: (bonus: AdminAPI.StreakExpBonuses.StreakExpBonus) => handleOpenEdit(bonus),
    onDelete: (bonus: AdminAPI.StreakExpBonuses.StreakExpBonus) => deleteMutation.mutate(bonus.id),
  }

  return (
    <AppLayout label="Streak EXP Bonuses" description="Manage EXP bonus multipliers based on streak length">
      <StreakExpBonusesDataTable
        initialData={data?.data || []}
        callbacks={rowCallbacks}
        leftColumnVisibilityContent={
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <IconRefresh className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
        }
        rightColumnVisibilityContent={
          <Button onClick={handleOpenCreate} className="bg-primary hover:opacity-90 shadow-md" size="sm">
            <IconPlus className="w-4 h-4 mr-2" /> Add New Bonus
          </Button>
        }
      />
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={onFormSubmit}>
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">
                {editingBonus ? "Update Streak EXP Bonus" : "Create Streak EXP Bonus"}
              </DialogTitle>
              <DialogDescription>
                Define EXP bonus multipliers that apply when users have streaks within specific ranges.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="min_streak">Min Streak <span className="text-destructive">*</span></Label>
                  <Input
                    id="min_streak"
                    type="number"
                    min="0"
                    placeholder="e.g. 7"
                    value={formData.min_streak || ""}
                    required
                    onChange={e => setFormData({ ...formData, min_streak: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max_streak">Max Streak <span className="text-destructive">*</span></Label>
                  <Input
                    id="max_streak"
                    type="number"
                    min={formData.min_streak || 0}
                    placeholder="e.g. 30"
                    value={formData.max_streak || ""}
                    required
                    onChange={e => setFormData({ ...formData, max_streak: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bonus_multiplier">Bonus Multiplier <span className="text-destructive">*</span></Label>
                <Input
                  id="bonus_multiplier"
                  type="number"
                  min="1.0"
                  step="0.01"
                  placeholder="e.g. 1.50 for 50% bonus"
                  value={formData.bonus_multiplier || ""}
                  required
                  onChange={e => setFormData({ ...formData, bonus_multiplier: parseFloat(e.target.value) || 1.0 })}
                />
                <p className="text-xs text-muted-foreground">
                  Multiplier applied to EXP. Must be at least 1.0 (e.g., 1.50 = 50% bonus).
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
