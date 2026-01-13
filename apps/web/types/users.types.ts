/* eslint-disable @typescript-eslint/no-namespace */

import type { ApiError } from "./api.types";

export namespace UsersAPI {
  export namespace GetMe {
    export interface Response {
      id: string;
      clerk_user_id: string;
      email: string | null;
      first_name: string | null;
      last_name: string | null;
      avatar_url: string | null;
      country: string | null;
      role: "admin" | "member";
      allow: boolean;
      created_at: string;
      updated_at: string;
    }
  }

  export namespace UpdateCountry {
    export interface Body {
      country: string;
      clerk_user_id: string;
    }

    export type Response = GetMe.Response;
  }

  export namespace UserDetails {
    export interface InterestTag {
      id: string;
      name: string;
      description: string | null;
      icon: string | null;
      category: string | null;
      is_active: boolean;
      created_at: string;
      updated_at: string;
    }

    export namespace GetMe {
      export interface Response {
        id: string;
        user_id: string;
        date_of_birth: string | null;
        gender: string | null;
        languages: string[] | null;
        interest_tags: InterestTag[] | null;
        bio: string | null;
        created_at: string;
        updated_at: string;
      }
    }

    export namespace UpdateMe {
      export interface Body {
        date_of_birth?: string | null;
        gender?: string | null;
        languages?: string[] | null;
        interest_tags?: string[] | null;
        bio?: string | null;
      }

      export type Response = GetMe.Response;
    }

    export namespace PatchMe {
      export interface Body {
        date_of_birth?: string | null;
        gender?: string | null;
        languages?: string[] | null;
        interest_tags?: string[] | null;
        bio?: string | null;
      }

      export type Response = GetMe.Response;
    }

    export namespace InterestTags {
      export namespace Add {
        export interface Body {
          tagIds: string[];
        }

        export type Response = GetMe.Response;
      }

      export namespace Remove {
        export interface Body {
          tagIds: string[];
        }

        export type Response = GetMe.Response;
      }

      export namespace Replace {
        export interface Body {
          tagIds: string[];
        }

        export type Response = GetMe.Response;
      }

      export namespace Clear {
        export type Response = GetMe.Response;
      }
    }
  }
}
