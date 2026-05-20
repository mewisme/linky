import type { UsersAPI } from '@/entities/user/types/users.types';

export type ExpBonusActive = UsersAPI.Progress.GetMe.ExpBonusActive;

export function formatExpBonusPercent(multiplier: number): string {
  return String(Math.round((multiplier - 1) * 100));
}

export function formatExpBonusRange(
  bonus: ExpBonusActive,
  labels: {
    minMax: (min: number, max: number) => string;
    minOnly: (min: number) => string;
    maxOnly: (max: number) => string;
    favoriteMutual?: () => string;
    favoriteOneWay?: () => string;
  },
): string {
  if (bonus.type === 'favorite' && bonus.relation) {
    if (bonus.relation === 'mutual' && labels.favoriteMutual) {
      return labels.favoriteMutual();
    }
    if (bonus.relation === 'one_way' && labels.favoriteOneWay) {
      return labels.favoriteOneWay();
    }
  }
  const hasMin = bonus.min !== undefined;
  const hasMax = bonus.max !== undefined;
  if (hasMin && hasMax) {
    return labels.minMax(bonus.min!, bonus.max!);
  }
  if (hasMin) {
    return labels.minOnly(bonus.min!);
  }
  if (hasMax) {
    return labels.maxOnly(bonus.max!);
  }
  return '';
}
