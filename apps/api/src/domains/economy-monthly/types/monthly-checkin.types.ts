export interface MonthlyCheckinRecord {
  id: string;
  user_id: string;
  year: number;
  month: number;
  claimed_days: number[];
  buyback_count: number;
  created_at: string;
  updated_at: string;
}

export interface MonthlyProgress {
  year: number;
  month: number;
  claimedDays: number[];
  availableToday: boolean;
  buybackCostPreview: number;
  totalClaimed: number;
}

export interface ClaimMonthlyCheckinResult {
  reward: number;
  newCoinBalance: number;
}

export interface ClaimMonthlyBuybackResult {
  expSpent: number;
  reward: number;
  newCoinBalance: number;
}

export interface ClaimMonthlyCheckinRpcRow {
  reward: number;
  new_coin_balance: number;
}

export interface ClaimMonthlyBuybackRpcRow {
  exp_spent: number;
  reward: number;
  new_coin_balance: number;
}

export function getBuybackCost(buybackCount: number): number {
  return Math.min(300 + buybackCount * 100, 800);
}

export function getMonthlyRewardForDay(day: number, daysInMonth: number): number {
  if (day === daysInMonth) return 80;
  if (day >= 26) return Math.min(6 + (day - 26), 10);
  if (day <= 25) return 2 + Math.floor(((day - 1) * 3) / 24);
  return 0;
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}
