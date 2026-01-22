export interface AdminLevelRewardInsert {
  level_required: number;
  reward_type: string;
  reward_payload: Record<string, unknown>;
}

export interface AdminLevelRewardUpdate {
  level_required?: number;
  reward_type?: string;
  reward_payload?: Record<string, unknown>;
}
