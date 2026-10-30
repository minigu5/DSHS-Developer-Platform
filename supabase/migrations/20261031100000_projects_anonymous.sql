-- 익명 프로젝트 (2026-10-31 사용자 요청)
--
-- 만든 사람을 개인 / 팀 / 익명 중에서 고른다. 익명이어도 DB 의 author_id 는 진짜 소유자
-- (수정·삭제·도메인·탈퇴는 그대로 author_id 로 판단). 다른 사람에게는 작성자가 보이지 않아야 하고,
-- 프로필·작성자 이름 검색에서는 절대 찾을 수 없어야 한다 — 화면만 숨기면 API(anon 키)로
-- projects.author_id 를 바로 읽을 수 있으므로 DB 에서 막는다.
--
-- 1) author_role 에 'anonymous' 추가. 익명은 팀 이름·팀원을 가질 수 없다(팀원 이메일이 곧 신원).
-- 2) public_author_id = 익명이면 NULL, 아니면 author_id (자동 계산 칸). 화면은 이 칸으로만 작성자를 읽고
--    users 를 붙인다(FK projects_public_author_id_fkey). 이 FK 가 생기면 projects → users 관계가 둘이라
--    PostgREST 에 `users!projects_public_author_id_fkey(...)` 처럼 이름을 적어야 한다.
-- 3) anon/authenticated 는 author_id 칸을 읽을 수 없다(칸 단위 SELECT 권한). select=* 도 막히므로
--    앱은 칸 이름을 적어서 읽는다. ⚠️ projects 에 새 칸을 만들면 아래처럼 GRANT SELECT (새 칸) 를 같이 할 것.
--    RLS 정책이 같은 표의 author_id 를 보는 것은 권한 검사 대상이 아니라 그대로 동작한다(롤백 시험으로 확인).
-- 4) reviews 정책은 다른 표(projects)의 author_id 를 읽어서 권한 오류가 난다 → "그 프로젝트를 내가 볼 수 있나"를
--    projects 의 RLS 에 맡기는 EXISTS 로 바꾼다(조건은 예전과 같음: 공개 / 소유자 / 허용 목록 / 관리자 정책).
-- 5) 내 프로젝트 목록(익명 포함)은 my_project_ids() 로만 — 로그인한 본인의 것만 돌려준다.

-- ───────────────────────── 1) 익명 값 ─────────────────────────

ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS projects_author_role_check;
ALTER TABLE public.projects
  ADD CONSTRAINT projects_author_role_check CHECK (author_role IN ('individual', 'team', 'anonymous'));

ALTER TABLE public.projects
  ADD CONSTRAINT projects_anonymous_no_team CHECK (
    author_role IS DISTINCT FROM 'anonymous'
    OR (team_name IS NULL AND coalesce(cardinality(team_members), 0) = 0)
  );

-- ───────────────────────── 2) 공개용 작성자 칸 ─────────────────────────

ALTER TABLE public.projects
  ADD COLUMN public_author_id uuid
  GENERATED ALWAYS AS (CASE WHEN author_role = 'anonymous' THEN NULL ELSE author_id END) STORED;

ALTER TABLE public.projects
  ADD CONSTRAINT projects_public_author_id_fkey
  FOREIGN KEY (public_author_id) REFERENCES public.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS projects_public_author_id_idx ON public.projects (public_author_id);

-- ───────────────────────── 3) author_id 읽기 막기 ─────────────────────────

REVOKE SELECT ON public.projects FROM anon, authenticated;
GRANT SELECT (
  id, title, short_description, description, url, platforms, features, feature_custom,
  source_type, repo_url, license, license_features, license_custom, visibility, allowed_users,
  author_role, team_name, team_members, icon_type, icon_url, created_at, updated_at,
  click_count, types, readme_sync, readme_etag, readme_synced_at, public_author_id
) ON public.projects TO anon, authenticated;

-- ───────────────────────── 4) reviews 정책 ─────────────────────────

DROP POLICY IF EXISTS reviews_select_when_project_visible ON public.reviews;
CREATE POLICY reviews_select_when_project_visible ON public.reviews
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.projects p WHERE p.id = reviews.project_id)
  );

-- ───────────────────────── 5) 내 프로젝트 id ─────────────────────────

CREATE OR REPLACE FUNCTION public.my_project_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT id FROM public.projects WHERE author_id = (SELECT auth.uid());
$$;

REVOKE EXECUTE ON FUNCTION public.my_project_ids() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_project_ids() TO authenticated;
