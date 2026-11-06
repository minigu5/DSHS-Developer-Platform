-- ============================================================
-- DSHS Developer Platform — 통합 스키마 (drop + recreate)
-- ============================================================
-- 단일 source of truth. 기존의 04/05/06 alter 는 이 파일로 흡수됨.
--
-- 주의: 이 스크립트는 public.users / public.projects / public.project_comments / public.project_hearts 를
-- 모두 DROP 한 뒤 재생성합니다. 기존 데이터는 모두 사라집니다.
-- auth.users (Supabase Auth) 는 건드리지 않습니다.

-- 0. 기존 트리거 / 테이블 정리
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

DROP TABLE IF EXISTS public.project_hearts CASCADE;
DROP TABLE IF EXISTS public.project_comments CASCADE;
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
  types              text[] NOT NULL DEFAULT '{}' CHECK (cardinality(types) >= 1),  -- 17: 다중 선택
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
  -- 'anonymous' 와 public_author_id(익명이면 NULL, 자동 계산)·author_id 읽기 차단(칸 단위 GRANT)은
  -- supabase/migrations/20261031100000_projects_anonymous.sql 참고
  author_role        text NOT NULL DEFAULT 'individual' CHECK (author_role IN ('individual', 'team', 'anonymous')),
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


-- 3. project_comments (옛 reviews — 2026-11-05 별점 삭제·이름 변경) / project_hearts
-- 실제 정의·트리거·정책은 supabase/migrations/20261105110000_comments_hearts.sql(+ 20261105140000 정리)이 기준.
-- 익명 프로젝트 소유자의 댓글은 public_user_id 가 NULL(트리거), user_id 는 사용자 키로 못 읽음(칸 단위 GRANT).
CREATE TABLE public.project_comments (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id     uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id        uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content        text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 500),
  created_at     timestamptz NOT NULL DEFAULT now(),
  is_author      boolean NOT NULL DEFAULT false,
  public_user_id uuid REFERENCES public.users(id) ON DELETE CASCADE
);
CREATE INDEX project_comments_project_created_idx ON public.project_comments (project_id, created_at);

ALTER TABLE public.project_comments ENABLE ROW LEVEL SECURITY;

-- 조회: 그 프로젝트를 내가 볼 수 있으면(projects RLS 에 맡김). 쓰기: 본인.
CREATE POLICY "project_comments_select_when_project_visible"
  ON public.project_comments FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_comments.project_id));

CREATE POLICY "project_comments_insert_own"
  ON public.project_comments FOR INSERT
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id)
  );

CREATE POLICY "project_comments_update_own"
  ON public.project_comments FOR UPDATE
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "project_comments_delete_own"
  ON public.project_comments FOR DELETE
  USING ((SELECT auth.uid()) = user_id);

-- 하트 — 1인 1번, 누가 눌렀는지 공개(만든 사람이 자기 익명 프로젝트에 누른 것만 숨김)
CREATE TABLE public.project_hearts (
  project_id         uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id            uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at         timestamptz NOT NULL DEFAULT now(),
  by_anonymous_owner boolean NOT NULL DEFAULT false,
  PRIMARY KEY (project_id, user_id)
);
CREATE INDEX project_hearts_user_created_idx ON public.project_hearts (user_id, created_at DESC);


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


-- 5-포스터. AI 포스터 만들기 (migration 20261106150000 그대로)
-- 2026-11-06 AI 포스터 만들기 (설계: docs/superpowers/specs/2026-11-05-ai-poster-design.md §8)
-- 1) project_posters — 프로젝트의 AI 포스터(현재 HTML·그림 URL·버전·대화). 서버가 권한을 확인한 뒤 서비스 키로만 읽고 쓴다
--    (Gemini 키·횟수 검사가 어차피 서버에 있다). RLS 켜고 사용자 키 정책은 두지 않는다.
-- 2) ai_usage — 하루 AI 사용 횟수. 글(Gemini)은 KST 자정, 그림(Workers AI)은 Cloudflare 할당량과 같은 UTC 자정에 새 날.
-- 3) reserve_ai_usage / release_ai_usage — 요청 시작 때 1회 예약(동시 요청에도 상한이 안 새게 잠금), 실패하면 돌려준다.

CREATE TABLE public.project_posters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  html text,
  art_url text,
  art_order jsonb,
  versions jsonb NOT NULL DEFAULT '[]'::jsonb,
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  band_tone text NOT NULL DEFAULT 'light' CHECK (band_tone IN ('light', 'dark')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX project_posters_project_id_idx ON public.project_posters (project_id);
CREATE INDEX project_posters_created_by_idx ON public.project_posters (created_by);

ALTER TABLE public.project_posters ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.project_posters FROM anon, authenticated;

-- 프로젝트마다 3개까지(설계 §4). 같은 프로젝트에 동시에 만들 때도 새지 않게 프로젝트 줄을 잠근다.
CREATE OR REPLACE FUNCTION public.project_posters_limit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  PERFORM 1 FROM public.projects WHERE id = NEW.project_id FOR UPDATE;
  IF (SELECT count(*) FROM public.project_posters WHERE project_id = NEW.project_id) >= 3 THEN
    RAISE EXCEPTION 'poster_limit' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER project_posters_limit
  BEFORE INSERT ON public.project_posters
  FOR EACH ROW EXECUTE FUNCTION public.project_posters_limit();

CREATE TABLE public.ai_usage (
  kind text NOT NULL CHECK (kind IN ('text', 'art')),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  day date NOT NULL,
  count integer NOT NULL DEFAULT 0 CHECK (count >= 0),
  PRIMARY KEY (kind, user_id, day)
);
CREATE INDEX ai_usage_kind_day_idx ON public.ai_usage (kind, day);
CREATE INDEX ai_usage_user_id_idx ON public.ai_usage (user_id);

ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ai_usage FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.ai_usage_day(p_kind text)
RETURNS date
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT CASE WHEN p_kind = 'art' THEN (now() AT TIME ZONE 'UTC')::date ELSE (now() AT TIME ZONE 'Asia/Seoul')::date END;
$$;

CREATE OR REPLACE FUNCTION public.reserve_ai_usage(p_kind text, p_user uuid, p_user_limit integer, p_site_limit integer)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_day date := public.ai_usage_day(p_kind);
  v_site integer;
  v_mine integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('ai_usage:' || p_kind || ':' || v_day::text));
  SELECT coalesce(sum(count), 0) INTO v_site FROM public.ai_usage WHERE kind = p_kind AND day = v_day;
  IF v_site >= p_site_limit THEN
    RETURN 'site_limit';
  END IF;
  SELECT coalesce(max(count), 0) INTO v_mine FROM public.ai_usage WHERE kind = p_kind AND day = v_day AND user_id = p_user;
  IF v_mine >= p_user_limit THEN
    RETURN 'user_limit';
  END IF;
  INSERT INTO public.ai_usage (kind, user_id, day, count) VALUES (p_kind, p_user, v_day, 1)
  ON CONFLICT (kind, user_id, day) DO UPDATE SET count = public.ai_usage.count + 1;
  RETURN 'ok';
END;
$$;

CREATE OR REPLACE FUNCTION public.release_ai_usage(p_kind text, p_user uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  UPDATE public.ai_usage SET count = count - 1
  WHERE kind = p_kind AND user_id = p_user AND day = public.ai_usage_day(p_kind) AND count > 0;
$$;

REVOKE ALL ON FUNCTION public.project_posters_limit() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ai_usage_day(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reserve_ai_usage(text, uuid, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_ai_usage(text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ai_usage_day(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.reserve_ai_usage(text, uuid, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_ai_usage(text, uuid) TO service_role;


-- 5-포스터2. 새 포스터 하루 1개 (migration 20261106160000 그대로)
-- 2026-11-06 AI 포스터: 새 포스터는 프로젝트마다 하루(KST) 1개 (사용자 결정). 고치기는 ai_usage 한도 그대로.
-- 지웠다가 같은 날 다시 만드는 것도 막으려고 만든 날을 따로 남긴다(project_poster_days). 서비스 키 전용.

CREATE TABLE public.project_poster_days (
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  day date NOT NULL,
  PRIMARY KEY (project_id, day)
);

ALTER TABLE public.project_poster_days ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.project_poster_days FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.project_posters_limit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  PERFORM 1 FROM public.projects WHERE id = NEW.project_id FOR UPDATE;
  IF (SELECT count(*) FROM public.project_posters WHERE project_id = NEW.project_id) >= 3 THEN
    RAISE EXCEPTION 'poster_limit' USING ERRCODE = 'P0001';
  END IF;
  INSERT INTO public.project_poster_days (project_id, day)
  VALUES (NEW.project_id, (now() AT TIME ZONE 'Asia/Seoul')::date)
  ON CONFLICT DO NOTHING;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'poster_daily' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;


-- 5-포스터3. 띠 위치 (migration 20261106170000 그대로)
-- 2026-11-06 AI 포스터: 띠를 위·아래 중 어디에 붙일지 (사용자 요청). 서비스 키 전용 표라 GRANT 는 필요 없다.
ALTER TABLE public.project_posters
  ADD COLUMN band_position text NOT NULL DEFAULT 'bottom' CHECK (band_position IN ('top', 'bottom'));


-- 6. PostgREST schema cache 강제 리로드 (안전장치)
NOTIFY pgrst, 'reload schema';
