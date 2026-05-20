'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@ws/ui/internal-lib/react-query';
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@ws/ui/components/ui/combobox';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@ws/ui/components/ui/card';
import { fetchFromActionRoute } from '@/shared/lib/fetch-action-route';
import { adminAIModelsQueryOptions } from '@/features/admin/model/admin-ai-models-query';
import type { AdminAPI } from '@/features/admin/types/admin.types';
import { AppLayout } from '@/shared/ui/layouts/app-layout';
import { Button } from '@ws/ui/components/ui/button';
import { Input } from '@ws/ui/components/ui/input';
import { Label } from '@ws/ui/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ws/ui/components/ui/select';
import { Loader2 } from '@ws/ui/internal-lib/icons';
import { toast } from '@ws/ui/components/ui/sonner';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { useSoundWithSettings } from '@/shared/hooks/audio/use-sound-with-settings';
import { isSuperAdmin } from '@/shared/utils/roles';
import { useUserStore } from '@/entities/user/model/user-store';
import { Separator } from '@ws/ui/components/ui/separator';

const EMBEDDING_DIMENSIONS = [384, 768, 1024, 1536, 3072] as const;

const EMPTY_SETTINGS: AdminAPI.AI.Settings = {
  base_url: '',
  models: {
    chat: { broadcast: '', report_summary: '' },
    embedding: '',
    image: '',
    tts: '',
    stt: '',
    web_search: '',
    web_fetch: '',
  },
  timeouts: { request_ms: 60000, embedding_ms: 60000 },
  embedding: { user_api_batch_size: 8, dimension: 3072 },
};

function mergeFormFromResponse(res: AdminAPI.AI.Config.Response): AdminAPI.AI.Settings {
  const admin = res.admin ?? {};
  const eff = res.effective as AdminAPI.AI.Settings;
  const chatEff = (eff.models?.chat ?? {}) as AdminAPI.AI.ChatModels;
  return {
    base_url: admin.base_url ?? eff.base_url ?? '',
    models: {
      chat: {
        broadcast: admin.models?.chat?.broadcast ?? chatEff.broadcast ?? '',
        report_summary: admin.models?.chat?.report_summary ?? chatEff.report_summary ?? '',
      },
      embedding: admin.models?.embedding ?? eff.models?.embedding ?? '',
      image: admin.models?.image ?? eff.models?.image ?? '',
      tts: admin.models?.tts ?? eff.models?.tts ?? '',
      stt: admin.models?.stt ?? eff.models?.stt ?? '',
      web_search: admin.models?.web_search ?? eff.models?.web_search ?? '',
      web_fetch: admin.models?.web_fetch ?? eff.models?.web_fetch ?? '',
    },
    timeouts: {
      request_ms: admin.timeouts?.request_ms ?? eff.timeouts?.request_ms ?? 60000,
      embedding_ms: admin.timeouts?.embedding_ms ?? eff.timeouts?.embedding_ms ?? 60000,
    },
    embedding: {
      user_api_batch_size:
        admin.embedding?.user_api_batch_size ??
        (eff.embedding as AdminAPI.AI.EmbeddingJobConfig | undefined)?.user_api_batch_size ??
        8,
      dimension:
        admin.embedding?.dimension ??
        (eff.embedding as AdminAPI.AI.EmbeddingJobConfig | undefined)?.dimension ??
        3072,
    },
  };
}

function ModelCombobox({
  id,
  label,
  value,
  models,
  loading,
  onChange,
  placeholder,
  emptyLabel,
}: {
  id: string;
  label: string;
  value: string;
  models: AdminAPI.AI.ModelEntry[];
  loading: boolean;
  onChange: (v: string) => void;
  placeholder: string;
  emptyLabel: string;
}) {
  const items = useMemo(() => {
    const ids = models.map((m) => m.id);
    if (value && !ids.includes(value)) {
      return [value, ...ids];
    }
    return ids;
  }, [models, value]);

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="font-normal">
        {label}
      </Label>
      <Combobox
        items={items}
        value={value || null}
        onValueChange={(next) => onChange(next ?? '')}
        disabled={loading}
      >
        <ComboboxInput
          id={id}
          className="w-full font-mono text-sm font-normal"
          placeholder={loading ? '…' : placeholder}
          disabled={loading}
        />
        <ComboboxContent>
          <ComboboxEmpty>{emptyLabel}</ComboboxEmpty>
          <ComboboxList>
            {(item) => (
              <ComboboxItem key={item} value={item} className="font-mono font-normal">
                {item}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </div>
  );
}

export function AdminAIConfigClient() {
  const t = useTranslations('admin.aiConfig');
  const router = useRouter();
  const { user: userStore } = useUserStore();
  const { play: playSound } = useSoundWithSettings();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<AdminAPI.AI.Settings>(EMPTY_SETTINGS);

  useEffect(() => {
    if (userStore && !isSuperAdmin(userStore.role)) {
      router.replace('/admin');
    }
  }, [userStore, router]);

  const { data, isFetching, refetch } = useQuery({
    queryKey: ['admin-ai-config'],
    queryFn: () => fetchFromActionRoute<AdminAPI.AI.Config.Response>('/api/admin/ai/config'),
  });

  const { data: modelsData, isFetching: modelsLoading } = useQuery(adminAIModelsQueryOptions());

  useEffect(() => {
    if (data) {
      setForm(mergeFormFromResponse(data));
    }
  }, [data]);

  const modelsByCap = useMemo(() => {
    const caps = modelsData?.capabilities ?? {};
    const pick = (key: string) => caps[key]?.data ?? [];
    return {
      chat: pick('chat'),
      embedding: pick('embedding'),
      image: pick('image'),
      tts: pick('tts'),
      stt: pick('stt'),
      web_search: pick('web_search'),
      web_fetch: pick('web_fetch'),
    };
  }, [modelsData]);

  const saveMutation = useMutation({
    mutationFn: async (settings: AdminAPI.AI.Settings) =>
      fetchFromActionRoute<AdminAPI.AI.Config.PutResponse>('/api/admin/ai/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: settings }),
      }),
    onSuccess: async () => {
      playSound('success');
      toast.success(t('saved'));
      await queryClient.invalidateQueries({ queryKey: ['admin-ai-config'] });
      await queryClient.invalidateQueries({ queryKey: ['admin-config'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || t('saveFailed'));
    },
  });

  function updateModels(partial: Partial<AdminAPI.AI.ModelsConfig>) {
    setForm((prev) => ({
      ...prev,
      models: { ...prev.models, ...partial },
    }));
  }

  function updateChat(partial: Partial<AdminAPI.AI.ChatModels>) {
    setForm((prev) => ({
      ...prev,
      models: {
        ...prev.models,
        chat: { ...prev.models?.chat, ...partial },
      },
    }));
  }

  return (
    <AppLayout
      label={t('pageTitle')}
      description={t('pageDescription')}
      backHref="/admin/config"
      backLabel={t('backToConfig')}
    >
      {isFetching && !data ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <form
          className="w-full space-y-6"
          onSubmit={(e) => {
            e.preventDefault();
            saveMutation.mutate(form);
          }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="font-normal">{t('gatewayTitle')}</CardTitle>
              <CardDescription>{t('gatewayDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="base_url" className="font-normal">
                  {t('baseUrl')}
                </Label>
                <Input
                  id="base_url"
                  value={form.base_url ?? ''}
                  onChange={(e) => setForm((p) => ({ ...p, base_url: e.target.value }))}
                  placeholder="http://localhost:20128"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-normal">{t('modelsTitle')}</CardTitle>
              <CardDescription>{t('modelsDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">{t('chatCapability')}</p>
              <ModelCombobox
                id="chat_broadcast"
                label={t('modelBroadcast')}
                value={form.models?.chat?.broadcast ?? ''}
                models={modelsByCap.chat}
                loading={modelsLoading}
                onChange={(v) => updateChat({ broadcast: v })}
                placeholder={t('selectModel')}
                emptyLabel={t('noModelsFound')}
              />
              <ModelCombobox
                id="chat_report"
                label={t('modelReportSummary')}
                value={form.models?.chat?.report_summary ?? ''}
                models={modelsByCap.chat}
                loading={modelsLoading}
                onChange={(v) => updateChat({ report_summary: v })}
                placeholder={t('selectModel')}
                emptyLabel={t('noModelsFound')}
              />
              <Separator />
              <ModelCombobox
                id="embedding"
                label={t('modelEmbedding')}
                value={form.models?.embedding ?? ''}
                models={modelsByCap.embedding}
                loading={modelsLoading}
                onChange={(v) => updateModels({ embedding: v })}
                placeholder={t('selectModel')}
                emptyLabel={t('noModelsFound')}
              />
              <Separator />
              <p className="text-sm text-muted-foreground">{t('futureCapabilities')}</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <ModelCombobox
                  id="image"
                  label={t('modelImage')}
                  value={form.models?.image ?? ''}
                  models={modelsByCap.image}
                  loading={modelsLoading}
                  onChange={(v) => updateModels({ image: v })}
                  placeholder={t('selectModel')}
                  emptyLabel={t('noModelsFound')}
                />
                <ModelCombobox
                  id="tts"
                  label={t('modelTts')}
                  value={form.models?.tts ?? ''}
                  models={modelsByCap.tts}
                  loading={modelsLoading}
                  onChange={(v) => updateModels({ tts: v })}
                  placeholder={t('selectModel')}
                  emptyLabel={t('noModelsFound')}
                />
                <ModelCombobox
                  id="stt"
                  label={t('modelStt')}
                  value={form.models?.stt ?? ''}
                  models={modelsByCap.stt}
                  loading={modelsLoading}
                  onChange={(v) => updateModels({ stt: v })}
                  placeholder={t('selectModel')}
                  emptyLabel={t('noModelsFound')}
                />
                <ModelCombobox
                  id="web_search"
                  label={t('modelWebSearch')}
                  value={form.models?.web_search ?? ''}
                  models={modelsByCap.web_search}
                  loading={modelsLoading}
                  onChange={(v) => updateModels({ web_search: v })}
                  placeholder={t('selectModel')}
                  emptyLabel={t('noModelsFound')}
                />
                <ModelCombobox
                  id="web_fetch"
                  label={t('modelWebFetch')}
                  value={form.models?.web_fetch ?? ''}
                  models={modelsByCap.web_fetch}
                  loading={modelsLoading}
                  onChange={(v) => updateModels({ web_fetch: v })}
                  placeholder={t('selectModel')}
                  emptyLabel={t('noModelsFound')}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-normal">{t('advancedTitle')}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="request_ms" className="font-normal">
                  {t('requestTimeoutMs')}
                </Label>
                <Input
                  id="request_ms"
                  type="number"
                  min={1000}
                  value={form.timeouts?.request_ms ?? ''}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      timeouts: { ...p.timeouts, request_ms: Number(e.target.value) || undefined },
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="embedding_ms" className="font-normal">
                  {t('embeddingTimeoutMs')}
                </Label>
                <Input
                  id="embedding_ms"
                  type="number"
                  min={1000}
                  value={form.timeouts?.embedding_ms ?? ''}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      timeouts: { ...p.timeouts, embedding_ms: Number(e.target.value) || undefined },
                    }))
                  }
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="user_batch" className="font-normal">
                  {t('embedUserBatchSize')}
                </Label>
                <Input
                  id="user_batch"
                  type="number"
                  min={5}
                  max={10}
                  value={form.embedding?.user_api_batch_size ?? ''}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      embedding: {
                        ...p.embedding,
                        user_api_batch_size: Number(e.target.value) || undefined,
                      },
                    }))
                  }
                />
                <p className="text-xs text-muted-foreground">{t('embedUserBatchHint')}</p>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="embedding_dimension" className="font-normal">
                  {t('embeddingDimension')}
                </Label>
                <Select
                  value={String(form.embedding?.dimension ?? 3072)}
                  onValueChange={(v) =>
                    setForm((p) => ({
                      ...p,
                      embedding: {
                        ...p.embedding,
                        dimension: Number(v),
                      },
                    }))
                  }
                >
                  <SelectTrigger id="embedding_dimension" className="w-full sm:max-w-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EMBEDDING_DIMENSIONS.map((dim) => (
                      <SelectItem key={dim} value={String(dim)}>
                        {dim}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {t('embeddingDimensionHint', { N: form.embedding?.dimension ?? 3072 })}
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              {t('save')}
            </Button>
          </div>
        </form>
      )}
    </AppLayout>
  );
}
