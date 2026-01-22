export interface UserLevel {
  userId: string;
  totalExpSeconds: number;
  level: number;
  expToNextLevel: number;
  createdAt: string;
  updatedAt: string;
}

export interface LevelCalculationParams {
  base: number;
  step: number;
}
