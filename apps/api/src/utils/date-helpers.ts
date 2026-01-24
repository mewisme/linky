export function addDays(dateStr: string, delta: number): string {
  const t = new Date(dateStr + "T12:00:00Z");
  t.setUTCDate(t.getUTCDate() + delta);
  return t.toISOString().slice(0, 10);
}
