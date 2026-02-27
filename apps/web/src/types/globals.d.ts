export { };

export type UserRole = "admin" | "member" | "superadmin";

declare global {
  interface CustomJwtSessionClaims {
    metadata: {
      role?: UserRole;
    };
  }
}

