export { }

// Create a type for the Roles
export type Roles = 'admin' | 'member'

declare global {
  interface CustomJwtSessionClaims {
    metadata: {
      role?: Roles
    }
  }
}

