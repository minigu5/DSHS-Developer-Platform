// Supabase Database 타입.
// docs/03-supabase-schema.sql + 04-supabase-alter.sql + 05-supabase-alter-2.sql 을 반영.
//
// 추후 Supabase CLI 로 자동 생성한 결과로 교체 가능:
//   npx supabase gen types typescript --project-id <id> --schema public > src/lib/types.ts

import type { PosterArtOrder, PosterMessage, PosterVersion } from '@/lib/posters/config';

export type UserContact = {
  type: 'github' | 'email' | 'instagram' | 'discord' | 'website';
  value: string;
};

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type GuideRevisionKind = 'seed' | 'edit' | 'revert' | 'sync';

// 도메인 마련하기(서브도메인) — supabase/migrations/20261025100000_subdomains.sql
export type SubdomainStatus = 'reserved' | 'pending' | 'active' | 'broken' | 'released' | 'revoked';
export type SubdomainHost =
  | 'vercel'
  | 'netlify'
  | 'cloudflare-pages'
  | 'github-pages'
  | 'gitlab-pages'
  | 'render'
  | 'railway'
  | 'cloudflare-workers'
  | 'firebase'
  // ChatGPT Sites 바로가기 — supabase/migrations/20261105130000_subdomains_chatgpt_sites.sql
  | 'chatgpt-sites'
  // 대곽나루 학생 서버 — supabase/migrations/20261101110000_subdomains_naru.sql
  | 'naru';

export type PosterArtJobStatus = 'queued' | 'working' | 'done' | 'failed' | 'canceled' | 'expired';

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          nickname: string | null;
          bio: string | null;
          avatar_url: string | null;
          interests: string[];
          contacts: UserContact[];
          created_at: string;
          // 닉네임·소개가 바뀐 시각(트리거가 채움) — 관리자 대시보드 최신 글용
          profile_updated_at: string | null;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          nickname?: string | null;
          bio?: string | null;
          avatar_url?: string | null;
          interests?: string[];
          contacts?: UserContact[];
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          nickname?: string | null;
          bio?: string | null;
          avatar_url?: string | null;
          interests?: string[];
          contacts?: UserContact[];
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'users_id_fkey';
            columns: ['id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      projects: {
        Row: {
          id: string;
          author_id: string;
          title: string;
          description: string;
          types: string[];
          platforms: string[];
          source_type: string;
          repo_url: string | null;
          license: string | null;
          features: string[];
          visibility: 'public' | 'private';
          created_at: string;
          updated_at: string;
          // 04 alter
          short_description: string | null;
          url: string | null;
          author_role: 'individual' | 'team' | 'anonymous' | null;
          team_name: string | null;
          team_icon_url: string | null;
          team_members: string[] | null;
          icon_url: string | null;
          icon_fit: Json | null;
          icon_type: 'link' | 'auto' | null;
          license_features: string[] | null;
          license_custom: string | null;
          // 05 alter
          allowed_users: string[];
          feature_custom: string | null;
          click_count: number;
          // 20 readme sync
          readme_sync: boolean;
          readme_etag: string | null;
          readme_synced_at: string | null;
          // 익명이면 null, 아니면 author_id (자동 계산). 사용자 키는 author_id 를 못 읽으므로 화면은 이 칸을 쓴다
          public_author_id: string | null;
          // 걸린 포스터(migration 20261107120000) — 사용자 키는 poster_image_url·poster_is_ai 만 읽힘, 바꾸기는 서비스 키만
          poster_id: string | null;
          poster_image_url: string | null;
          poster_is_ai: boolean;
          poster_hung_at: string | null;
        };
        Insert: {
          id?: string;
          author_id: string;
          title: string;
          description: string;
          types: string[];
          platforms?: string[];
          source_type: string;
          repo_url?: string | null;
          license?: string | null;
          features?: string[];
          visibility: 'public' | 'private';
          created_at?: string;
          updated_at?: string;
          short_description?: string | null;
          url?: string | null;
          author_role?: 'individual' | 'team' | 'anonymous' | null;
          team_name?: string | null;
          team_icon_url?: string | null;
          team_members?: string[] | null;
          icon_url?: string | null;
          icon_fit?: Json | null;
          icon_type?: 'link' | 'auto' | null;
          license_features?: string[] | null;
          license_custom?: string | null;
          allowed_users?: string[];
          feature_custom?: string | null;
          readme_sync?: boolean;
          readme_etag?: string | null;
          readme_synced_at?: string | null;
        };
        Update: {
          id?: string;
          author_id?: string;
          title?: string;
          description?: string;
          types?: string[];
          platforms?: string[];
          source_type?: string;
          repo_url?: string | null;
          license?: string | null;
          features?: string[];
          visibility?: 'public' | 'private';
          created_at?: string;
          updated_at?: string;
          short_description?: string | null;
          url?: string | null;
          author_role?: 'individual' | 'team' | 'anonymous' | null;
          team_name?: string | null;
          team_icon_url?: string | null;
          team_members?: string[] | null;
          icon_url?: string | null;
          icon_fit?: Json | null;
          icon_type?: 'link' | 'auto' | null;
          license_features?: string[] | null;
          license_custom?: string | null;
          allowed_users?: string[];
          feature_custom?: string | null;
          click_count?: number;
          readme_sync?: boolean;
          readme_etag?: string | null;
          readme_synced_at?: string | null;
          poster_id?: string | null;
          poster_image_url?: string | null;
          poster_is_ai?: boolean;
          poster_hung_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'projects_author_id_fkey';
            columns: ['author_id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'projects_public_author_id_fkey';
            columns: ['public_author_id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      project_comments: {
        Row: {
          id: string;
          project_id: string;
          /** 사용자 키로는 못 읽는다 — 화면은 public_user_id */
          user_id: string;
          content: string;
          created_at: string;
          is_author: boolean;
          public_user_id: string | null;
        };
        Insert: {
          id?: string;
          project_id: string;
          user_id: string;
          content: string;
          created_at?: string;
        };
        Update: {
          content?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'project_comments_project_id_fkey';
            columns: ['project_id'];
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'project_comments_public_user_id_fkey';
            columns: ['public_user_id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      project_hearts: {
        Row: {
          project_id: string;
          user_id: string;
          created_at: string;
          by_anonymous_owner: boolean;
        };
        Insert: {
          project_id: string;
          user_id: string;
        };
        Update: Record<string, never>;
        Relationships: [
          {
            foreignKeyName: 'project_hearts_project_id_fkey';
            columns: ['project_id'];
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'project_hearts_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      tips: {
        Row: {
          id: string;
          author_id: string;
          title: string;
          summary: string | null;
          content: string;
          cover_url: string | null;
          tags: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          author_id: string;
          title: string;
          summary?: string | null;
          content: string;
          cover_url?: string | null;
          tags?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          author_id?: string;
          title?: string;
          summary?: string | null;
          content?: string;
          cover_url?: string | null;
          tags?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'tips_author_id_fkey';
            columns: ['author_id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      tip_likes: {
        Row: {
          tip_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          tip_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: {
          tip_id?: string;
          user_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'tip_likes_tip_id_fkey';
            columns: ['tip_id'];
            referencedRelation: 'tips';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'tip_likes_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      tip_comments: {
        Row: {
          id: string;
          tip_id: string;
          user_id: string;
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          tip_id: string;
          user_id: string;
          content: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          tip_id?: string;
          user_id?: string;
          content?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'tip_comments_tip_id_fkey';
            columns: ['tip_id'];
            referencedRelation: 'tips';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'tip_comments_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      announcements: {
        Row: {
          id: string;
          author_id: string;
          title: string;
          category: string;
          content: string;
          is_pinned: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          author_id: string;
          title: string;
          category: string;
          content: string;
          is_pinned?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          author_id?: string;
          title?: string;
          category?: string;
          content?: string;
          is_pinned?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'announcements_author_id_fkey';
            columns: ['author_id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      ideas: {
        Row: {
          id: string;
          author_id: string;
          title: string;
          type: string;
          category: string;
          content: string;
          status: 'open' | 'in_progress' | 'done';
          linked_project_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          author_id: string;
          title: string;
          type: string;
          category: string;
          content: string;
          status?: 'open' | 'in_progress' | 'done';
          linked_project_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          author_id?: string;
          title?: string;
          type?: string;
          category?: string;
          content?: string;
          status?: 'open' | 'in_progress' | 'done';
          linked_project_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'ideas_author_id_fkey';
            columns: ['author_id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'ideas_linked_project_id_fkey';
            columns: ['linked_project_id'];
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
        ];
      };
      project_clicks: {
        Row: {
          id: string;
          project_id: string;
          user_id: string | null;
          ip_hash: string | null;
          clicked_date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          user_id?: string | null;
          ip_hash?: string | null;
          clicked_date?: string;
          created_at?: string;
        };
        Update: Record<string, never>;
        Relationships: [
          {
            foreignKeyName: 'project_clicks_project_id_fkey';
            columns: ['project_id'];
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
        ];
      };
      guide_revisions: {
        Row: {
          id: string;
          doc_key: string;
          rev_no: number;
          kind: GuideRevisionKind;
          title: string;
          steps: Json;
          extra: Json | null;
          summary: string;
          base_rev: number | null;
          revert_of: number | null;
          stats: Json;
          author_id: string | null;
          author_email: string;
          created_at: string;
        };
        // 직접 쓰기는 RLS 로 막혀 있고 save_guide_revision() (service_role) 로만 저장한다.
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [
          {
            foreignKeyName: 'guide_revisions_author_id_fkey';
            columns: ['author_id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      // AI 포스터 만들기 — 서비스 키 전용(RLS 켜고 정책 없음). migration 20261106150000
      project_posters: {
        Row: {
          id: string;
          project_id: string;
          created_by: string | null;
          html: string | null;
          art_url: string | null;
          art_order: Json | null;
          versions: Json;
          messages: Json;
          band_tone: 'light' | 'dark';
          band_position: 'top' | 'bottom';
          art_job_id: string | null; // 기다리는 학교 Mac 그림 일감(migration 20261106190000)
          ai_job_id: string | null; // 큐에서 돌고 있는 만들기·고치기·다시 그리기 일감(migration 20261107130000)
          kind: 'ai' | 'upload'; // 직접 올린 그림은 image_url(migration 20261107120000)
          image_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          project_id: string;
          created_by?: string | null;
          html?: string | null;
          art_url?: string | null;
          art_order?: Json | null;
          versions?: Json;
          messages?: Json;
          band_tone?: 'light' | 'dark';
          band_position?: 'top' | 'bottom';
          kind?: 'ai' | 'upload';
          image_url?: string | null;
        };
        Update: {
          html?: string | null;
          art_url?: string | null;
          art_order?: Json | null;
          versions?: Json;
          messages?: Json;
          band_tone?: 'light' | 'dark';
          band_position?: 'top' | 'bottom';
          art_job_id?: string | null;
          ai_job_id?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      // 만들기·고치기·다시 그리기 큐 일감 — 서비스 키 전용(RLS 켜고 정책 없음). migration 20261107130000
      poster_ai_jobs: {
        Row: {
          id: string;
          kind: 'ask' | 'redraw';
          poster_id: string;
          user_id: string;
          input: Json;
          holds: ('text' | 'art' | 'art_local')[]; // 아직 돌려줄 수 있는 횟수 — 막힘 정리가 한 번만 돌려준다
          status: 'queued' | 'working' | 'done' | 'failed' | 'expired';
          result: Json | null;
          usage_released_at: string | null;
          created_at: string;
          started_at: string | null;
          finished_at: string | null;
        };
        Insert: { kind: 'ask' | 'redraw'; poster_id: string; user_id: string; input?: Json; holds?: ('text' | 'art' | 'art_local')[] };
        Update: {
          status?: 'queued' | 'working' | 'done' | 'failed' | 'expired';
          holds?: ('text' | 'art' | 'art_local')[];
          result?: Json | null;
          usage_released_at?: string | null;
          started_at?: string | null;
          finished_at?: string | null;
        };
        Relationships: [];
      };
      project_poster_days: {
        Row: { project_id: string; day: string };
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [];
      };
      ai_usage: {
        Row: { kind: 'text' | 'art' | 'art_local'; user_id: string; day: string; count: number };
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [];
      };
      // 학교 Mac mini 그림 — 둘 다 서비스 키 전용(RLS 켜고 정책 없음), Mac 은 RPC 로만. migration 20261106190000
      poster_art_workers: {
        Row: { id: string; name: string; token_hash: string; created_at: string; last_seen_at: string | null; revoked_at: string | null };
        Insert: { name: string; token_hash: string };
        Update: { revoked_at?: string | null };
        Relationships: [];
      };
      poster_art_jobs: {
        Row: {
          id: string;
          kind: 'art';
          poster_id: string;
          user_id: string;
          prompt: string;
          width: number;
          height: number;
          status: PosterArtJobStatus;
          worker_id: string | null;
          job_secret_hash: string | null;
          claimed_at: string | null;
          lease_until: string | null;
          attempts: number;
          result_url: string | null;
          error: string | null;
          created_at: string;
          finished_at: string | null;
          usage_released_at: string | null; // art_local 횟수를 돌려준 시각(한 번만, migration 20261106200000)
        };
        Insert: { poster_id: string; user_id: string; prompt: string; width: number; height: number };
        Update: { status?: PosterArtJobStatus; result_url?: string | null; error?: string | null; finished_at?: string | null; usage_released_at?: string | null };
        Relationships: [];
      };
      // 관리자 대시보드 — 셋 다 서비스 키 전용(RLS 켜고 정책 없음). migration 20261106100000
      user_bans: {
        Row: {
          id: string;
          user_id: string | null;
          email_hash: string;
          until: string | null; // null = 무제한
          reason: string | null;
          from_anonymous: boolean;
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          user_id?: string | null;
          email_hash: string;
          until?: string | null;
          reason?: string | null;
          from_anonymous?: boolean;
          created_by?: string | null;
        };
        Update: { until?: string | null; reason?: string | null };
        Relationships: [];
      };
      admin_dismissals: {
        Row: { kind: string; item_id: string; dismissed_at: string };
        Insert: { kind: string; item_id: string; dismissed_at?: string };
        Update: { dismissed_at?: string };
        Relationships: [];
      };
      project_locks: {
        Row: { project_id: string; reason: string | null; created_by: string | null; created_at: string };
        Insert: { project_id: string; reason?: string | null; created_by?: string | null; created_at?: string };
        Update: { reason?: string | null };
        Relationships: [];
      };
      admin_actions: {
        Row: {
          id: number;
          action: 'delete' | 'ban' | 'unban' | 'private' | 'dismiss' | 'revert' | 'unhang' | 'lock' | 'unlock';
          target_kind: string | null;
          target_id: string | null;
          target_user_id: string | null;
          detail: Json | null;
          created_at: string;
        };
        Insert: {
          action: 'delete' | 'ban' | 'unban' | 'private' | 'dismiss' | 'revert' | 'unhang' | 'lock' | 'unlock';
          target_kind?: string | null;
          target_id?: string | null;
          target_user_id?: string | null;
          detail?: Json | null;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      privacy_consents: {
        Row: {
          id: string;
          user_id: string;
          policy_version: string;
          consented_at: string;
        };
        // 직접 쓰기는 RLS 로 막혀 있고 서버 액션(service_role)으로만 저장한다.
        Insert: {
          user_id: string;
          policy_version: string;
        };
        Update: Record<string, never>;
        Relationships: [
          {
            foreignKeyName: 'privacy_consents_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      subdomains: {
        Row: {
          id: string;
          name: string;
          project_id: string | null;
          owner_id: string;
          host: SubdomainHost | null;
          target: string | null;
          txt_records: Json;
          cf_record_ids: string[];
          status: SubdomainStatus;
          verify_token: string;
          ever_active: boolean;
          broken_since: string | null;
          checked_at: string | null;
          released_reason: string | null;
          revoked_reason: string | null;
          revoked_by: string | null;
          /** "방문 주소 바꾸기" 전 프로젝트 url — 반납·회수 때 되돌린다 */
          previous_url: string | null;
          /** ② 소유 확인에 쓴 학생 사이트 원래 주소(https://…/) — 20261026120000_subdomains_verify_first.sql */
          site_url: string | null;
          site_host: SubdomainHost | null;
          /** 원래 주소에서 토큰이 확인된 시각. 없으면 ③ 연결 불가 */
          site_verified_at: string | null;
          /** 마지막으로 호스트에 연결한 시각 — 연결 안 된 주소의 7일 반납을 여기서부터 센다 */
          connected_at: string | null;
          /** host 가 naru 일 때 묶인 대곽나루 서버 id(8자리 16진수) */
          naru_server_id: string | null;
          created_at: string;
          updated_at: string;
        };
        // 직접 쓰기는 RLS 로 막혀 있고 subdomain_* 함수(service_role)로만 바꾼다.
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [
          {
            foreignKeyName: 'subdomains_project_id_fkey';
            columns: ['project_id'];
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'subdomains_owner_id_fkey';
            columns: ['owner_id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      subdomain_reserved: {
        Row: { name: string };
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      reserve_ai_usage: {
        Args: { p_kind: 'text' | 'art' | 'art_local'; p_user: string; p_user_limit: number; p_site_limit: number };
        Returns: 'ok' | 'user_limit' | 'site_limit';
      };
      release_ai_usage: {
        Args: { p_kind: 'text' | 'art' | 'art_local'; p_user: string };
        Returns: undefined;
      };
      claim_poster_art_job: {
        Args: { p_token: string };
        Returns: { id: string; prompt: string; width: number; height: number; job_secret: string }[];
      };
      poster_art_ping: {
        Args: { p_token: string };
        Returns: undefined;
      };
      is_banned: {
        Args: { p_uid: string };
        Returns: boolean;
      };
      my_ban: {
        Args: Record<string, never>;
        Returns: { until: string | null; unlimited: boolean }[];
      };
      email_hash: {
        Args: { p_email: string };
        Returns: string;
      };
      // 관리자 대시보드 읽기(service_role 전용, migration 20261106110000). jsonb 모양은 src/lib/admin/read.ts 에서 좁힌다
      admin_recent_content: {
        Args: { p_kinds?: string[] | null; p_before?: string | null; p_limit?: number };
        Returns: Json;
      };
      admin_bursts: {
        Args: { p_since?: string };
        Returns: Json;
      };
      admin_guide_shrinks: {
        Args: { p_since?: string };
        Returns: Json;
      };
      admin_bans: {
        Args: Record<string, never>;
        Returns: Json;
      };
      admin_site_stats: {
        Args: Record<string, never>;
        Returns: Json;
      };
      my_project_ids: {
        Args: Record<string, never>;
        Returns: string[];
      };
      domain_showcase: {
        Args: { p_limit?: number };
        Returns: Json;
      };
      project_live_domain: {
        Args: { p_project_id: string };
        Returns: { name: string; host: string }[];
      };
      save_guide_revision: {
        Args: {
          p_author_id: string;
          p_doc_key: string;
          p_base_rev: number;
          p_kind: Exclude<GuideRevisionKind, 'seed'>;
          p_title: string;
          p_steps: Json;
          p_extra: Json | null;
          p_summary: string;
          p_revert_of: number | null;
          p_stats: Json;
          p_seed: Json | null;
        };
        Returns: number;
      };
      withdraw_account: {
        Args: { p_user_id: string };
        Returns: string[];
      };
      subdomain_reserve: {
        Args: { p_user: string; p_project: string; p_name: string };
        Returns: string;
      };
      subdomain_connect: {
        Args: {
          p_user: string;
          p_id: string;
          p_host: SubdomainHost;
          p_target: string;
          p_txt: Json;
          p_record_ids: string[];
        };
        Returns: undefined;
      };
      // 대곽나루 서버에 연결(확인 코드 없이 바로 active) — 서버 액션이 허브에서 주인·터널 대상을 받은 뒤 부른다
      subdomain_connect_naru: {
        Args: { p_user: string; p_id: string; p_server_id: string; p_target: string; p_record_ids: string[] };
        Returns: undefined;
      };
      // 대곽나루 행의 사라진 DNS 레코드 id 를 다시 기록(host='naru'·live 만, 서비스 전용)
      subdomain_set_naru_records: {
        Args: { p_id: string; p_record_ids: string[] };
        Returns: undefined;
      };
      subdomain_record_check: {
        Args: { p_id: string; p_ok: boolean; p_now: string };
        Returns: SubdomainStatus;
      };
      // 바로가기 호스트: 소유 확인 뒤 만든 Cloudflare id(AAAA id, 'redirect:<목록 항목 id>') 기록
      subdomain_set_redirect_records: {
        Args: { p_id: string; p_record_ids: string[] };
        Returns: undefined;
      };
      subdomain_set_site: {
        Args: { p_user: string; p_id: string; p_site_url: string; p_site_host: SubdomainHost };
        Returns: undefined;
      };
      subdomain_verify_site: {
        Args: { p_user: string; p_id: string; p_site_url: string };
        Returns: undefined;
      };
      subdomain_set_placeholder_records: {
        Args: { p_id: string; p_record_ids: string[] };
        Returns: undefined;
      };
      subdomain_release: {
        // p_actor null = 서비스 경로(매일 점검·프로젝트 삭제)
        Args: { p_actor: string | null; p_id: string; p_reason: string };
        Returns: string[];
      };
      subdomain_revoke: {
        Args: { p_admin: string; p_id: string; p_reason: string };
        Returns: string[];
      };
      subdomain_unblock: {
        Args: { p_admin: string; p_id: string };
        Returns: undefined;
      };
      subdomain_set_url: {
        Args: { p_user: string; p_id: string };
        Returns: undefined;
      };
      track_project_click: {
        Args: {
          p_project_id: string;
          p_user_id: string | null;
          p_ip_hash: string | null;
        };
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

// 자주 쓰는 단축 alias
export type UserRow = Database['public']['Tables']['users']['Row'];
export type PosterArtJobRow = Database['public']['Tables']['poster_art_jobs']['Row'];
export type ProjectRow = Database['public']['Tables']['projects']['Row'];
export type ProjectInsert = Database['public']['Tables']['projects']['Insert'];
export type ProjectUpdate = Database['public']['Tables']['projects']['Update'];
export type CommentRow = Database['public']['Tables']['project_comments']['Row'];
export type HeartRow = Database['public']['Tables']['project_hearts']['Row'];
export type TipRow = Database['public']['Tables']['tips']['Row'];
export type TipInsert = Database['public']['Tables']['tips']['Insert'];
export type TipUpdate = Database['public']['Tables']['tips']['Update'];
export type TipCommentRow = Database['public']['Tables']['tip_comments']['Row'];
export type AnnouncementRow = Database['public']['Tables']['announcements']['Row'];
export type AnnouncementInsert = Database['public']['Tables']['announcements']['Insert'];
export type AnnouncementUpdate = Database['public']['Tables']['announcements']['Update'];
export type IdeaRow = Database['public']['Tables']['ideas']['Row'];
export type IdeaInsert = Database['public']['Tables']['ideas']['Insert'];
export type IdeaUpdate = Database['public']['Tables']['ideas']['Update'];
export type GuideRevisionRow = Database['public']['Tables']['guide_revisions']['Row'];

// AI 포스터 — art_order·versions·messages 는 jsonb 라 화면·서버에선 이 모양으로 읽는다(src/lib/posters/config.ts).
export type ProjectPosterRow = Omit<Database['public']['Tables']['project_posters']['Row'], 'art_order' | 'versions' | 'messages'> & {
  art_order: PosterArtOrder | null;
  versions: PosterVersion[];
  messages: PosterMessage[];
};
