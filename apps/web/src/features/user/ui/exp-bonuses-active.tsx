'use client';

import { Badge } from '@ws/ui/components/ui/badge';
import { IconFlame, IconStar } from '@tabler/icons-react';
import {
  formatExpBonusPercent,
  formatExpBonusRange,
  type ExpBonusActive,
} from '@/features/user/lib/format-exp-bonus';
import { useTranslations } from 'next-intl';

interface ExpBonusesActiveProps {
  bonuses: ExpBonusActive[];
}

export function ExpBonusesActive({ bonuses }: ExpBonusesActiveProps) {
  const t = useTranslations('user.progress');

  if (!bonuses?.length) {
    return null;
  }

  const rangeLabels = {
    minMax: (min: number, max: number) =>
      t('expBonusRangeMinMax', { min, max }),
    minOnly: (min: number) => t('expBonusRangeMinOnly', { min }),
    maxOnly: (max: number) => t('expBonusRangeMaxOnly', { max }),
  };

  return (
    <ul className="space-y-3 border-t pt-4" data-testid="progress-exp-bonuses">
      {bonuses.map((bonus) => {
        const isStreak = bonus.type === 'streak';
        const range = formatExpBonusRange(bonus, rangeLabels);
        return (
          <li
            key={`${bonus.type}-${bonus.multiplier}-${range}`}
            className="flex items-center justify-between gap-3 text-sm"
          >
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                {isStreak ? (
                  <IconFlame className="size-4 shrink-0 text-orange-500" aria-hidden />
                ) : (
                  <IconStar className="size-4 shrink-0 text-yellow-500" aria-hidden />
                )}
                <span>
                  {isStreak ? t('expBonusTypeStreak') : t('expBonusTypeLevel')}
                  {range ? (
                    <span className="text-foreground"> · {range}</span>
                  ) : null}
                </span>
              </span>
              <Badge variant="secondary" className="shrink-0 tabular-nums">
                {t('expBonusMultiplier', {
                  multiplier: bonus.multiplier.toFixed(2),
                  percent: formatExpBonusPercent(bonus.multiplier),
                })}
              </Badge>
          </li>
        );
      })}
    </ul>
  );
}
