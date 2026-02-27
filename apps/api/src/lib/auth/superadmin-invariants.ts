const SUPERADMIN = "superadmin" as const;

export function assertCannotAssignSuperadmin(newRole: string | undefined): void {
  if (newRole === SUPERADMIN) {
    throw new Error("Cannot assign superadmin role via API");
  }
}

export function assertTargetNotSuperadmin(targetRole: string): void {
  if (targetRole === SUPERADMIN) {
    throw new Error("Superadmin users cannot be modified");
  }
}

export function assertTargetCanBeSoftDeleted(targetRole: string): void {
  if (targetRole === SUPERADMIN) {
    throw new Error("Superadmin users cannot be soft deleted");
  }
}

export function assertCanHardDeleteTarget(
  targetRole: string,
  targetId: string,
  actingUserDbId: string
): void {
  if (targetRole === SUPERADMIN) {
    throw new Error("Superadmin users cannot be deleted");
  }
  if (targetId === actingUserDbId) {
    throw new Error("Cannot hard delete yourself");
  }
}
