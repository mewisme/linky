"use client";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@ws/ui/components/ui/dialog";
import { IconFileImport, IconMoodSearch, IconPlus, IconRefresh } from "@tabler/icons-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@ws/ui/components/animate-ui/components/radix/popover";
import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { AdminAPI } from "@/types/admin.types";
import { AppLayout } from "@/components/layouts/app-layout";
import { Button } from "@ws/ui/components/ui/button";
import { Input } from "@ws/ui/components/ui/input";
import { Label } from "@ws/ui/components/ui/label";
import { Loader2 } from "@ws/ui/internal-lib/icons";
import { Switch } from "@ws/ui/components/ui/switch";
import dynamic from "next/dynamic";
import { toast } from "@ws/ui/components/ui/sonner";
import { useSoundWithSettings } from '@/hooks/audio/use-sound-with-settings';
import {
  createInterestTag,
  deleteInterestTag,
  getAdminInterestTags,
  hardDeleteInterestTag,
  importInterestTags,
  updateInterestTag,
} from '@/lib/actions/admin/interest-tags';

const EmojiPickerLazy = dynamic(
  () => import("@ws/ui/components/ui/emoji-picker").then(mod => ({
    default: ({ className, onEmojiSelect }: any) => (
      <mod.EmojiPicker className={className} onEmojiSelect={onEmojiSelect}>
        <mod.EmojiPickerSearch />
        <mod.EmojiPickerContent />
        <mod.EmojiPickerFooter />
      </mod.EmojiPicker>
    )
  })),
  { loading: () => <div className="h-[342px] flex items-center justify-center"><Loader2 className="animate-spin" /></div>, ssr: false }
);

const InterestTagsDataTable = dynamic(
  () => import('@/components/data-table/interest-tags/data-table').then(mod => ({ default: mod.InterestTagsDataTable })),
);

const ImportInterestTagsDialog = dynamic(
  () => import('@/components/data-table/interest-tags/import-interest-tags-dialog').then(mod => ({ default: mod.ImportInterestTagsDialog })),
  { ssr: false }
);

interface InterestTagsClientProps {
  initialData: AdminAPI.InterestTags.Get.Response;
}

export function InterestTagsClient({ initialData }: InterestTagsClientProps) {
  const { play: playSound } = useSoundWithSettings();
  const queryClient = useQueryClient();
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);

  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<AdminAPI.InterestTags.InterestTag | null>(null);
  const [formData, setFormData] = useState<Partial<AdminAPI.InterestTags.Create.Body>>({
    name: "", description: "", category: "", is_active: true, icon: ""
  });

  const { data, isFetching, refetch } = useQuery({
    queryKey: ["interest-tags"],
    queryFn: () => getAdminInterestTags(),
    initialData,
    staleTime: Infinity,
  });

  const upsertMutation = useMutation({
    mutationFn: async (payload: Partial<AdminAPI.InterestTags.Create.Body> & { id?: string }) => {
      const tagId = payload.id || editingTag?.id;
      const isUpdate = !!tagId;

      const requestPayload = { ...payload };
      if ('id' in requestPayload) {
        delete requestPayload.id;
      }

      if (isUpdate) {
        return updateInterestTag(tagId, requestPayload as AdminAPI.InterestTags.Update.Body);
      }
      return createInterestTag(requestPayload as AdminAPI.InterestTags.Create.Body);
    },
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({
        queryKey: ["interest-tags"],
        refetchType: 'active'
      });
      await refetch();

      const isUpdate = !!variables.id || !!editingTag?.id;
      playSound('success');
      toast.success(isUpdate ? "Updated successfully!" : "Created successfully!");

      if (isModalOpen) {
        setIsModalOpen(false);
        setEditingTag(null);
        setFormData({ name: "", description: "", category: "", is_active: true, icon: "" });
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "An error occurred");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ id, hard }: { id: string, hard: boolean }) => {
      if (hard) return hardDeleteInterestTag(id);
      return deleteInterestTag(id);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["interest-tags"],
        refetchType: 'active'
      });
      await refetch();
      toast.success("Tag deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "An error occurred during deletion");
    },
  });

  const handleOpenCreate = () => {
    setEditingTag(null);
    setFormData({ name: "", description: "", category: "", is_active: true, icon: "" });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (tag: AdminAPI.InterestTags.InterestTag) => {
    setEditingTag(tag);
    setFormData({
      name: tag.name,
      description: tag.description || "",
      category: tag.category || "",
      is_active: tag.is_active,
      icon: tag.icon || ""
    });
    setIsModalOpen(true);
  };

  const onFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    upsertMutation.mutate(formData);
  };

  const rowCallbacks = {
    onEdit: (tag: AdminAPI.InterestTags.InterestTag) => handleOpenEdit(tag),
    onActivate: (tag: AdminAPI.InterestTags.InterestTag) => upsertMutation.mutate({ ...tag, is_active: true }),
    onDelete: (tag: AdminAPI.InterestTags.InterestTag) => deleteMutation.mutate({ id: tag.id, hard: false }),
    onDeletePermanently: (tag: AdminAPI.InterestTags.InterestTag) => deleteMutation.mutate({ id: tag.id, hard: true }),
  }

  return (
    <AppLayout label="Interest Tags" description="Manage interest tags for user personalization">
      <InterestTagsDataTable
        initialData={data?.data || []}
        callbacks={rowCallbacks}
        leftColumnVisibilityContent={
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <IconRefresh className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
        }
        rightColumnVisibilityContent={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsImportOpen(true)} data-testid="admin-interest-tags-import-button">
              <IconFileImport className="w-4 h-4 mr-2" /> Import JSON
            </Button>
            <Button onClick={handleOpenCreate} className="bg-primary hover:opacity-90 shadow-md" size="sm" data-testid="admin-interest-tag-create-button">
              <IconPlus className="w-4 h-4 mr-2" /> Add New Tag
            </Button>
          </div>
        }
      />
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={onFormSubmit}>
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">
                {editingTag ? "Update Interest Tag" : "Create Interest Tag"}
              </DialogTitle>
              <DialogDescription>
                Interest tags help the system recommend more accurate content to users.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Display Name <span className="text-destructive">*</span></Label>
                  <Input id="name" placeholder="e.g. Technology" value={formData.name} required onChange={e => setFormData({ ...formData, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Input id="category" placeholder="e.g. Hobbies" value={formData.category || ""} onChange={e => setFormData({ ...formData, category: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="icon">Icon / Emoji</Label>
                <div className="flex gap-2 flex-row">
                  <Input id="icon" placeholder="e.g. 🎨, ⚽, 💻..." value={formData.icon || ""} onChange={e => setFormData({ ...formData, icon: e.target.value })} />
                  <Popover open={emojiPickerOpen} onOpenChange={setEmojiPickerOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline">
                        <IconMoodSearch className="w-4 h-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-fit p-0">
                      <EmojiPickerLazy
                        className="h-[342px]"
                        onEmojiSelect={({ emoji }: { emoji: string }) => {
                          setFormData({ ...formData, icon: emoji });
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Detailed Description</Label>
                <textarea
                  id="description"
                  rows={3}
                  placeholder="Provide a brief context for this tag..."
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  value={formData.description || ""}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div className="flex items-center justify-between p-4 bg-muted/40 rounded-xl border border-dashed border-primary/20">
                <div className="space-y-0.5">
                  <Label className="text-base">Visibility Status</Label>
                  <p className="text-xs text-muted-foreground italic">Allow users to see and select this tag</p>
                </div>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(val) => setFormData({ ...formData, is_active: val })}
                />
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
      <ImportInterestTagsDialog
        open={isImportOpen}
        onOpenChange={setIsImportOpen}
        onSuccess={async () => {
          await queryClient.invalidateQueries({ queryKey: ["interest-tags"], refetchType: "active" });
          await refetch();
        }}
      />
    </AppLayout>
  )
}
