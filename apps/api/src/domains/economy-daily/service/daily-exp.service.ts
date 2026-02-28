import type { DailyProgress } from "@/domains/economy-daily/types/daily-exp.types.js";
import { getDailyExpRecord } from "@/domains/economy-daily/repository/daily-exp.repository.js";

function toMilestoneState(expEarned: number, claimed: boolean, threshold: number) {
  return {
    reached: expEarned >= threshold,
    claimed,
  };
}

export async function getDailyProgress(userId: string, localDate: string): Promise<DailyProgress> {
  const record = await getDailyExpRecord(userId, localDate);
  if (!record) {
    return {
      localDate,
      expEarned: 0,
      milestones: {
        600: { reached: false, claimed: false },
        1800: { reached: false, claimed: false },
        3600: { reached: false, claimed: false },
      },
    };
  }

  const expEarned = record.exp_seconds;
  return {
    localDate: record.date,
    expEarned,
    milestones: {
      600: toMilestoneState(expEarned, record.milestone_600_claimed, 600),
      1800: toMilestoneState(expEarned, record.milestone_1800_claimed, 1800),
      3600: toMilestoneState(expEarned, record.milestone_3600_claimed, 3600),
    },
  };
}
