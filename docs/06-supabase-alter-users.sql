-- 06-supabase-alter-users.sql
-- users 테이블에 nickname과 bio 컬럼 추가
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS nickname text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS bio text;

-- PostgREST schema cache 강제 리로드
NOTIFY pgrst, 'reload schema';
