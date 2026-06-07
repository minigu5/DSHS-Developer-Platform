// Supabase Database 타입.
// docs/03-supabase-schema.sql + 04-supabase-alter.sql + 05-supabase-alter-2.sql 을 반영.
//
// 추후 Supabase CLI 로 자동 생성한 결과로 교체 가능:
//   npx supabase gen types typescript --project-id <id> --schema public > src/lib/types.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

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
          type: string;
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
          author_role: 'individual' | 'team' | null;
          team_name: string | null;
          team_members: string[] | null;
          icon_url: string | null;
          icon_type: 'link' | 'auto' | null;
          license_features: string[] | null;
          license_custom: string | null;
          // 05 alter
          allowed_users: string[];
          feature_custom: string | null;
        };
        Insert: {
          id?: string;
          author_id: string;
          title: string;
          description: string;
          type: string;
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
          author_role?: 'individual' | 'team' | null;
          team_name?: string | null;
          team_members?: string[] | null;
          icon_url?: string | null;
          icon_type?: 'link' | 'auto' | null;
          license_features?: string[] | null;
          license_custom?: string | null;
          allowed_users?: string[];
          feature_custom?: string | null;
        };
        Update: {
          id?: string;
          author_id?: string;
          title?: string;
          description?: string;
          type?: string;
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
          author_role?: 'individual' | 'team' | null;
          team_name?: string | null;
          team_members?: string[] | null;
          icon_url?: string | null;
          icon_type?: 'link' | 'auto' | null;
          license_features?: string[] | null;
          license_custom?: string | null;
          allowed_users?: string[];
          feature_custom?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'projects_author_id_fkey';
            columns: ['author_id'];
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
          rating: number;
          comment: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          user_id: string;
          rating: number;
          comment: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          user_id?: string;
          rating?: number;
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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
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
