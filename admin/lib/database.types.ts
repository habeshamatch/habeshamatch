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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      admins: {
        Row: {
          user_id: string
        }
        Insert: {
          user_id: string
        }
        Update: {
          user_id?: string
        }
        Relationships: []
      }
      app_config: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          counts_toward_limit: boolean
          created_at: string
          id: string
          initiated_by: string | null
          last_message_at: string | null
          origin: Database["public"]["Enums"]["convo_origin_t"]
          user_a: string
          user_b: string
        }
        Insert: {
          counts_toward_limit?: boolean
          created_at?: string
          id?: string
          initiated_by?: string | null
          last_message_at?: string | null
          origin: Database["public"]["Enums"]["convo_origin_t"]
          user_a: string
          user_b: string
        }
        Update: {
          counts_toward_limit?: boolean
          created_at?: string
          id?: string
          initiated_by?: string | null
          last_message_at?: string | null
          origin?: Database["public"]["Enums"]["convo_origin_t"]
          user_a?: string
          user_b?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_initiated_by_fkey"
            columns: ["initiated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_user_a_fkey"
            columns: ["user_a"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_user_b_fkey"
            columns: ["user_b"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_picks: {
        Row: {
          pick_date: string
          pick_user_id: string
          user_id: string
        }
        Insert: {
          pick_date?: string
          pick_user_id: string
          user_id: string
        }
        Update: {
          pick_date?: string
          pick_user_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_picks_pick_user_id_fkey"
            columns: ["pick_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_picks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      local_tier_countries: {
        Row: {
          active: boolean
          country_code: string
          country_name: string
          phone_prefix: string
        }
        Insert: {
          active?: boolean
          country_code: string
          country_name: string
          phone_prefix: string
        }
        Update: {
          active?: boolean
          country_code?: string
          country_name?: string
          phone_prefix?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          body: string
          conversation_id: string
          created_at: string
          id: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          body: string
          conversation_id: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          body?: string
          conversation_id?: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      moderation_actions: {
        Row: {
          action: string
          admin_id: string | null
          created_at: string
          id: number
          reason: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          admin_id?: string | null
          created_at?: string
          id?: number
          reason?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          admin_id?: string | null
          created_at?: string
          id?: number
          reason?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "moderation_actions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      photos: {
        Row: {
          created_at: string
          id: string
          moderation_status: Database["public"]["Enums"]["moderation_status_t"]
          position: number
          storage_path: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          moderation_status?: Database["public"]["Enums"]["moderation_status_t"]
          position: number
          storage_path: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          moderation_status?: Database["public"]["Enums"]["moderation_status_t"]
          position?: number
          storage_path?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "photos_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      preference_core: {
        Row: {
          age_max: number
          age_min: number
          seeking_gender: Database["public"]["Enums"]["gender_t"]
          user_id: string
        }
        Insert: {
          age_max: number
          age_min: number
          seeking_gender: Database["public"]["Enums"]["gender_t"]
          user_id: string
        }
        Update: {
          age_max?: number
          age_min?: number
          seeking_gender?: Database["public"]["Enums"]["gender_t"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "preference_core_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      preference_items: {
        Row: {
          attribute: Database["public"]["Enums"]["pref_attr_t"]
          id: number
          kind: Database["public"]["Enums"]["pref_kind_t"]
          user_id: string
          value: Json
        }
        Insert: {
          attribute: Database["public"]["Enums"]["pref_attr_t"]
          id?: number
          kind: Database["public"]["Enums"]["pref_kind_t"]
          user_id: string
          value: Json
        }
        Update: {
          attribute?: Database["public"]["Enums"]["pref_attr_t"]
          id?: number
          kind?: Database["public"]["Enums"]["pref_kind_t"]
          user_id?: string
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "preference_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_status: Database["public"]["Enums"]["account_status_t"]
          bio: string | null
          created_at: string
          current_city: string | null
          current_country_code: string | null
          date_of_birth: string
          display_name: string
          drinking: Database["public"]["Enums"]["drinking_t"] | null
          education_level:
            | Database["public"]["Enums"]["education_level_t"]
            | null
          exercise: Database["public"]["Enums"]["exercise_t"] | null
          gender: Database["public"]["Enums"]["gender_t"]
          has_children: Database["public"]["Enums"]["has_children_t"] | null
          height_cm: number | null
          id: string
          income_range: Database["public"]["Enums"]["income_range_t"] | null
          interests: string[]
          is_photo_verified: boolean
          is_premium: boolean
          languages: string[]
          last_active_at: string
          marital_status: Database["public"]["Enums"]["marital_status_t"] | null
          occupation: string | null
          open_to_long_distance: boolean
          open_to_relocating: boolean
          origin: Database["public"]["Enums"]["origin_t"]
          premium_expires_at: string | null
          relationship_intent: Database["public"]["Enums"]["intent_t"]
          religion: Database["public"]["Enums"]["religion_t"]
          residence_changed_at: string
          residence_country_code: string
          smoking: Database["public"]["Enums"]["smoking_t"] | null
          wants_children: Database["public"]["Enums"]["wants_children_t"] | null
        }
        Insert: {
          account_status?: Database["public"]["Enums"]["account_status_t"]
          bio?: string | null
          created_at?: string
          current_city?: string | null
          current_country_code?: string | null
          date_of_birth: string
          display_name: string
          drinking?: Database["public"]["Enums"]["drinking_t"] | null
          education_level?:
            | Database["public"]["Enums"]["education_level_t"]
            | null
          exercise?: Database["public"]["Enums"]["exercise_t"] | null
          gender: Database["public"]["Enums"]["gender_t"]
          has_children?: Database["public"]["Enums"]["has_children_t"] | null
          height_cm?: number | null
          id: string
          income_range?: Database["public"]["Enums"]["income_range_t"] | null
          interests?: string[]
          is_photo_verified?: boolean
          is_premium?: boolean
          languages?: string[]
          last_active_at?: string
          marital_status?:
            | Database["public"]["Enums"]["marital_status_t"]
            | null
          occupation?: string | null
          open_to_long_distance?: boolean
          open_to_relocating?: boolean
          origin: Database["public"]["Enums"]["origin_t"]
          premium_expires_at?: string | null
          relationship_intent: Database["public"]["Enums"]["intent_t"]
          religion: Database["public"]["Enums"]["religion_t"]
          residence_changed_at?: string
          residence_country_code: string
          smoking?: Database["public"]["Enums"]["smoking_t"] | null
          wants_children?:
            | Database["public"]["Enums"]["wants_children_t"]
            | null
        }
        Update: {
          account_status?: Database["public"]["Enums"]["account_status_t"]
          bio?: string | null
          created_at?: string
          current_city?: string | null
          current_country_code?: string | null
          date_of_birth?: string
          display_name?: string
          drinking?: Database["public"]["Enums"]["drinking_t"] | null
          education_level?:
            | Database["public"]["Enums"]["education_level_t"]
            | null
          exercise?: Database["public"]["Enums"]["exercise_t"] | null
          gender?: Database["public"]["Enums"]["gender_t"]
          has_children?: Database["public"]["Enums"]["has_children_t"] | null
          height_cm?: number | null
          id?: string
          income_range?: Database["public"]["Enums"]["income_range_t"] | null
          interests?: string[]
          is_photo_verified?: boolean
          is_premium?: boolean
          languages?: string[]
          last_active_at?: string
          marital_status?:
            | Database["public"]["Enums"]["marital_status_t"]
            | null
          occupation?: string | null
          open_to_long_distance?: boolean
          open_to_relocating?: boolean
          origin?: Database["public"]["Enums"]["origin_t"]
          premium_expires_at?: string | null
          relationship_intent?: Database["public"]["Enums"]["intent_t"]
          religion?: Database["public"]["Enums"]["religion_t"]
          residence_changed_at?: string
          residence_country_code?: string
          smoking?: Database["public"]["Enums"]["smoking_t"] | null
          wants_children?:
            | Database["public"]["Enums"]["wants_children_t"]
            | null
        }
        Relationships: []
      }
      push_tokens: {
        Row: {
          created_at: string
          platform: string
          token: string
          user_id: string
        }
        Insert: {
          created_at?: string
          platform: string
          token: string
          user_id: string
        }
        Update: {
          created_at?: string
          platform?: string
          token?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          action_taken: string | null
          category: Database["public"]["Enums"]["report_category_t"]
          created_at: string
          details: string | null
          id: string
          reported_id: string
          reporter_id: string
          resolved_at: string | null
          resolved_by: string | null
          status: Database["public"]["Enums"]["report_status_t"]
        }
        Insert: {
          action_taken?: string | null
          category: Database["public"]["Enums"]["report_category_t"]
          created_at?: string
          details?: string | null
          id?: string
          reported_id: string
          reporter_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["report_status_t"]
        }
        Update: {
          action_taken?: string | null
          category?: Database["public"]["Enums"]["report_category_t"]
          created_at?: string
          details?: string | null
          id?: string
          reported_id?: string
          reporter_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["report_status_t"]
        }
        Relationships: [
          {
            foreignKeyName: "reports_reported_id_fkey"
            columns: ["reported_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      suggested_dismissals: {
        Row: {
          created_at: string
          target_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          target_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          target_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "suggested_dismissals_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suggested_dismissals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      swipes: {
        Row: {
          created_at: string
          direction: Database["public"]["Enums"]["swipe_dir_t"]
          swiper_id: string
          target_id: string
        }
        Insert: {
          created_at?: string
          direction: Database["public"]["Enums"]["swipe_dir_t"]
          swiper_id: string
          target_id: string
        }
        Update: {
          created_at?: string
          direction?: Database["public"]["Enums"]["swipe_dir_t"]
          swiper_id?: string
          target_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "swipes_swiper_id_fkey"
            columns: ["swiper_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "swipes_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      verification_requests: {
        Row: {
          created_at: string
          id: string
          pose: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          selfie_path: string
          status: Database["public"]["Enums"]["moderation_status_t"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          pose?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          selfie_path: string
          status?: Database["public"]["Enums"]["moderation_status_t"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          pose?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          selfie_path?: string
          status?: Database["public"]["Enums"]["moderation_status_t"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "verification_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_search_users: {
        Args: { p_limit?: number; p_query?: string }
        Returns: {
          account_status: Database["public"]["Enums"]["account_status_t"]
          age: number
          created_at: string
          display_name: string
          email: string
          gender: Database["public"]["Enums"]["gender_t"]
          is_photo_verified: boolean
          last_active_at: string
          open_reports: number
          phone: string
          residence: string
          tier: Database["public"]["Enums"]["tier_t"]
          user_id: string
        }[]
      }
      admin_stats: { Args: never; Returns: Json }
      age_years: { Args: { dob: string }; Returns: number }
      cfg_num: { Args: { p_key: string }; Returns: number }
      dismiss_suggestion: { Args: { p_target: string }; Returns: undefined }
      generate_daily_picks: { Args: never; Returns: number }
      generate_daily_picks_for: { Args: { p_user: string }; Returns: number }
      get_daily_picks: {
        Args: never
        Returns: Database["public"]["CompositeTypes"]["profile_card"][]
        SetofOptions: {
          from: "*"
          to: "profile_card"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_for_you_new_counts: { Args: { p_since?: string }; Returns: Json }
      get_likes_received: {
        Args: { p_limit?: number }
        Returns: Database["public"]["CompositeTypes"]["profile_card"][]
        SetofOptions: {
          from: "*"
          to: "profile_card"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_likes_received_count: { Args: never; Returns: number }
      get_meets_my_criteria: {
        Args: { p_countries?: string[]; p_limit?: number; p_offset?: number }
        Returns: Database["public"]["CompositeTypes"]["profile_card"][]
        SetofOptions: {
          from: "*"
          to: "profile_card"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_meets_my_criteria_countries: {
        Args: never
        Returns: {
          country_code: string
          people: number
        }[]
      }
      get_my_blocked_users: {
        Args: never
        Returns: {
          blocked_at: string
          display_name: string
          user_id: string
        }[]
      }
      get_my_conversations: {
        Args: never
        Returns: {
          conversation_id: string
          last_message: string
          last_message_at: string
          origin: Database["public"]["Enums"]["convo_origin_t"]
          other_has_written: boolean
          other_name: string
          other_photo_path: string
          other_user_id: string
          other_verified: boolean
          unread_count: number
        }[]
      }
      get_my_limits: { Args: never; Returns: Json }
      get_my_tier: {
        Args: never
        Returns: Database["public"]["Enums"]["tier_t"]
      }
      get_profile: {
        Args: { p_user: string }
        Returns: Database["public"]["CompositeTypes"]["profile_card"]
        SetofOptions: {
          from: "*"
          to: "profile_card"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_suggested: {
        Args: { p_countries?: string[]; p_limit?: number; p_offset?: number }
        Returns: Database["public"]["CompositeTypes"]["profile_card"][]
        SetofOptions: {
          from: "*"
          to: "profile_card"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_suggested_countries: {
        Args: never
        Returns: {
          country_code: string
          people: number
        }[]
      }
      get_suggested_count: { Args: { p_since?: string }; Returns: number }
      get_swipe_deck: {
        Args: { p_limit?: number }
        Returns: Database["public"]["CompositeTypes"]["profile_card"][]
        SetofOptions: {
          from: "*"
          to: "profile_card"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      is_admin: { Args: never; Returns: boolean }
      is_approved_member: { Args: { p_user: string }; Returns: boolean }
      is_blocked_between: { Args: { a: string; b: string }; Returns: boolean }
      is_discoverable: {
        Args: { p_cand: string; p_viewer: string }
        Returns: boolean
      }
      is_end_user: { Args: never; Returns: boolean }
      is_suggested_for: {
        Args: { p_cand: string; p_viewer: string }
        Returns: boolean
      }
      mark_conversation_read: {
        Args: { p_conversation: string }
        Returns: undefined
      }
      meets_hard: {
        Args: { p_cand: string; p_viewer: string }
        Returns: boolean
      }
      member_since: { Args: { p_user: string }; Returns: string }
      photo_thumb_path: { Args: { p_storage_path: string }; Returns: string }
      pref_item_met: {
        Args: {
          c: Database["public"]["Tables"]["profiles"]["Row"]
          p_attr: Database["public"]["Enums"]["pref_attr_t"]
          p_value: Json
        }
        Returns: boolean
      }
      primary_photo_path: { Args: { p_user: string }; Returns: string }
      record_swipe: {
        Args: {
          p_direction: Database["public"]["Enums"]["swipe_dir_t"]
          p_target: string
        }
        Returns: Json
      }
      reorder_my_photos: { Args: { p_photo_ids: string[] }; Returns: undefined }
      require_active_user: { Args: never; Returns: string }
      require_approved_user: { Args: never; Returns: string }
      residence_type: { Args: { p_country: string }; Returns: string }
      soft_score: {
        Args: { p_cand: string; p_viewer: string }
        Returns: number
      }
      start_conversation: { Args: { p_target: string }; Returns: string }
      swipe_eligible: {
        Args: { p_cand: string; p_viewer: string }
        Returns: boolean
      }
      to_card: {
        Args: {
          c: Database["public"]["Tables"]["profiles"]["Row"]
          p_score: number
        }
        Returns: Database["public"]["CompositeTypes"]["profile_card"]
        SetofOptions: {
          from: "*"
          to: "profile_card"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      undo_dismiss_suggestion: {
        Args: { p_target: string }
        Returns: undefined
      }
      undo_last_swipe: { Args: never; Returns: string }
      user_tier: {
        Args: { p_user: string }
        Returns: Database["public"]["Enums"]["tier_t"]
      }
    }
    Enums: {
      account_status_t: "active" | "suspended" | "banned" | "deleted"
      convo_origin_t: "criteria" | "suggested" | "swipe_match"
      drinking_t: "never" | "rarely" | "socially" | "regularly"
      education_level_t:
        | "high_school"
        | "vocational"
        | "bachelors"
        | "masters"
        | "doctorate"
        | "prefer_not_to_say"
      exercise_t: "daily" | "often" | "sometimes" | "rarely"
      gender_t: "male" | "female"
      has_children_t: "no" | "yes_live_with_me" | "yes_not_with_me"
      income_range_t:
        | "under_10k"
        | "10k_25k"
        | "25k_50k"
        | "50k_75k"
        | "75k_100k"
        | "100k_150k"
        | "150k_250k"
        | "over_250k"
        | "prefer_not_to_say"
      intent_t: "marriage" | "serious_relationship" | "getting_to_know"
      marital_status_t: "never_married" | "divorced" | "widowed"
      moderation_status_t: "pending" | "approved" | "rejected"
      origin_t: "eritrea" | "ethiopia"
      pref_attr_t:
        | "religion"
        | "origin"
        | "languages"
        | "relationship_intent"
        | "height"
        | "residence_type"
        | "country"
        | "education"
        | "income"
        | "marital_status"
        | "has_children"
        | "wants_children"
        | "smoking"
        | "drinking"
        | "exercise"
      pref_kind_t: "hard" | "soft"
      religion_t:
        | "orthodox"
        | "muslim"
        | "catholic"
        | "protestant"
        | "other"
        | "prefer_not_to_say"
      report_category_t:
        | "fake_profile"
        | "scam"
        | "harassment"
        | "spam"
        | "inappropriate_photos"
        | "underage"
        | "other"
      report_status_t: "open" | "actioned" | "dismissed"
      smoking_t: "never" | "socially" | "regularly" | "trying_to_quit"
      swipe_dir_t: "like" | "pass"
      tier_t: "free" | "local" | "premium"
      wants_children_t: "yes" | "no" | "open" | "not_sure"
    }
    CompositeTypes: {
      profile_card: {
        id: string | null
        display_name: string | null
        age: number | null
        gender: Database["public"]["Enums"]["gender_t"] | null
        height_cm: number | null
        origin: Database["public"]["Enums"]["origin_t"] | null
        current_city: string | null
        residence_country_code: string | null
        residence_type: string | null
        religion: Database["public"]["Enums"]["religion_t"] | null
        languages: string[] | null
        relationship_intent: Database["public"]["Enums"]["intent_t"] | null
        bio: string | null
        open_to_relocating: boolean | null
        open_to_long_distance: boolean | null
        is_photo_verified: boolean | null
        primary_photo_path: string | null
        match_score: number | null
        marital_status: Database["public"]["Enums"]["marital_status_t"] | null
        has_children: Database["public"]["Enums"]["has_children_t"] | null
        wants_children: Database["public"]["Enums"]["wants_children_t"] | null
        smoking: Database["public"]["Enums"]["smoking_t"] | null
        drinking: Database["public"]["Enums"]["drinking_t"] | null
        exercise: Database["public"]["Enums"]["exercise_t"] | null
        occupation: string | null
        interests: string[] | null
      }
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      account_status_t: ["active", "suspended", "banned", "deleted"],
      convo_origin_t: ["criteria", "suggested", "swipe_match"],
      drinking_t: ["never", "rarely", "socially", "regularly"],
      education_level_t: [
        "high_school",
        "vocational",
        "bachelors",
        "masters",
        "doctorate",
        "prefer_not_to_say",
      ],
      exercise_t: ["daily", "often", "sometimes", "rarely"],
      gender_t: ["male", "female"],
      has_children_t: ["no", "yes_live_with_me", "yes_not_with_me"],
      income_range_t: [
        "under_10k",
        "10k_25k",
        "25k_50k",
        "50k_75k",
        "75k_100k",
        "100k_150k",
        "150k_250k",
        "over_250k",
        "prefer_not_to_say",
      ],
      intent_t: ["marriage", "serious_relationship", "getting_to_know"],
      marital_status_t: ["never_married", "divorced", "widowed"],
      moderation_status_t: ["pending", "approved", "rejected"],
      origin_t: ["eritrea", "ethiopia"],
      pref_attr_t: [
        "religion",
        "origin",
        "languages",
        "relationship_intent",
        "height",
        "residence_type",
        "country",
        "education",
        "income",
        "marital_status",
        "has_children",
        "wants_children",
        "smoking",
        "drinking",
        "exercise",
      ],
      pref_kind_t: ["hard", "soft"],
      religion_t: [
        "orthodox",
        "muslim",
        "catholic",
        "protestant",
        "other",
        "prefer_not_to_say",
      ],
      report_category_t: [
        "fake_profile",
        "scam",
        "harassment",
        "spam",
        "inappropriate_photos",
        "underage",
        "other",
      ],
      report_status_t: ["open", "actioned", "dismissed"],
      smoking_t: ["never", "socially", "regularly", "trying_to_quit"],
      swipe_dir_t: ["like", "pass"],
      tier_t: ["free", "local", "premium"],
      wants_children_t: ["yes", "no", "open", "not_sure"],
    },
  },
} as const
