export interface DailyExpRecord {
  id: string;
  user_id: string;
  date: string;
  exp_seconds: number;
  milestone_600_claimed: boolean;
  milestone_1800_claimed: boolean;
  milestone_3600_claimed: boolean;
  created_at: string;
  updated_at: string;
}

export interface MilestoneState {
  reached: boolean;
  claimed: boolean;
}

export interface DailyProgress {
  localDate: string;
  expEarned: number;
  milestones: {
    600: MilestoneState;
    1800: MilestoneState;
    3600: MilestoneState;
  };
}

export interface IncrementDailyExpRpcRow {
  exp_earned: number;
  milestone_600_claimed: boolean;
  milestone_1800_claimed: boolean;
  milestone_3600_claimed: boolean;
}
