interface LevelCalculationParams {
  base: number;
  step: number;
}

const DEFAULT_PARAMS: LevelCalculationParams = {
  base: 300,
  step: 120,
};

export function calculateLevelFromExp(
  totalExpSeconds: number,
  params: LevelCalculationParams = DEFAULT_PARAMS
): { level: number; expToNextLevel: number } {
  const { base, step } = params;

  if (totalExpSeconds <= 0) {
    return { level: 1, expToNextLevel: base };
  }

  const a = step / 2;
  const b = base - (3 * step) / 2;
  const c = step - base - totalExpSeconds;

  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) {
    return { level: 1, expToNextLevel: base };
  }

  const sqrtDiscriminant = Math.sqrt(discriminant);
  const levelCandidate = Math.floor((-b + sqrtDiscriminant) / (2 * a)) + 1;

  let level = Math.max(1, levelCandidate);

  let expRequired = 0;
  if (level > 1) {
    const n = level - 1;
    expRequired = n * base + (step * (n - 1) * n) / 2;
  }

  while (expRequired + base + (level - 1) * step <= totalExpSeconds) {
    expRequired += base + (level - 1) * step;
    level++;
  }

  if (level > levelCandidate + 2) {
    level = levelCandidate + 1;
    const n = level - 1;
    expRequired = n * base + (step * (n - 1) * n) / 2;
  }

  const expForNextLevel = base + (level - 1) * step;
  const expInCurrentLevel = totalExpSeconds - expRequired;
  const expToNextLevel = expForNextLevel - expInCurrentLevel;

  return { level, expToNextLevel };
}
