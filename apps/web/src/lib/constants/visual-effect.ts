export const STREAK_IMAGE_BASE_PATH = "/images/streak";
export const STREAK_IMAGE_COUNT = 8;
export const STREAK_IMAGE_LOOP_COUNT = 3;
export const STREAK_IMAGE_FIXED_SIZE = 256;

export function getStreakImagePath(index: number): string {
  const i = Math.max(1, Math.min(index, STREAK_IMAGE_COUNT));
  return `${STREAK_IMAGE_BASE_PATH}/${i}.png`;
}
