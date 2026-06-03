-- users 테이블에 관심 분야(interests) 컬럼 추가
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS interests text[] DEFAULT '{}';

-- RLS 정책은 기존 users 정책을 따름 (자기 자신만 UPDATE 가능)
