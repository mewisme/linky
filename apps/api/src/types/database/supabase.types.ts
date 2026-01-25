export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      call_history: {
        Row: {
          callee_country: string | null
          callee_id: string
          caller_country: string | null
          caller_id: string
          created_at: string
          duration_seconds: number | null
          ended_at: string | null
          id: string
          started_at: string
          updated_at: string
        }
        Insert: {
          callee_country?: string | null
          callee_id: string
          caller_country?: string | null
          caller_id: string
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          started_at?: string
          updated_at?: string
        }
        Update: {
          callee_country?: string | null
          callee_id?: string
          caller_country?: string | null
          caller_id?: string
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          started_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_call_history_callee"
            columns: ["callee_id"]
            isOneToOne: false
            referencedRelation: "public_user_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_call_history_callee"
            columns: ["callee_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_call_history_callee"
            columns: ["callee_id"]
            isOneToOne: false
            referencedRelation: "users_with_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_call_history_caller"
            columns: ["caller_id"]
            isOneToOne: false
            referencedRelation: "public_user_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_call_history_caller"
            columns: ["caller_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_call_history_caller"
            columns: ["caller_id"]
            isOneToOne: false
            referencedRelation: "users_with_details"
            referencedColumns: ["id"]
          },
        ]
      }
      changelogs: {
        Row: {
          created_at: string
          created_by: string
          id: string
          is_published: boolean
          order: number | null
          release_date: string
          s3_key: string
          title: string
          updated_at: string
          version: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          is_published?: boolean
          order?: number | null
          release_date: string
          s3_key: string
          title: string
          updated_at?: string
          version: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          is_published?: boolean
          order?: number | null
          release_date?: string
          s3_key?: string
          title?: string
          updated_at?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_changelogs_created_by"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "public_user_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_changelogs_created_by"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_changelogs_created_by"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users_with_details"
            referencedColumns: ["id"]
          },
        ]
      }
      favorite_exp_boost_rules: {
        Row: {
          created_at: string
          id: string
          mutual_multiplier: number
          one_way_multiplier: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          mutual_multiplier?: number
          one_way_multiplier?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          mutual_multiplier?: number
          one_way_multiplier?: number
          updated_at?: string
        }
        Relationships: []
      }
      interest_tags: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      level_feature_unlocks: {
        Row: {
          created_at: string
          feature_key: string
          feature_payload: Json
          id: string
          level_required: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          feature_key: string
          feature_payload?: Json
          id?: string
          level_required: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          feature_key?: string
          feature_payload?: Json
          id?: string
          level_required?: number
          updated_at?: string
        }
        Relationships: []
      }
      level_rewards: {
        Row: {
          created_at: string
          id: string
          level_required: number
          reward_payload: Json
          reward_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          level_required: number
          reward_payload?: Json
          reward_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          level_required?: number
          reward_payload?: Json
          reward_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      page_views: {
        Row: {
          created_at: string
          id: string
          ip: string
          path: string
        }
        Insert: {
          created_at?: string
          id?: string
          ip: string
          path: string
        }
        Update: {
          created_at?: string
          id?: string
          ip?: string
          path?: string
        }
        Relationships: []
      }
      report_contexts: {
        Row: {
          behavior_flags: Json | null
          call_ended_at: string | null
          call_id: string | null
          call_started_at: string | null
          chat_snapshot: Json | null
          created_at: string
          duration_seconds: number | null
          ended_by: string | null
          id: string
          report_id: string
          reported_at_offset_seconds: number | null
          reported_role: string | null
          reporter_role: string | null
          room_id: string | null
        }
        Insert: {
          behavior_flags?: Json | null
          call_ended_at?: string | null
          call_id?: string | null
          call_started_at?: string | null
          chat_snapshot?: Json | null
          created_at?: string
          duration_seconds?: number | null
          ended_by?: string | null
          id?: string
          report_id: string
          reported_at_offset_seconds?: number | null
          reported_role?: string | null
          reporter_role?: string | null
          room_id?: string | null
        }
        Update: {
          behavior_flags?: Json | null
          call_ended_at?: string | null
          call_id?: string | null
          call_started_at?: string | null
          chat_snapshot?: Json | null
          created_at?: string
          duration_seconds?: number | null
          ended_by?: string | null
          id?: string
          report_id?: string
          reported_at_offset_seconds?: number | null
          reported_role?: string | null
          reporter_role?: string | null
          room_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_report_contexts_call"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "call_history"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_report_contexts_ended_by"
            columns: ["ended_by"]
            isOneToOne: false
            referencedRelation: "public_user_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_report_contexts_ended_by"
            columns: ["ended_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_report_contexts_ended_by"
            columns: ["ended_by"]
            isOneToOne: false
            referencedRelation: "users_with_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_report_contexts_report"
            columns: ["report_id"]
            isOneToOne: true
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          admin_notes: string | null
          created_at: string
          id: string
          reason: string
          reported_user_id: string
          reporter_user_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          reason: string
          reported_user_id: string
          reporter_user_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          reason?: string
          reported_user_id?: string
          reporter_user_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_reports_reported"
            columns: ["reported_user_id"]
            isOneToOne: false
            referencedRelation: "public_user_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_reports_reported"
            columns: ["reported_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_reports_reported"
            columns: ["reported_user_id"]
            isOneToOne: false
            referencedRelation: "users_with_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_reports_reporter"
            columns: ["reporter_user_id"]
            isOneToOne: false
            referencedRelation: "public_user_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_reports_reporter"
            columns: ["reporter_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_reports_reporter"
            columns: ["reporter_user_id"]
            isOneToOne: false
            referencedRelation: "users_with_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_reports_reviewed_by"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "public_user_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_reports_reviewed_by"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_reports_reviewed_by"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users_with_details"
            referencedColumns: ["id"]
          },
        ]
      }
      streak_exp_bonuses: {
        Row: {
          bonus_multiplier: number
          created_at: string
          id: string
          max_streak: number
          min_streak: number
          updated_at: string
        }
        Insert: {
          bonus_multiplier?: number
          created_at?: string
          id?: string
          max_streak: number
          min_streak: number
          updated_at?: string
        }
        Update: {
          bonus_multiplier?: number
          created_at?: string
          id?: string
          max_streak?: number
          min_streak?: number
          updated_at?: string
        }
        Relationships: []
      }
      user_details: {
        Row: {
          bio: string | null
          created_at: string
          date_of_birth: string | null
          gender: string | null
          id: string
          interest_tags: string[] | null
          languages: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bio?: string | null
          created_at?: string
          date_of_birth?: string | null
          gender?: string | null
          id?: string
          interest_tags?: string[] | null
          languages?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bio?: string | null
          created_at?: string
          date_of_birth?: string | null
          gender?: string | null
          id?: string
          interest_tags?: string[] | null
          languages?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_user_details_user"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "public_user_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_details_user"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_details_user"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users_with_details"
            referencedColumns: ["id"]
          },
        ]
      }
      user_favorite_limits: {
        Row: {
          daily_limit: number
          date: string
          updated_at: string | null
          used_count: number
          user_id: string
        }
        Insert: {
          daily_limit?: number
          date: string
          updated_at?: string | null
          used_count?: number
          user_id: string
        }
        Update: {
          daily_limit?: number
          date?: string
          updated_at?: string | null
          used_count?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_favorite_limits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_user_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_favorite_limits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_favorite_limits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_with_details"
            referencedColumns: ["id"]
          },
        ]
      }
      user_favorites: {
        Row: {
          created_at: string | null
          favorite_user_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          favorite_user_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          favorite_user_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_favorites_favorite_user_id_fkey"
            columns: ["favorite_user_id"]
            isOneToOne: false
            referencedRelation: "public_user_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_favorites_favorite_user_id_fkey"
            columns: ["favorite_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_favorites_favorite_user_id_fkey"
            columns: ["favorite_user_id"]
            isOneToOne: false
            referencedRelation: "users_with_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_user_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_with_details"
            referencedColumns: ["id"]
          },
        ]
      }
      user_level_rewards: {
        Row: {
          granted_at: string
          id: string
          level_reward_id: string
          user_id: string
        }
        Insert: {
          granted_at?: string
          id?: string
          level_reward_id: string
          user_id: string
        }
        Update: {
          granted_at?: string
          id?: string
          level_reward_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_user_level_rewards_reward"
            columns: ["level_reward_id"]
            isOneToOne: false
            referencedRelation: "level_rewards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_level_rewards_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_user_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_level_rewards_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_level_rewards_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_with_details"
            referencedColumns: ["id"]
          },
        ]
      }
      user_levels: {
        Row: {
          created_at: string
          id: string
          total_exp_seconds: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          total_exp_seconds?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          total_exp_seconds?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_user_levels_user"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "public_user_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_levels_user"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_levels_user"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users_with_details"
            referencedColumns: ["id"]
          },
        ]
      }
      user_settings: {
        Row: {
          created_at: string
          default_disable_camera: boolean
          default_mute_mic: boolean
          id: string
          notification_preferences: Json | null
          notification_sound_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          default_disable_camera?: boolean
          default_mute_mic?: boolean
          id?: string
          notification_preferences?: Json | null
          notification_sound_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          default_disable_camera?: boolean
          default_mute_mic?: boolean
          id?: string
          notification_preferences?: Json | null
          notification_sound_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_user_settings_user"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "public_user_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_settings_user"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_settings_user"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users_with_details"
            referencedColumns: ["id"]
          },
        ]
      }
      user_streak_days: {
        Row: {
          created_at: string
          date: string
          id: string
          is_valid: boolean
          total_call_seconds: number
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          is_valid?: boolean
          total_call_seconds?: number
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          is_valid?: boolean
          total_call_seconds?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_user_streak_days_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_user_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_streak_days_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_streak_days_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_with_details"
            referencedColumns: ["id"]
          },
        ]
      }
      user_streak_freeze_grants: {
        Row: {
          granted_at: string
          level_feature_unlock_id: string
          user_id: string
        }
        Insert: {
          granted_at?: string
          level_feature_unlock_id: string
          user_id: string
        }
        Update: {
          granted_at?: string
          level_feature_unlock_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_user_streak_freeze_grants_unlock"
            columns: ["level_feature_unlock_id"]
            isOneToOne: false
            referencedRelation: "level_feature_unlocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_streak_freeze_grants_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_user_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_streak_freeze_grants_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_streak_freeze_grants_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_with_details"
            referencedColumns: ["id"]
          },
        ]
      }
      user_streak_freeze_inventory: {
        Row: {
          available_count: number
          total_used: number
          updated_at: string
          user_id: string
        }
        Insert: {
          available_count?: number
          total_used?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          available_count?: number
          total_used?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_user_streak_freeze_inventory_user"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "public_user_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_streak_freeze_inventory_user"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_streak_freeze_inventory_user"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users_with_details"
            referencedColumns: ["id"]
          },
        ]
      }
      user_streaks: {
        Row: {
          current_streak: number
          id: string
          last_continuation_used_freeze: boolean
          last_valid_date: string | null
          longest_streak: number
          updated_at: string
          user_id: string
        }
        Insert: {
          current_streak?: number
          id?: string
          last_continuation_used_freeze?: boolean
          last_valid_date?: string | null
          longest_streak?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          current_streak?: number
          id?: string
          last_continuation_used_freeze?: boolean
          last_valid_date?: string | null
          longest_streak?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_user_streaks_user"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "public_user_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_streaks_user"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_streaks_user"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users_with_details"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          allow: boolean
          avatar_url: string | null
          clerk_user_id: string
          country: string | null
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          allow?: boolean
          avatar_url?: string | null
          clerk_user_id: string
          country?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          allow?: boolean
          avatar_url?: string | null
          clerk_user_id?: string
          country?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      visitors: {
        Row: {
          first_visit: string
          id: string
          ip: string
          last_visit: string
          visit_count: number
        }
        Insert: {
          first_visit?: string
          id?: string
          ip: string
          last_visit?: string
          visit_count?: number
        }
        Update: {
          first_visit?: string
          id?: string
          ip?: string
          last_visit?: string
          visit_count?: number
        }
        Relationships: []
      }
    }
    Views: {
      changelogs_with_creator: {
        Row: {
          created_at: string | null
          created_by: Json | null
          id: string | null
          is_published: boolean | null
          order: number | null
          release_date: string | null
          s3_key: string | null
          title: string | null
          updated_at: string | null
          version: string | null
        }
        Relationships: []
      }
      public_user_info: {
        Row: {
          avatar_url: string | null
          bio: string | null
          date_of_birth: string | null
          first_name: string | null
          gender: string | null
          id: string | null
          interest_tags: Json | null
          last_name: string | null
        }
        Relationships: []
      }
      user_details_expanded: {
        Row: {
          bio: string | null
          created_at: string | null
          date_of_birth: string | null
          gender: string | null
          id: string | null
          interest_tags: Json | null
          languages: string[] | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          bio?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          gender?: string | null
          id?: string | null
          interest_tags?: never
          languages?: string[] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          bio?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          gender?: string | null
          id?: string | null
          interest_tags?: never
          languages?: string[] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_user_details_user"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "public_user_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_details_user"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_details_user"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users_with_details"
            referencedColumns: ["id"]
          },
        ]
      }
      user_favorites_with_stats: {
        Row: {
          avatar_url: string | null
          average_duration: number | null
          clerk_user_id: string | null
          country: string | null
          created_at: string | null
          email: string | null
          favorite_user_id: string | null
          first_name: string | null
          id: string | null
          last_name: string | null
          match_count: number | null
          total_duration: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_favorites_favorite_user_id_fkey"
            columns: ["favorite_user_id"]
            isOneToOne: false
            referencedRelation: "public_user_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_favorites_favorite_user_id_fkey"
            columns: ["favorite_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_favorites_favorite_user_id_fkey"
            columns: ["favorite_user_id"]
            isOneToOne: false
            referencedRelation: "users_with_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_user_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_with_details"
            referencedColumns: ["id"]
          },
        ]
      }
      user_settings_v: {
        Row: {
          clerk_user_id: string | null
          created_at: string | null
          default_disable_camera: boolean | null
          default_mute_mic: boolean | null
          id: string | null
          notification_preferences: Json | null
          notification_sound_enabled: boolean | null
          updated_at: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_user_settings_user"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "public_user_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_settings_user"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_settings_user"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users_with_details"
            referencedColumns: ["id"]
          },
        ]
      }
      users_with_details: {
        Row: {
          allow: boolean | null
          avatar_url: string | null
          bio: string | null
          clerk_user_id: string | null
          country: string | null
          date_of_birth: string | null
          details_created_at: string | null
          details_id: string | null
          details_updated_at: string | null
          email: string | null
          first_name: string | null
          gender: string | null
          id: string | null
          interest_tags: Json | null
          languages: string[] | null
          last_name: string | null
          role: Database["public"]["Enums"]["user_role"] | null
          user_created_at: string | null
          user_updated_at: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      increment_user_exp: {
        Args: { p_seconds: number; p_user_id: string }
        Returns: undefined
      }
      increment_visitor: { Args: { ip: string }; Returns: undefined }
      page_views_timeseries: {
        Args: { days: number }
        Returns: {
          day: string
          views: number
        }[]
      }
      prepare_streak_freeze: {
        Args: { p_gap_date: string; p_user_id: string }
        Returns: undefined
      }
      update_user_streak_summary: {
        Args: { p_date: string; p_is_valid: boolean; p_user_id: string }
        Returns: undefined
      }
      upsert_user_streak_day: {
        Args: {
          p_date: string
          p_total_call_seconds: number
          p_user_id: string
        }
        Returns: {
          current_streak: number
          first_time_valid: boolean
        }[]
      }
      visitors_timeseries: {
        Args: { days: number }
        Returns: {
          day: string
          visitors: number
        }[]
      }
    }
    Enums: {
      user_role: "admin" | "member"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      user_role: ["admin", "member"],
    },
  },
} as const
