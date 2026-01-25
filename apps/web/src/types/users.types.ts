/* eslint-disable @typescript-eslint/no-namespace */

export type UserRole = "admin" | "member";

export namespace UsersAPI {
  export interface PublicUserInfo {
    id: string;
    avatar_url: string | null;
    first_name: string | null;
    last_name: string | null;
    date_of_birth: string | null;
    gender: string | null;
    bio: string | null;
    interest_tags: UserDetails.InterestTag[] | null;
  }

  export namespace GetMe {
    export interface Response {
      id: string;
      clerk_user_id: string;
      email: string | null;
      first_name: string | null;
      last_name: string | null;
      avatar_url: string | null;
      country: string | null;
      role: UserRole;
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

  export namespace UserSettings {
    export namespace GetMe {
      export interface Response {
        id: string;
        user_id: string;
        default_mute_mic: boolean;
        default_disable_camera: boolean;
        notification_sound_enabled: boolean;
        notification_preferences: Record<string, unknown> | null;
        created_at: string;
        updated_at: string;
      }
    }

    export namespace UpdateMe {
      export interface Body {
        default_mute_mic?: boolean;
        default_disable_camera?: boolean;
        notification_sound_enabled?: boolean;
        notification_preferences?: Record<string, unknown> | null;
      }

      export type Response = GetMe.Response;
    }

    export namespace PatchMe {
      export interface Body {
        default_mute_mic?: boolean;
        default_disable_camera?: boolean;
        notification_sound_enabled?: boolean;
        notification_preferences?: Record<string, unknown> | null;
      }

      export type Response = GetMe.Response;
    }
  }

  export namespace Progress {
    export type StreakStatus = "active" | "frozen" | "incomplete";

    export namespace GetMe {
      export interface Response {
        currentLevel: number;
        expProgress: {
          totalExpSeconds: number;
          expToNextLevel: number;
          progressPercentage: number;
        };
        expEarnedToday: number;
        remainingSecondsToNextLevel: number;
        streakStatus: StreakStatus;
        todayCallDuration: {
          totalSeconds: number;
          isValid: boolean;
        };
        todayCallDurationSeconds: number;
        streakRequiredSeconds: number;
        streakRemainingSeconds: number;
        isTodayStreakComplete: boolean;
        streak: {
          currentStreak: number;
          longestStreak: number;
          remainingSecondsToKeepStreak: number;
          lastValidDate: string | null;
        };
        todayDate: string;
        recentStreakDays: { date: string; isValid: boolean }[];
        freeze?: { availableCount: number };
      }
    }
  }

  export namespace Streak {
    export namespace Calendar {
      export interface Day {
        date: string;
        isValid: boolean;
        totalCallSeconds: number;
        isToday: boolean;
      }

      export type Response = Day[];
    }
  }
}
