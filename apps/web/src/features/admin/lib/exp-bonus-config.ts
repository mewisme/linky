import type { AdminAPI } from "@/features/admin/types/admin.types";

export function buildExpBonusConfig(
  type: AdminAPI.ExpBonuses.ExpBonusType,
  config: AdminAPI.ExpBonuses.ExpBonusConfig,
): AdminAPI.ExpBonuses.ExpBonusConfig | null {
  if (type === "favorite") {
    if (config.relation !== "mutual" && config.relation !== "one_way") {
      return null;
    }
    return { relation: config.relation };
  }
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
  if (out.min !== undefined && out.max !== undefined && out.max < out.min) {
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
