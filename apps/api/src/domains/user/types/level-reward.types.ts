export interface LevelReward {
  id: string;
  levelRequired: number;
  rewardType: string;
  rewardPayload: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface UserLevelReward {
  id: string;
  userId: string;
  levelRewardId: string;
  grantedAt: string;
}

export interface LevelRewardWithGranted extends LevelReward {
  granted: boolean;
  grantedAt?: string;
}
