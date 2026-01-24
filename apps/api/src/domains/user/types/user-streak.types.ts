export interface UserStreak {
  userId: string;
  currentStreak: number;
  longestStreak: number;
  lastValidDate: string | null;
  lastContinuationUsedFreeze?: boolean;
  updatedAt: string;
}

export interface UserStreakDay {
  id: string;
  userId: string;
  date: string;
  totalCallSeconds: number;
  isValid: boolean;
  createdAt: string;
}
