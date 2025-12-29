import "axios";

export { };

// Create a type for the Roles
export type Roles = "admin" | "member";

declare global {
  interface CustomJwtSessionClaims {
    metadata: {
      role?: Roles;
    };
  }
}

// Extend Axios types to include _retry flag
declare module "axios" {
  export interface AxiosRequestConfig {
    _retry?: boolean;
  }
}

