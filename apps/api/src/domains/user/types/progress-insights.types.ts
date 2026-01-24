export interface ProgressInsights {
  currentLevel: number;
  expProgress: {
    totalExpSeconds: number;
    expToNextLevel: number;
    progressPercentage: number;
  };
  todayCallDuration: {
    totalSeconds: number;
    isValid: boolean;
  };
  todayCallDurationSeconds: number;
  streakRequiredSeconds: number;
  streakRemainingSeconds: number;
  isTodayStreakComplete: boolean;
  streak: {
    currentStreak: number;
    longestStreak: number;
    remainingSecondsToKeepStreak: number;
    lastValidDate: string | null;
  };
  todayDate: string;
  recentStreakDays: { date: string; isValid: boolean }[];
}
