export interface WeeklyCheckinRecord {
  id: string;
  user_id: string;
  streak_day: number;
  last_checkin_local_date: string | null;
  total_weeks_completed: number;
  created_at: string;
  updated_at: string;
}

export interface WeeklyProgress {
  streakDay: number;
  lastCheckinDate: string | null;
  rewardToday: number | null;
  canCheckinToday: boolean;
  totalWeeksCompleted: number;
}

export interface ClaimWeeklyCheckinResult {
  streakDay: number;
  reward: number;
  newCoinBalance: number;
}

export interface ClaimWeeklyCheckinRpcRow {
  streak_day: number;
  reward: number;
  new_coin_balance: number;
}

export const WEEKLY_CHECKIN_REWARDS: Record<number, number> = {
  1: 2,
  2: 3,
  3: 4,
  4: 5,
  5: 6,
  6: 8,
  7: 18,
};
