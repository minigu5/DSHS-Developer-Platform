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
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          nickname?: string | null;
          bio?: string | null;
          avatar_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          nickname?: string | null;
          bio?: string | null;
          avatar_url?: string | null;
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
          icon_type: 'upload' | 'auto' | null;
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
          icon_type?: 'upload' | 'auto' | null;
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
          icon_type?: 'upload' | 'auto' | null;
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
