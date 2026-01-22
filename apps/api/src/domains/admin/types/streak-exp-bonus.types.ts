export interface AdminStreakExpBonusInsert {
  min_streak: number;
  max_streak: number;
  bonus_multiplier: number;
}

export interface AdminStreakExpBonusUpdate {
  min_streak?: number;
  max_streak?: number;
  bonus_multiplier?: number;
}
