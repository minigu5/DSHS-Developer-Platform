-- 2026-10-27 DB 점검에서 나온 권한 구멍 막기
--
-- 1) 학생이 API로 자기 users.email 을 관리자·다른 학생 이메일로 바꾸면
--    projects/reviews 정책(public.users.email 기준)이 그 사람으로 믿었다
--    → 비공개 프로젝트 열람·남의 프로젝트 수정이 됐다(롤백 시험으로 확인).
--    email·full_name·id·created_at 은 사용자 키로 못 바꾸게 막고,
--    정책은 위조할 수 없는 로그인 토큰(auth.jwt())의 이메일을 보게 바꾼다.
-- 2) 팀원이 projects.author_id 를 자기로 바꿔 소유권을 가져갈 수 있었다.
--    click_count 도 작성자가 직접 고칠 수 있었다.
-- 3) track_project_click 을 누구나 직접 불러 ip_hash 만 바꿔 조회수를 올릴 수 있었다
--    → service_role 전용(/api/track 이 서버 키로 부른다).
-- 4) 공지 작성자가 API로 is_pinned·admin 카테고리를 넣을 수 있었다(서버 액션만 막았음).
--
-- 막는 기준은 current_user 가 anon/authenticated(= 브라우저·사용자 키)일 때만.
-- 서비스 키(service_role)와 SECURITY DEFINER 함수(소유자 postgres)는 그대로 쓴다.

-- ───────────────────────── users ─────────────────────────

ALTER TABLE public.users ADD CONSTRAINT users_email_key UNIQUE (email);

CREATE OR REPLACE FUNCTION public.users_guard_identity()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF current_user NOT IN ('anon', 'authenticated') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- 행은 보통 가입 트리거(handle_new_user)가 만든다. 사용자 키로 만들 때는
    -- 로그인한 이메일 그대로만, 실명은 로그인 콜백이 서버 키로 채운다.
    IF NEW.email IS DISTINCT FROM (auth.jwt() ->> 'email') THEN
      RAISE EXCEPTION 'users_email_locked' USING ERRCODE = '42501';
    END IF;
    NEW.full_name := NULL;
    NEW.created_at := now();
    RETURN NEW;
  END IF;

  -- 같은 값을 다시 쓰는 것(프로필 upsert 가 email 을 함께 보냄)은 허용
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.email IS DISTINCT FROM OLD.email
     OR NEW.full_name IS DISTINCT FROM OLD.full_name
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'users_identity_locked' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS users_guard_identity ON public.users;
CREATE TRIGGER users_guard_identity
  BEFORE INSERT OR UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.users_guard_identity();

-- ───────────────────────── projects ─────────────────────────

CREATE OR REPLACE FUNCTION public.projects_guard_owner()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF current_user NOT IN ('anon', 'authenticated') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.click_count := 0;
    RETURN NEW;
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.author_id IS DISTINCT FROM OLD.author_id
     OR NEW.click_count IS DISTINCT FROM OLD.click_count
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'projects_owner_locked' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS projects_guard_owner ON public.projects;
CREATE TRIGGER projects_guard_owner
  BEFORE INSERT OR UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.projects_guard_owner();

-- 정책: public.users.email 대신 로그인 토큰 이메일, 관리자는 is_admin()(auth.users 기준).
-- 조건 자체는 예전과 같다. (select …) 로 감싸 행마다 다시 계산하지 않게 한다.

DROP POLICY IF EXISTS projects_select_developer ON public.projects;
CREATE POLICY projects_select_developer ON public.projects
  FOR SELECT USING ((SELECT public.is_admin()));

DROP POLICY IF EXISTS projects_select_private_for_allowed ON public.projects;
CREATE POLICY projects_select_private_for_allowed ON public.projects
  FOR SELECT USING (
    visibility = 'private'
    AND (
      (SELECT auth.uid()) = author_id
      OR (SELECT auth.jwt() ->> 'email') = ANY (allowed_users)
    )
  );

DROP POLICY IF EXISTS projects_update_developer ON public.projects;
CREATE POLICY projects_update_developer ON public.projects
  FOR UPDATE USING ((SELECT public.is_admin()));

DROP POLICY IF EXISTS projects_update_own ON public.projects;
CREATE POLICY projects_update_own ON public.projects
  FOR UPDATE USING (
    (SELECT auth.uid()) = author_id
    OR (SELECT auth.jwt() ->> 'email') = ANY (team_members)
  );

-- ───────────────────────── reviews ─────────────────────────

DROP POLICY IF EXISTS reviews_select_developer ON public.reviews;
CREATE POLICY reviews_select_developer ON public.reviews
  FOR SELECT USING ((SELECT public.is_admin()));

DROP POLICY IF EXISTS reviews_select_when_project_visible ON public.reviews;
CREATE POLICY reviews_select_when_project_visible ON public.reviews
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = reviews.project_id
        AND (
          p.visibility = 'public'
          OR p.author_id = (SELECT auth.uid())
          OR (SELECT auth.jwt() ->> 'email') = ANY (p.allowed_users)
        )
    )
  );

-- ───────────────────────── 조회수 ─────────────────────────

REVOKE EXECUTE ON FUNCTION public.track_project_click(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.track_project_click(uuid, uuid, text) TO service_role;

-- ───────────────────────── announcements ─────────────────────────

CREATE OR REPLACE FUNCTION public.announcements_guard_admin()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF current_user NOT IN ('anon', 'authenticated') OR public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.is_pinned OR NEW.category = 'admin' THEN
      RAISE EXCEPTION 'announcements_admin_only' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.is_pinned IS DISTINCT FROM OLD.is_pinned
     OR (NEW.category = 'admin' AND OLD.category IS DISTINCT FROM 'admin') THEN
    RAISE EXCEPTION 'announcements_admin_only' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS announcements_guard_admin ON public.announcements;
CREATE TRIGGER announcements_guard_admin
  BEFORE INSERT OR UPDATE ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.announcements_guard_admin();
