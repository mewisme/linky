export interface LevelFeatureUnlock {
  id: string;
  levelRequired: number;
  featureKey: string;
  featurePayload: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface UserUnlockedFeatures {
  [featureKey: string]: {
    unlocked: boolean;
    levelRequired: number;
    featurePayload: Record<string, unknown>;
  };
}
