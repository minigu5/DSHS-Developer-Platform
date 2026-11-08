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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      admin_actions: {
        Row: {
          action: string
          created_at: string
          detail: Json | null
          id: number
          target_id: string | null
          target_kind: string | null
          target_user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          detail?: Json | null
          id?: number
          target_id?: string | null
          target_kind?: string | null
          target_user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          detail?: Json | null
          id?: number
          target_id?: string | null
          target_kind?: string | null
          target_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_actions_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_dismissals: {
        Row: {
          dismissed_at: string
          item_id: string
          kind: string
        }
        Insert: {
          dismissed_at?: string
          item_id: string
          kind: string
        }
        Update: {
          dismissed_at?: string
          item_id?: string
          kind?: string
        }
        Relationships: []
      }
      ai_usage: {
        Row: {
          count: number
          day: string
          kind: string
          user_id: string
        }
        Insert: {
          count?: number
          day: string
          kind: string
          user_id: string
        }
        Update: {
          count?: number
          day?: string
          kind?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          author_id: string
          category: string
          content: string
          created_at: string
          id: string
          is_pinned: boolean
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          category: string
          content: string
          created_at?: string
          id?: string
          is_pinned?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          category?: string
          content?: string
          created_at?: string
          id?: string
          is_pinned?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      guide_revisions: {
        Row: {
          author_email: string
          author_id: string | null
          base_rev: number | null
          created_at: string
          doc_key: string
          extra: Json | null
          id: string
          kind: string
          rev_no: number
          revert_of: number | null
          stats: Json
          steps: Json
          summary: string
          title: string
        }
        Insert: {
          author_email: string
          author_id?: string | null
          base_rev?: number | null
          created_at?: string
          doc_key: string
          extra?: Json | null
          id?: string
          kind: string
          rev_no: number
          revert_of?: number | null
          stats?: Json
          steps: Json
          summary: string
          title: string
        }
        Update: {
          author_email?: string
          author_id?: string | null
          base_rev?: number | null
          created_at?: string
          doc_key?: string
          extra?: Json | null
          id?: string
          kind?: string
          rev_no?: number
          revert_of?: number | null
          stats?: Json
          steps?: Json
          summary?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "guide_revisions_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ideas: {
        Row: {
          author_id: string
          category: string
          content: string
          created_at: string
          id: string
          linked_project_id: string | null
          status: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          author_id: string
          category: string
          content: string
          created_at?: string
          id?: string
          linked_project_id?: string | null
          status?: string
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          category?: string
          content?: string
          created_at?: string
          id?: string
          linked_project_id?: string | null
          status?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ideas_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ideas_linked_project_id_fkey"
            columns: ["linked_project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      poster_art_jobs: {
        Row: {
          attempts: number
          claimed_at: string | null
          created_at: string
          error: string | null
          finished_at: string | null
          height: number
          id: string
          job_secret_hash: string | null
          kind: string
          lease_until: string | null
          poster_id: string
          prompt: string
          result_url: string | null
          status: string
          user_id: string
          width: number
          worker_id: string | null
        }
        Insert: {
          attempts?: number
          claimed_at?: string | null
          created_at?: string
          error?: string | null
          finished_at?: string | null
          height: number
          id?: string
          job_secret_hash?: string | null
          kind?: string
          lease_until?: string | null
          poster_id: string
          prompt: string
          result_url?: string | null
          status?: string
          user_id: string
          width: number
          worker_id?: string | null
        }
        Update: {
          attempts?: number
          claimed_at?: string | null
          created_at?: string
          error?: string | null
          finished_at?: string | null
          height?: number
          id?: string
          job_secret_hash?: string | null
          kind?: string
          lease_until?: string | null
          poster_id?: string
          prompt?: string
          result_url?: string | null
          status?: string
          user_id?: string
          width?: number
          worker_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "poster_art_jobs_poster_id_fkey"
            columns: ["poster_id"]
            isOneToOne: false
            referencedRelation: "project_posters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poster_art_jobs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poster_art_jobs_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "poster_art_workers"
            referencedColumns: ["id"]
          },
        ]
      }
      poster_art_workers: {
        Row: {
          created_at: string
          id: string
          last_seen_at: string | null
          name: string
          revoked_at: string | null
          token_hash: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_seen_at?: string | null
          name: string
          revoked_at?: string | null
          token_hash: string
        }
        Update: {
          created_at?: string
          id?: string
          last_seen_at?: string | null
          name?: string
          revoked_at?: string | null
          token_hash?: string
        }
        Relationships: []
      }
      privacy_consents: {
        Row: {
          consented_at: string
          id: string
          policy_version: string
          user_id: string
        }
        Insert: {
          consented_at?: string
          id?: string
          policy_version: string
          user_id: string
        }
        Update: {
          consented_at?: string
          id?: string
          policy_version?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "privacy_consents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      project_clicks: {
        Row: {
          clicked_date: string
          created_at: string | null
          id: string
          ip_hash: string | null
          project_id: string
          user_id: string | null
        }
        Insert: {
          clicked_date?: string
          created_at?: string | null
          id?: string
          ip_hash?: string | null
          project_id: string
          user_id?: string | null
        }
        Update: {
          clicked_date?: string
          created_at?: string | null
          id?: string
          ip_hash?: string | null
          project_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_clicks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_clicks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      project_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          is_author: boolean
          project_id: string
          public_user_id: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_author?: boolean
          project_id: string
          public_user_id?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_author?: boolean
          project_id?: string
          public_user_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_comments_public_user_id_fkey"
            columns: ["public_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      project_hearts: {
        Row: {
          by_anonymous_owner: boolean
          created_at: string
          project_id: string
          user_id: string
        }
        Insert: {
          by_anonymous_owner?: boolean
          created_at?: string
          project_id: string
          user_id: string
        }
        Update: {
          by_anonymous_owner?: boolean
          created_at?: string
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_hearts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_hearts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      project_posters: {
        Row: {
          art_job_id: string | null
          art_order: Json | null
          art_url: string | null
          band_position: string
          band_tone: string
          created_at: string
          created_by: string | null
          html: string | null
          id: string
          messages: Json
          project_id: string
          updated_at: string
          versions: Json
        }
        Insert: {
          art_job_id?: string | null
          art_order?: Json | null
          art_url?: string | null
          band_position?: string
          band_tone?: string
          created_at?: string
          created_by?: string | null
          html?: string | null
          id?: string
          messages?: Json
          project_id: string
          updated_at?: string
          versions?: Json
        }
        Update: {
          art_job_id?: string | null
          art_order?: Json | null
          art_url?: string | null
          band_position?: string
          band_tone?: string
          created_at?: string
          created_by?: string | null
          html?: string | null
          id?: string
          messages?: Json
          project_id?: string
          updated_at?: string
          versions?: Json
        }
        Relationships: [
          {
            foreignKeyName: "project_posters_art_job_id_fkey"
            columns: ["art_job_id"]
            isOneToOne: false
            referencedRelation: "poster_art_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_posters_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_posters_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          allowed_users: string[]
          author_id: string
          author_role: string
          click_count: number
          created_at: string
          description: string
          feature_custom: string | null
          features: string[]
          icon_type: string | null
          icon_url: string | null
          id: string
          license: string | null
          license_custom: string | null
          license_features: string[]
          platforms: string[]
          public_author_id: string | null
          readme_etag: string | null
          readme_sync: boolean
          readme_synced_at: string | null
          repo_url: string | null
          short_description: string | null
          source_type: string
          team_members: string[] | null
          team_name: string | null
          title: string
          types: string[]
          updated_at: string
          url: string | null
          visibility: string
        }
        Insert: {
          allowed_users?: string[]
          author_id: string
          author_role?: string
          click_count?: number
          created_at?: string
          description: string
          feature_custom?: string | null
          features?: string[]
          icon_type?: string | null
          icon_url?: string | null
          id?: string
          license?: string | null
          license_custom?: string | null
          license_features?: string[]
          platforms?: string[]
          public_author_id?: string | null
          readme_etag?: string | null
          readme_sync?: boolean
          readme_synced_at?: string | null
          repo_url?: string | null
          short_description?: string | null
          source_type: string
          team_members?: string[] | null
          team_name?: string | null
          title: string
          types?: string[]
          updated_at?: string
          url?: string | null
          visibility: string
        }
        Update: {
          allowed_users?: string[]
          author_id?: string
          author_role?: string
          click_count?: number
          created_at?: string
          description?: string
          feature_custom?: string | null
          features?: string[]
          icon_type?: string | null
          icon_url?: string | null
          id?: string
          license?: string | null
          license_custom?: string | null
          license_features?: string[]
          platforms?: string[]
          public_author_id?: string | null
          readme_etag?: string | null
          readme_sync?: boolean
          readme_synced_at?: string | null
          repo_url?: string | null
          short_description?: string | null
          source_type?: string
          team_members?: string[] | null
          team_name?: string | null
          title?: string
          types?: string[]
          updated_at?: string
          url?: string | null
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_public_author_id_fkey"
            columns: ["public_author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      subdomain_reserved: {
        Row: {
          name: string
        }
        Insert: {
          name: string
        }
        Update: {
          name?: string
        }
        Relationships: []
      }
      subdomains: {
        Row: {
          broken_since: string | null
          cf_record_ids: string[]
          checked_at: string | null
          connected_at: string | null
          created_at: string
          ever_active: boolean
          host: string | null
          id: string
          name: string
          naru_server_id: string | null
          owner_id: string
          previous_url: string | null
          project_id: string | null
          released_reason: string | null
          revoked_by: string | null
          revoked_reason: string | null
          site_host: string | null
          site_url: string | null
          site_verified_at: string | null
          status: string
          target: string | null
          txt_records: Json
          updated_at: string
          verify_token: string
        }
        Insert: {
          broken_since?: string | null
          cf_record_ids?: string[]
          checked_at?: string | null
          connected_at?: string | null
          created_at?: string
          ever_active?: boolean
          host?: string | null
          id?: string
          name: string
          naru_server_id?: string | null
          owner_id: string
          previous_url?: string | null
          project_id?: string | null
          released_reason?: string | null
          revoked_by?: string | null
          revoked_reason?: string | null
          site_host?: string | null
          site_url?: string | null
          site_verified_at?: string | null
          status?: string
          target?: string | null
          txt_records?: Json
          updated_at?: string
          verify_token?: string
        }
        Update: {
          broken_since?: string | null
          cf_record_ids?: string[]
          checked_at?: string | null
          connected_at?: string | null
          created_at?: string
          ever_active?: boolean
          host?: string | null
          id?: string
          name?: string
          naru_server_id?: string | null
          owner_id?: string
          previous_url?: string | null
          project_id?: string | null
          released_reason?: string | null
          revoked_by?: string | null
          revoked_reason?: string | null
          site_host?: string | null
          site_url?: string | null
          site_verified_at?: string | null
          status?: string
          target?: string | null
          txt_records?: Json
          updated_at?: string
          verify_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "subdomains_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subdomains_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subdomains_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tip_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          tip_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          tip_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          tip_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tip_comments_tip_id_fkey"
            columns: ["tip_id"]
            isOneToOne: false
            referencedRelation: "tips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tip_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tip_likes: {
        Row: {
          created_at: string
          tip_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          tip_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          tip_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tip_likes_tip_id_fkey"
            columns: ["tip_id"]
            isOneToOne: false
            referencedRelation: "tips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tip_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tips: {
        Row: {
          author_id: string
          content: string
          cover_url: string | null
          created_at: string
          id: string
          summary: string | null
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          content: string
          cover_url?: string | null
          created_at?: string
          id?: string
          summary?: string | null
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          content?: string
          cover_url?: string | null
          created_at?: string
          id?: string
          summary?: string | null
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tips_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_bans: {
        Row: {
          created_at: string
          created_by: string | null
          email_hash: string
          from_anonymous: boolean
          id: string
          reason: string | null
          until: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email_hash: string
          from_anonymous?: boolean
          id?: string
          reason?: string | null
          until?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email_hash?: string
          from_anonymous?: boolean
          id?: string
          reason?: string | null
          until?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_bans_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_bans_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          bio: string | null
          contacts: Json | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          interests: string[]
          nickname: string | null
          profile_updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          contacts?: Json | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          interests?: string[]
          nickname?: string | null
          profile_updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          contacts?: Json | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          interests?: string[]
          nickname?: string | null
          profile_updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _guide_validate_doc: {
        Args: { p_stats: Json; p_steps: Json; p_title: string }
        Returns: string
      }
      admin_bans: { Args: never; Returns: Json }
      admin_bursts: { Args: { p_since?: string }; Returns: Json }
      admin_content: {
        Args: { p_after: string }
        Returns: {
          anonymous: boolean
          author_id: string
          author_name: string
          body: string
          created_at: string
          href: string
          id: string
          kind: string
          title: string
        }[]
      }
      admin_guide_shrinks: { Args: { p_since?: string }; Returns: Json }
      admin_item_json: {
        Args: {
          p_anonymous: boolean
          p_author_id: string
          p_author_name: string
          p_body: string
          p_created_at: string
          p_href: string
          p_id: string
          p_kind: string
          p_title: string
        }
        Returns: Json
      }
      admin_recent_content: {
        Args: { p_before?: string; p_kinds?: string[]; p_limit?: number }
        Returns: Json
      }
      admin_site_stats: { Args: never; Returns: Json }
      ai_usage_day: { Args: { p_kind: string }; Returns: string }
      claim_poster_art_job: {
        Args: { p_token: string }
        Returns: {
          height: number
          id: string
          job_secret: string
          prompt: string
          width: number
        }[]
      }
      domain_showcase: { Args: { p_limit?: number }; Returns: Json }
      email_hash: { Args: { p_email: string }; Returns: string }
      is_admin: { Args: never; Returns: boolean }
      is_banned: { Args: { p_uid: string }; Returns: boolean }
      my_ban: {
        Args: never
        Returns: {
          unlimited: boolean
          until: string
        }[]
      }
      my_project_ids: { Args: never; Returns: string[] }
      poster_art_ping: { Args: { p_token: string }; Returns: undefined }
      project_live_domain: {
        Args: { p_project_id: string }
        Returns: {
          host: string
          name: string
        }[]
      }
      release_ai_usage: {
        Args: { p_kind: string; p_user: string }
        Returns: undefined
      }
      reserve_ai_usage: {
        Args: {
          p_kind: string
          p_site_limit: number
          p_user: string
          p_user_limit: number
        }
        Returns: string
      }
      save_guide_revision: {
        Args: {
          p_author_id: string
          p_base_rev: number
          p_doc_key: string
          p_extra: Json
          p_kind: string
          p_revert_of: number
          p_seed: Json
          p_stats: Json
          p_steps: Json
          p_summary: string
          p_title: string
        }
        Returns: number
      }
      subdomain_connect: {
        Args: {
          p_host: string
          p_id: string
          p_record_ids: string[]
          p_target: string
          p_txt: Json
          p_user: string
        }
        Returns: undefined
      }
      subdomain_connect_naru: {
        Args: {
          p_id: string
          p_record_ids: string[]
          p_server_id: string
          p_target: string
          p_user: string
        }
        Returns: undefined
      }
      subdomain_is_developer: { Args: { p_user: string }; Returns: boolean }
      subdomain_record_check: {
        Args: { p_id: string; p_now: string; p_ok: boolean }
        Returns: string
      }
      subdomain_release: {
        Args: { p_actor: string; p_id: string; p_reason: string }
        Returns: string[]
      }
      subdomain_reserve: {
        Args: { p_name: string; p_project: string; p_user: string }
        Returns: string
      }
      subdomain_restore_project_url: {
        Args: { p_row: Database["public"]["Tables"]["subdomains"]["Row"] }
        Returns: undefined
      }
      subdomain_revoke: {
        Args: { p_admin: string; p_id: string; p_reason: string }
        Returns: string[]
      }
      subdomain_set_naru_records: {
        Args: { p_id: string; p_record_ids: string[] }
        Returns: undefined
      }
      subdomain_set_placeholder_records: {
        Args: { p_id: string; p_record_ids: string[] }
        Returns: undefined
      }
      subdomain_set_redirect_records: {
        Args: { p_id: string; p_record_ids: string[] }
        Returns: undefined
      }
      subdomain_set_site: {
        Args: {
          p_id: string
          p_site_host: string
          p_site_url: string
          p_user: string
        }
        Returns: undefined
      }
      subdomain_set_url: {
        Args: { p_id: string; p_user: string }
        Returns: undefined
      }
      subdomain_target_bound: { Args: { p_host: string }; Returns: boolean }
      subdomain_target_ok: {
        Args: { p_host: string; p_target: string }
        Returns: boolean
      }
      subdomain_txt_ok: {
        Args: { p_host: string; p_name: string; p_txt: Json }
        Returns: boolean
      }
      subdomain_unblock: {
        Args: { p_admin: string; p_id: string }
        Returns: undefined
      }
      subdomain_verify_site: {
        Args: { p_id: string; p_site_url: string; p_user: string }
        Returns: undefined
      }
      track_project_click: {
        Args: { p_ip_hash?: string; p_project_id: string; p_user_id?: string }
        Returns: boolean
      }
      withdraw_account: { Args: { p_user_id: string }; Returns: string[] }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
