// Supabase Database 타입.
// docs/03-supabase-schema.sql + 04-supabase-alter.sql + 05-supabase-alter-2.sql 을 반영.
//
// 추후 Supabase CLI 로 자동 생성한 결과로 교체 가능:
//   npx supabase gen types typescript --project-id <id> --schema public > src/lib/types.ts

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
  | 'firebase';

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
          team_members: string[] | null;
          icon_url: string | null;
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
          team_members?: string[] | null;
          icon_url?: string | null;
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
          team_members?: string[] | null;
          icon_url?: string | null;
          icon_type?: 'link' | 'auto' | null;
          license_features?: string[] | null;
          license_custom?: string | null;
          allowed_users?: string[];
          feature_custom?: string | null;
          click_count?: number;
          readme_sync?: boolean;
          readme_etag?: string | null;
          readme_synced_at?: string | null;
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
      reviews: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          rating: number | null;
          comment: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          user_id: string;
          rating?: number | null;
          comment: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          user_id?: string;
          rating?: number | null;
          comment?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'reviews_project_id_fkey';
            columns: ['project_id'];
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reviews_user_id_fkey';
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
      my_project_ids: {
        Args: Record<string, never>;
        Returns: string[];
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
export type ProjectRow = Database['public']['Tables']['projects']['Row'];
export type ProjectInsert = Database['public']['Tables']['projects']['Insert'];
export type ProjectUpdate = Database['public']['Tables']['projects']['Update'];
export type ReviewRow = Database['public']['Tables']['reviews']['Row'];
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
