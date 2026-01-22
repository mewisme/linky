export interface AdminLevelFeatureUnlockInsert {
  level_required: number;
  feature_key: string;
  feature_payload: Record<string, unknown>;
}

export interface AdminLevelFeatureUnlockUpdate {
  level_required?: number;
  feature_key?: string;
  feature_payload?: Record<string, unknown>;
}
