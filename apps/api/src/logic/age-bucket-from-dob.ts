const BUCKETS = [
  { maxAge: 17, label: "under_18" },
  { maxAge: 24, label: "18_24" },
  { maxAge: 34, label: "25_34" },
  { maxAge: 44, label: "35_44" },
  { maxAge: 54, label: "45_54" },
  { maxAge: 64, label: "55_64" },
  { maxAge: Infinity, label: "65_plus" },
] as const;

export function deriveAgeBucket(dateOfBirth: string | null | undefined): string {
  if (dateOfBirth == null || typeof dateOfBirth !== "string") {
    return "";
  }
  const trimmed = dateOfBirth.trim();
  if (!trimmed) return "";
  try {
    const birth = new Date(trimmed);
    if (Number.isNaN(birth.getTime())) return "";
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    if (age < 0) return "";
    for (const bucket of BUCKETS) {
      if (age <= bucket.maxAge) {
        return bucket.label;
      }
    }
    return BUCKETS[BUCKETS.length - 1]!.label;
  } catch {
    return "";
  }
}
