import type { AdminAPI } from '@/features/admin/types/admin.types';

export function buildExpBonusConfig(
  config: AdminAPI.ExpBonuses.ExpBonusConfig,
): AdminAPI.ExpBonuses.ExpBonusConfig | null {
  const out: AdminAPI.ExpBonuses.ExpBonusConfig = {};
  if (config.min !== undefined && !Number.isNaN(config.min)) {
    out.min = config.min;
  }
  if (config.max !== undefined && !Number.isNaN(config.max)) {
    out.max = config.max;
  }
  if (out.min === undefined && out.max === undefined) {
    return null;
  }
  if (
    out.min !== undefined &&
    out.max !== undefined &&
    out.max < out.min
  ) {
    return null;
  }
  return out;
}

export function formatExpBonusBound(
  value: number | undefined,
  unboundedLabel: string,
): string {
  return value === undefined ? unboundedLabel : String(value);
}
