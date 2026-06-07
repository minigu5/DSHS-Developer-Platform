-- ============================================================
-- DSHS Developer Platform — 통합 스키마 (drop + recreate)
-- ============================================================
-- 단일 source of truth. 기존의 04/05/06 alter 는 이 파일로 흡수됨.
--
-- 주의: 이 스크립트는 public.users / public.projects / public.reviews 를
-- 모두 DROP 한 뒤 재생성합니다. 기존 데이터는 모두 사라집니다.
-- auth.users (Supabase Auth) 는 건드리지 않습니다.

-- 0. 기존 트리거 / 테이블 정리
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

DROP TABLE IF EXISTS public.reviews CASCADE;
DROP TABLE IF EXISTS public.projects CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;


-- 1. users
CREATE TABLE public.users (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       text NOT NULL CHECK (email LIKE '%@ts.hs.kr'),
  full_name   text,
  nickname    text UNIQUE,
  bio         text,
  avatar_url  text,
  interests   text[] NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_all"
  ON public.users FOR SELECT USING (true);

CREATE POLICY "users_update_self"
  ON public.users FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "users_insert_self"
  ON public.users FOR INSERT WITH CHECK (auth.uid() = id);


-- 2. projects
CREATE TABLE public.projects (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id          uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  -- 기본 정보
  title              text NOT NULL,
  short_description  text,
  description        text NOT NULL,
  url                text,

  -- 분류
  type               text NOT NULL,
  platforms          text[] NOT NULL DEFAULT '{}',
  features           text[] NOT NULL DEFAULT '{}',
  feature_custom     text,

  -- 소스코드
  source_type        text NOT NULL CHECK (source_type IN ('open', 'closed')),
  repo_url           text,

  -- 라이선스 (license_features + license_custom 사용. license 는 legacy/nullable)
  license            text,
  license_features   text[] NOT NULL DEFAULT '{}',
  license_custom     text,

  -- 접근 권한
  visibility         text NOT NULL CHECK (visibility IN ('public', 'private')),
  allowed_users      text[] NOT NULL DEFAULT '{}',

  -- 작성자 형태
  author_role        text NOT NULL DEFAULT 'individual' CHECK (author_role IN ('individual', 'team')),
  team_name          text,
  team_members       text[],

  -- 아이콘
  icon_type          text CHECK (icon_type IN ('upload', 'auto')),
  icon_url           text,

  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "projects_select_public"
  ON public.projects FOR SELECT
  USING (visibility = 'public');

CREATE POLICY "projects_select_private_for_allowed"
  ON public.projects FOR SELECT
  USING (
    visibility = 'private' AND (
      auth.uid() = author_id OR
      (SELECT email FROM public.users WHERE id = auth.uid()) = ANY(allowed_users)
    )
  );

CREATE POLICY "projects_insert_own"
  ON public.projects FOR INSERT
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "projects_update_own"
  ON public.projects FOR UPDATE
  USING (
    auth.uid() = author_id OR
    (SELECT email FROM public.users WHERE id = auth.uid()) = ANY(team_members)
  );

CREATE POLICY "projects_delete_own"
  ON public.projects FOR DELETE
  USING (auth.uid() = author_id);


-- 3. reviews
CREATE TABLE public.reviews (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  rating      int  NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reviews_select_when_project_visible"
  ON public.reviews FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = reviews.project_id
        AND (
          p.visibility = 'public'
          OR p.author_id = auth.uid()
          OR (SELECT email FROM public.users WHERE id = auth.uid()) = ANY(p.allowed_users)
        )
    )
  );

CREATE POLICY "reviews_insert_own"
  ON public.reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "reviews_update_own"
  ON public.reviews FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "reviews_delete_own"
  ON public.reviews FOR DELETE
  USING (auth.uid() = user_id);


-- 4. auth.users → public.users 자동 동기화 트리거
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    avatar_url = EXCLUDED.avatar_url;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- 5. 이미 가입된 auth.users 를 public.users 로 백필
INSERT INTO public.users (id, email, full_name, avatar_url, created_at)
SELECT
  u.id,
  u.email,
  u.raw_user_meta_data->>'full_name',
  u.raw_user_meta_data->>'avatar_url',
  u.created_at
FROM auth.users u
WHERE u.email LIKE '%@ts.hs.kr'
ON CONFLICT (id) DO NOTHING;


-- 6. PostgREST schema cache 강제 리로드 (안전장치)
NOTIFY pgrst, 'reload schema';
