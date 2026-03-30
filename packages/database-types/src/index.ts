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
      admin_config: {
        Row: {
          key: string
          value: Json | null
        }
        Insert: {
          key: string
          value?: Json | null
        }
        Update: {
          key?: string
          value?: Json | null
        }
        Relationships: []
      }
      broadcast_history: {
        Row: {
          created_at: string
          created_by_user_id: string
          id: string
          message: string
          title: string | null
        }
        Insert: {
          created_at?: string
          created_by_user_id: string
          id?: string
          message: string
          title?: string | null
        }
        Update: {
          created_at?: string
          created_by_user_id?: string
          id?: string
          message?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "broadcast_history_created_by_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "admin_users_unified"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "broadcast_history_created_by_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "public_user_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broadcast_history_created_by_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broadcast_history_created_by_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "users_with_details"
            referencedColumns: ["id"]
          },
        ]
      }
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
            referencedRelation: "admin_users_unified"
            referencedColumns: ["user_id"]
          },
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
            referencedRelation: "admin_users_unified"
            referencedColumns: ["user_id"]
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
      economy_config: {
        Row: {
          key: string
          value_json: Json
        }
        Insert: {
          key: string
          value_json: Json
        }
        Update: {
          key?: string
          value_json?: Json
        }
        Relationships: []
      }
      economy_health_reports: {
        Row: {
          actions_taken: Json
          created_at: string
          date: string
          health_status: Database["public"]["Enums"]["economy_health_status"]
          id: string
          metrics_snapshot: Json
        }
        Insert: {
          actions_taken?: Json
          created_at?: string
          date: string
          health_status: Database["public"]["Enums"]["economy_health_status"]
          id?: string
          metrics_snapshot?: Json
        }
        Update: {
          actions_taken?: Json
          created_at?: string
          date?: string
          health_status?: Database["public"]["Enums"]["economy_health_status"]
          id?: string
          metrics_snapshot?: Json
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
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          payload: Json
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          payload?: Json
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          payload?: Json
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_users_unified"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "notifications_user_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_user_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_with_details"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_users_unified"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "push_subscriptions_user_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_user_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_subscriptions_user_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_subscriptions_user_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_with_details"
            referencedColumns: ["id"]
          },
        ]
      }
      report_ai_summaries: {
        Row: {
          created_at: string
          error_message: string | null
          model: string | null
          prompt_version: string | null
          raw_json: Json | null
          report_id: string
          severity: string | null
          status: string
          suggested_action: string | null
          summary: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          model?: string | null
          prompt_version?: string | null
          raw_json?: Json | null
          report_id: string
          severity?: string | null
          status?: string
          suggested_action?: string | null
          summary?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          model?: string | null
          prompt_version?: string | null
          raw_json?: Json | null
          report_id?: string
          severity?: string | null
          status?: string
          suggested_action?: string | null
          summary?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_ai_summaries_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: true
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "admin_users_unified"
            referencedColumns: ["user_id"]
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
            referencedRelation: "admin_users_unified"
            referencedColumns: ["user_id"]
          },
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
            referencedRelation: "admin_users_unified"
            referencedColumns: ["user_id"]
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
            referencedRelation: "admin_users_unified"
            referencedColumns: ["user_id"]
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
      user_blocks: {
        Row: {
          blocked_user_id: string
          blocker_user_id: string
          created_at: string
          id: string
        }
        Insert: {
          blocked_user_id: string
          blocker_user_id: string
          created_at?: string
          id?: string
        }
        Update: {
          blocked_user_id?: string
          blocker_user_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_blocks_blocked_fkey"
            columns: ["blocked_user_id"]
            isOneToOne: false
            referencedRelation: "admin_users_unified"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_blocks_blocked_fkey"
            columns: ["blocked_user_id"]
            isOneToOne: false
            referencedRelation: "public_user_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_blocks_blocked_fkey"
            columns: ["blocked_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_blocks_blocked_fkey"
            columns: ["blocked_user_id"]
            isOneToOne: false
            referencedRelation: "users_with_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_blocks_blocker_fkey"
            columns: ["blocker_user_id"]
            isOneToOne: false
            referencedRelation: "admin_users_unified"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_blocks_blocker_fkey"
            columns: ["blocker_user_id"]
            isOneToOne: false
            referencedRelation: "public_user_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_blocks_blocker_fkey"
            columns: ["blocker_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_blocks_blocker_fkey"
            columns: ["blocker_user_id"]
            isOneToOne: false
            referencedRelation: "users_with_details"
            referencedColumns: ["id"]
          },
        ]
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
          timezone: string | null
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
          timezone?: string | null
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
          timezone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_user_details_user"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "admin_users_unified"
            referencedColumns: ["user_id"]
          },
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
      user_embeddings: {
        Row: {
          created_at: string
          embedding: string | null
          id: string
          model_name: string | null
          source_hash: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          embedding?: string | null
          id?: string
          model_name?: string | null
          source_hash?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          embedding?: string | null
          id?: string
          model_name?: string | null
          source_hash?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_user_embeddings_user"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "admin_users_unified"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "fk_user_embeddings_user"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "public_user_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_embeddings_user"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_embeddings_user"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users_with_details"
            referencedColumns: ["id"]
          },
        ]
      }
      user_exp_daily: {
        Row: {
          created_at: string
          date: string
          exp_seconds: number
          id: string
          milestone_1800_claimed: boolean
          milestone_3600_claimed: boolean
          milestone_600_claimed: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          exp_seconds?: number
          id?: string
          milestone_1800_claimed?: boolean
          milestone_3600_claimed?: boolean
          milestone_600_claimed?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          exp_seconds?: number
          id?: string
          milestone_1800_claimed?: boolean
          milestone_3600_claimed?: boolean
          milestone_600_claimed?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
            referencedRelation: "admin_users_unified"
            referencedColumns: ["user_id"]
          },
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
            referencedRelation: "admin_users_unified"
            referencedColumns: ["user_id"]
          },
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
            referencedRelation: "admin_users_unified"
            referencedColumns: ["user_id"]
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
            referencedRelation: "admin_users_unified"
            referencedColumns: ["user_id"]
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
            referencedRelation: "admin_users_unified"
            referencedColumns: ["user_id"]
          },
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
            referencedRelation: "admin_users_unified"
            referencedColumns: ["user_id"]
          },
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
            referencedRelation: "admin_users_unified"
            referencedColumns: ["user_id"]
          },
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
            referencedRelation: "admin_users_unified"
            referencedColumns: ["user_id"]
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
            referencedRelation: "admin_users_unified"
            referencedColumns: ["user_id"]
          },
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
            referencedRelation: "admin_users_unified"
            referencedColumns: ["user_id"]
          },
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
          avatar_url: string | null
          clerk_user_id: string
          country: string | null
          created_at: string
          deleted: boolean | null
          deleted_at: string | null
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          lifetime_exp: number
          prestige_points: number
          prestige_rank: Database["public"]["Enums"]["prestige_rank"]
          prestige_tier: number | null
          role: Database["public"]["Enums"]["user_role"]
          total_prestiges: number
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          clerk_user_id: string
          country?: string | null
          created_at?: string
          deleted?: boolean | null
          deleted_at?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          lifetime_exp?: number
          prestige_points?: number
          prestige_rank?: Database["public"]["Enums"]["prestige_rank"]
          prestige_tier?: number | null
          role?: Database["public"]["Enums"]["user_role"]
          total_prestiges?: number
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          clerk_user_id?: string
          country?: string | null
          created_at?: string
          deleted?: boolean | null
          deleted_at?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          lifetime_exp?: number
          prestige_points?: number
          prestige_rank?: Database["public"]["Enums"]["prestige_rank"]
          prestige_tier?: number | null
          role?: Database["public"]["Enums"]["user_role"]
          total_prestiges?: number
          updated_at?: string
        }
        Relationships: []
      }
      wrappers_fdw_stats: {
        Row: {
          bytes_in: number | null
          bytes_out: number | null
          create_times: number | null
          created_at: string
          fdw_name: string
          metadata: Json | null
          rows_in: number | null
          rows_out: number | null
          updated_at: string
        }
        Insert: {
          bytes_in?: number | null
          bytes_out?: number | null
          create_times?: number | null
          created_at?: string
          fdw_name: string
          metadata?: Json | null
          rows_in?: number | null
          rows_out?: number | null
          updated_at?: string
        }
        Update: {
          bytes_in?: number | null
          bytes_out?: number | null
          create_times?: number | null
          created_at?: string
          fdw_name?: string
          metadata?: Json | null
          rows_in?: number | null
          rows_out?: number | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      admin_users_unified: {
        Row: {
          avatar_url: string | null
          bio: string | null
          clerk_user_id: string | null
          country: string | null
          created_at: string | null
          date_of_birth: string | null
          deleted: boolean | null
          deleted_at: string | null
          email: string | null
          embedding_model: string | null
          embedding_source_hash: string | null
          embedding_updated_at: string | null
          first_name: string | null
          gender: string | null
          interest_tags: string[] | null
          last_name: string | null
          lifetime_exp: number | null
          prestige_points: number | null
          prestige_rank: Database["public"]["Enums"]["prestige_rank"] | null
          prestige_tier: number | null
          role: Database["public"]["Enums"]["user_role"] | null
          total_exp_seconds: number | null
          total_prestiges: number | null
          updated_at: string | null
          user_id: string | null
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
            referencedRelation: "admin_users_unified"
            referencedColumns: ["user_id"]
          },
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
            referencedRelation: "admin_users_unified"
            referencedColumns: ["user_id"]
          },
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
            referencedRelation: "admin_users_unified"
            referencedColumns: ["user_id"]
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
            referencedRelation: "admin_users_unified"
            referencedColumns: ["user_id"]
          },
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
      airtable_fdw_handler: { Args: never; Returns: unknown }
      airtable_fdw_meta: {
        Args: never
        Returns: {
          author: string
          name: string
          version: string
          website: string
        }[]
      }
      airtable_fdw_validator: {
        Args: { catalog: unknown; options: string[] }
        Returns: undefined
      }
      auth0_fdw_handler: { Args: never; Returns: unknown }
      auth0_fdw_meta: {
        Args: never
        Returns: {
          author: string
          name: string
          version: string
          website: string
        }[]
      }
      auth0_fdw_validator: {
        Args: { catalog: unknown; options: string[] }
        Returns: undefined
      }
      big_query_fdw_handler: { Args: never; Returns: unknown }
      big_query_fdw_meta: {
        Args: never
        Returns: {
          author: string
          name: string
          version: string
          website: string
        }[]
      }
      big_query_fdw_validator: {
        Args: { catalog: unknown; options: string[] }
        Returns: undefined
      }
      click_house_fdw_handler: { Args: never; Returns: unknown }
      click_house_fdw_meta: {
        Args: never
        Returns: {
          author: string
          name: string
          version: string
          website: string
        }[]
      }
      click_house_fdw_validator: {
        Args: { catalog: unknown; options: string[] }
        Returns: undefined
      }
      cognito_fdw_handler: { Args: never; Returns: unknown }
      cognito_fdw_meta: {
        Args: never
        Returns: {
          author: string
          name: string
          version: string
          website: string
        }[]
      }
      cognito_fdw_validator: {
        Args: { catalog: unknown; options: string[] }
        Returns: undefined
      }
      duckdb_fdw_handler: { Args: never; Returns: unknown }
      duckdb_fdw_meta: {
        Args: never
        Returns: {
          author: string
          name: string
          version: string
          website: string
        }[]
      }
      duckdb_fdw_validator: {
        Args: { catalog: unknown; options: string[] }
        Returns: undefined
      }
      find_similar_users_by_embedding: {
        Args: {
          p_exclude_user_ids?: string[]
          p_limit?: number
          p_threshold?: number
          p_user_id: string
        }
        Returns: {
          similarity_score: number
          user_id: string
        }[]
      }
      firebase_fdw_handler: { Args: never; Returns: unknown }
      firebase_fdw_meta: {
        Args: never
        Returns: {
          author: string
          name: string
          version: string
          website: string
        }[]
      }
      firebase_fdw_validator: {
        Args: { catalog: unknown; options: string[] }
        Returns: undefined
      }
      fn_exp_to_level: {
        Args: { p_total_exp_seconds: number }
        Returns: number
      }
      grant_user_exp: {
        Args: {
          p_date: string
          p_exp_seconds: number
          p_reason: string
          p_user_id: string
        }
        Returns: {
          exp_earned: number
          milestone_1800_claimed: boolean
          milestone_3600_claimed: boolean
          milestone_600_claimed: boolean
        }[]
      }
      grant_user_exp_daily_only: {
        Args: { p_date: string; p_exp_seconds: number; p_user_id: string }
        Returns: {
          exp_earned: number
          milestone_1800_claimed: boolean
          milestone_3600_claimed: boolean
          milestone_600_claimed: boolean
        }[]
      }
      grant_user_exp_total: {
        Args: {
          p_date: string
          p_exp_seconds: number
          p_reason: string
          p_user_id: string
        }
        Returns: undefined
      }
      hello_world_fdw_handler: { Args: never; Returns: unknown }
      hello_world_fdw_meta: {
        Args: never
        Returns: {
          author: string
          name: string
          version: string
          website: string
        }[]
      }
      hello_world_fdw_validator: {
        Args: { catalog: unknown; options: string[] }
        Returns: undefined
      }
      iceberg_fdw_handler: { Args: never; Returns: unknown }
      iceberg_fdw_meta: {
        Args: never
        Returns: {
          author: string
          name: string
          version: string
          website: string
        }[]
      }
      iceberg_fdw_validator: {
        Args: { catalog: unknown; options: string[] }
        Returns: undefined
      }
      increment_daily_exp_with_milestones: {
        Args: { p_date: string; p_exp_seconds: number; p_user_id: string }
        Returns: {
          exp_earned: number
          milestone_1800_claimed: boolean
          milestone_3600_claimed: boolean
          milestone_600_claimed: boolean
        }[]
      }
      increment_user_exp: {
        Args: { p_seconds: number; p_user_id: string }
        Returns: undefined
      }
      increment_user_exp_daily: {
        Args: { p_date: string; p_exp_seconds: number; p_user_id: string }
        Returns: undefined
      }
      logflare_fdw_handler: { Args: never; Returns: unknown }
      logflare_fdw_meta: {
        Args: never
        Returns: {
          author: string
          name: string
          version: string
          website: string
        }[]
      }
      logflare_fdw_validator: {
        Args: { catalog: unknown; options: string[] }
        Returns: undefined
      }
      metadata_filter: { Args: { _left: Json; _right: Json }; Returns: boolean }
      mssql_fdw_handler: { Args: never; Returns: unknown }
      mssql_fdw_meta: {
        Args: never
        Returns: {
          author: string
          name: string
          version: string
          website: string
        }[]
      }
      mssql_fdw_validator: {
        Args: { catalog: unknown; options: string[] }
        Returns: undefined
      }
      prepare_streak_freeze: {
        Args: { p_gap_date: string; p_user_id: string }
        Returns: undefined
      }
      redis_fdw_handler: { Args: never; Returns: unknown }
      redis_fdw_meta: {
        Args: never
        Returns: {
          author: string
          name: string
          version: string
          website: string
        }[]
      }
      redis_fdw_validator: {
        Args: { catalog: unknown; options: string[] }
        Returns: undefined
      }
      s3_fdw_handler: { Args: never; Returns: unknown }
      s3_fdw_meta: {
        Args: never
        Returns: {
          author: string
          name: string
          version: string
          website: string
        }[]
      }
      s3_fdw_validator: {
        Args: { catalog: unknown; options: string[] }
        Returns: undefined
      }
      s3_vectors_fdw_handler: { Args: never; Returns: unknown }
      s3_vectors_fdw_meta: {
        Args: never
        Returns: {
          author: string
          name: string
          version: string
          website: string
        }[]
      }
      s3_vectors_fdw_validator: {
        Args: { catalog: unknown; options: string[] }
        Returns: undefined
      }
      s3vec_distance: { Args: { s3vec: unknown }; Returns: number }
      s3vec_in: { Args: { input: unknown }; Returns: unknown }
      s3vec_knn: { Args: { _left: unknown; _right: unknown }; Returns: boolean }
      s3vec_out: { Args: { input: unknown }; Returns: unknown }
      stripe_fdw_handler: { Args: never; Returns: unknown }
      stripe_fdw_meta: {
        Args: never
        Returns: {
          author: string
          name: string
          version: string
          website: string
        }[]
      }
      stripe_fdw_validator: {
        Args: { catalog: unknown; options: string[] }
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
      wasm_fdw_handler: { Args: never; Returns: unknown }
      wasm_fdw_meta: {
        Args: never
        Returns: {
          author: string
          name: string
          version: string
          website: string
        }[]
      }
      wasm_fdw_validator: {
        Args: { catalog: unknown; options: string[] }
        Returns: undefined
      }
    }
    Enums: {
      economy_health_status:
        | "stable"
        | "inflation_risk"
        | "deflation_risk"
        | "whale_dominance"
      prestige_rank:
        | "plastic"
        | "bronze"
        | "silver"
        | "gold"
        | "platinum"
        | "diamond"
        | "immortal"
        | "ascendant"
        | "eternal"
        | "mythic"
        | "celestial"
        | "transcendent"
      user_role: "admin" | "member" | "superadmin"
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
      economy_health_status: [
        "stable",
        "inflation_risk",
        "deflation_risk",
        "whale_dominance",
      ],
      prestige_rank: [
        "plastic",
        "bronze",
        "silver",
        "gold",
        "platinum",
        "diamond",
        "immortal",
        "ascendant",
        "eternal",
        "mythic",
        "celestial",
        "transcendent",
      ],
      user_role: ["admin", "member", "superadmin"],
    },
  },
} as const
