// DB 타입 정의.
// Step 3에서 Supabase CLI 로 자동 생성한 결과로 이 파일을 교체할 예정.
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
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
