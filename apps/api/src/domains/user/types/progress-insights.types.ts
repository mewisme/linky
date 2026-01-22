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
  streak: {
    currentStreak: number;
    longestStreak: number;
    remainingSecondsToKeepStreak: number;
    lastValidDate: string | null;
  };
}
