"use client";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@ws/ui/components/ui/dialog";
import { IconEye, IconPlus } from "@tabler/icons-react";
import { VIDEO_FILTER_PREVIEW_DRAFT_STORAGE_KEY } from "@/features/admin/ui/video-filter-preview-client";
import React, { useState } from "react";
import { fetchFromActionRoute } from "@/shared/lib/fetch-action-route";
import { useMutation, useQuery, useQueryClient } from "@ws/ui/internal-lib/react-query";

import { AdminAPI } from "@/features/admin/types/admin.types";
import { AppLayout } from "@/shared/ui/layouts/app-layout";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@ws/ui/components/ui/button";
import { Input } from "@ws/ui/components/ui/input";
import { Label } from "@ws/ui/components/ui/label";
import { Switch } from "@ws/ui/components/ui/switch";
import { Textarea } from "@ws/ui/components/ui/textarea";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { useSoundWithSettings } from '@/shared/hooks/audio/use-sound-with-settings';
import { toast } from "@ws/ui/components/ui/sonner";
import { DataTableRefreshButton } from "@/shared/ui/data-table/refresh-button";

const VideoFilterPresetsDataTable = dynamic(
  () => import('@/shared/ui/data-table/video-filter-presets/data-table').then(mod => ({ default: mod.VideoFilterPresetsDataTable })),
);

interface VideoFilterPresetsClientProps {
  initialData: AdminAPI.VideoFilterPresets.Get.Response;
}

export function VideoFilterPresetsClient({ initialData }: VideoFilterPresetsClientProps) {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const tDataTable = useTranslations("dataTable");
  const router = useRouter();
  const { play: playSound } = useSoundWithSettings();
  const queryClient = useQueryClient();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPreset, setEditingPreset] = useState<AdminAPI.VideoFilterPresets.VideoFilterPreset | null>(null);
  const [formData, setFormData] = useState({
    slug: "", name: "", description: "", fragment_shader: "", thumbnail_url: "", sort_order: 0, is_active: true,
  });

  const { data, isPending, isFetching, refetch } = useQuery({
    queryKey: ["video-filter-presets"],
    queryFn: () => fetchFromActionRoute<AdminAPI.VideoFilterPresets.Get.Response>("/api/admin/video-filter-presets"),
    initialData,
    staleTime: Infinity,
  });

  const upsertMutation = useMutation({
    mutationFn: async (payload: typeof formData & { id?: string }) => {
      const presetId = payload.id || editingPreset?.id;
      if (presetId) {
        const { ...rest } = payload;
        if ('id' in rest) delete (rest as Record<string, unknown>).id;
        return fetchFromActionRoute<AdminAPI.VideoFilterPresets.Update.Response>(
          `/api/admin/video-filter-presets/${encodeURIComponent(presetId)}`,
          { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(rest) },
        );
      }
      const { ...rest } = payload;
      if ('id' in rest) delete (rest as Record<string, unknown>).id;
      return fetchFromActionRoute<AdminAPI.VideoFilterPresets.Create.Response>("/api/admin/video-filter-presets", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(rest),
      });
    },
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({ queryKey: ["video-filter-presets"], refetchType: 'active' });
      await refetch();
      playSound('success');
      toast.success(variables.id || editingPreset?.id ? t("crudUpdated") : t("crudCreated"));
      if (isModalOpen) {
        setIsModalOpen(false);
        setEditingPreset(null);
        setFormData({ slug: "", name: "", description: "", fragment_shader: "", thumbnail_url: "", sort_order: 0, is_active: true });
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || t("genericError"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      fetchFromActionRoute<AdminAPI.VideoFilterPresets.Delete.Response>(`/api/admin/video-filter-presets/${encodeURIComponent(id)}`, { method: "DELETE" }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["video-filter-presets"], refetchType: 'active' });
      await refetch();
      playSound('success');
      toast.success(t("crudDeleted"));
    },
    onError: (error: Error) => {
      toast.error(error.message || t("deleteError"));
    },
  });

  const openCreate = () => {
    setEditingPreset(null);
    setFormData({ slug: "", name: "", description: "", fragment_shader: "", thumbnail_url: "", sort_order: 0, is_active: true });
    setIsModalOpen(true);
  };

  const openEdit = (preset: AdminAPI.VideoFilterPresets.VideoFilterPreset) => {
    setEditingPreset(preset);
    setFormData({
      slug: preset.slug, name: preset.name, description: preset.description ?? "",
      fragment_shader: preset.fragment_shader, thumbnail_url: preset.thumbnail_url ?? "",
      sort_order: preset.sort_order, is_active: preset.is_active,
    });
    setIsModalOpen(true);
  };

  const openFormShaderPreview = () => {
    sessionStorage.setItem(VIDEO_FILTER_PREVIEW_DRAFT_STORAGE_KEY, formData.fragment_shader);
    router.push("/admin/video-filter-presets/preview?draft=1");
  };

  const rowCallbacks = {
    onEdit: (preset: AdminAPI.VideoFilterPresets.VideoFilterPreset) => openEdit(preset),
    onDelete: (preset: AdminAPI.VideoFilterPresets.VideoFilterPreset) => deleteMutation.mutate(preset.id),
  };

  return (
    <AppLayout sidebarItem="adminVideoFilterPresets">
      <VideoFilterPresetsDataTable
        initialData={data?.data ?? []}
        isLoading={isPending}
        callbacks={rowCallbacks}
        leftColumnVisibilityContent={
          <>
            <Button type="button" variant="outline" size="sm" asChild>
              <Link href="/admin/video-filter-presets/preview">
                <IconEye className="size-4" />
                <span className="hidden lg:inline">{tDataTable("videoFilterPresets.preview")}</span>
              </Link>
            </Button>
            <DataTableRefreshButton onClick={() => refetch()} isFetching={isFetching} />
          </>
        }
        rightColumnVisibilityContent={
          <Button onClick={openCreate} disabled={upsertMutation.isPending} size="sm">
            <IconPlus className="size-4" />
            <span className="hidden lg:inline">{tc("create")}</span>
          </Button>
        }
      />

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPreset ? tc("edit") : tc("create")}</DialogTitle>
            <DialogDescription>{editingPreset ? "Edit video filter preset" : "Create a new video filter preset"}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Slug</Label>
                <Input value={formData.slug} onChange={(e) => setFormData({ ...formData, slug: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Name</Label>
                <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Input value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <Label>Fragment Shader</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!formData.fragment_shader.trim()}
                  onClick={openFormShaderPreview}
                >
                  <IconEye className="size-4" />
                  {t("videoFilterPreview.previewShader")}
                </Button>
              </div>
              <Textarea
                className="font-mono text-xs min-h-[200px]"
                value={formData.fragment_shader}
                onChange={(e) => setFormData({ ...formData, fragment_shader: e.target.value })}
                placeholder="vec4 color = texture2D(u_texture, v_texCoord);&#10;gl_FragColor = color;"
              />
            </div>
            <div className="space-y-1">
              <Label>Thumbnail URL</Label>
              <Input value={formData.thumbnail_url} onChange={(e) => setFormData({ ...formData, thumbnail_url: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Sort Order</Label>
                <Input type="number" value={formData.sort_order} onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Switch checked={formData.is_active} onCheckedChange={(v) => setFormData({ ...formData, is_active: v })} />
                <Label>Active</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>{tc("cancel")}</Button>
            <Button
              disabled={upsertMutation.isPending || !formData.slug || !formData.name || !formData.fragment_shader}
              onClick={() => upsertMutation.mutate({ ...formData, id: editingPreset?.id ?? "" })}
            >
              {upsertMutation.isPending ? tc("saving") : tc("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
