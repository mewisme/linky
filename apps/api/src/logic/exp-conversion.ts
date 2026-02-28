export function calculateConversionBonusPct(expAmount: number): number {
  if (expAmount >= 10000) return 15;
  if (expAmount >= 5000) return 10;
  if (expAmount >= 1000) return 5;
  return 0;
}

export function calculateConversion(expAmount: number): {
  baseCoins: number;
  bonusCoins: number;
  totalCoins: number;
} {
  const baseCoins = Math.floor(expAmount / 100);
  const pct = calculateConversionBonusPct(expAmount);
  const bonusCoins = Math.floor((baseCoins * pct) / 100);
  const totalCoins = baseCoins + bonusCoins;
  return { baseCoins, bonusCoins, totalCoins };
}
