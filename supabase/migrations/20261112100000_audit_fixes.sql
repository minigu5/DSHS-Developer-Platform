-- 2026-11-12 전체 감사 반영 — 사용자 키로 DB 를 직접 부르는 길을 막는다.
-- 1) 해줘 linked_project_id: 내 이름(익명 아님)으로 올린 내 프로젝트만. 예전엔 정책에 WITH CHECK 가 없어 남의 프로젝트도 연결됐고,
--    연결 뒤 익명으로 바꾸면 anon 이 ideas.author_id + linked_project_id 로 주인을 알 수 있었다 → 익명으로 바뀌면 연결을 비운다.
-- 2) 잠긴 프로젝트: allowed_users 를 늘려 사실상 공개하지 못하게(줄이기·그대로는 됨). 사용자 키일 때만.
-- 3) 차단 중 프로필: 사진·연락처·관심 분야도 막는다(닉네임·소개만 막고 있었음). 온보딩(닉네임이 비어 있음)은 그대로 통과.
-- 4) 앞으로 postgres 가 만드는 함수는 기본으로 아무도 못 부른다 — 새 RPC·정책 도우미는 GRANT EXECUTE 를 직접 적을 것.
-- 5) search_path=public 인 SECURITY DEFINER 함수에 pg_temp 를 맨 뒤로(없으면 임시 스키마를 먼저 찾는다).
-- 6) 크기 제한 없는 칸에 CHECK.
-- 7) 이미지 올리기·포스터 내보내기 하루 횟수(ai_usage 종류 추가).

-- ───────────────────────── 1) 해줘 연결 ─────────────────────────

CREATE OR REPLACE FUNCTION public.ideas_guard_linked_project()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.linked_project_id IS NOT NULL
     AND (TG_OP = 'INSERT'
          OR NEW.linked_project_id IS DISTINCT FROM OLD.linked_project_id
          OR NEW.author_id IS DISTINCT FROM OLD.author_id)
     AND NOT EXISTS (
       SELECT 1 FROM public.projects p
       WHERE p.id = NEW.linked_project_id
         AND p.author_id = NEW.author_id
         AND p.author_role <> 'anonymous'
     ) THEN
    RAISE EXCEPTION 'idea_link_not_own' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.ideas_guard_linked_project() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER ideas_guard_linked_project
  BEFORE INSERT OR UPDATE OF linked_project_id, author_id ON public.ideas
  FOR EACH ROW EXECUTE FUNCTION public.ideas_guard_linked_project();

CREATE OR REPLACE FUNCTION public.projects_refresh_anonymous_marks()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.author_role IS NOT DISTINCT FROM OLD.author_role AND NEW.author_id IS NOT DISTINCT FROM OLD.author_id THEN
    RETURN NEW;
  END IF;
  UPDATE public.project_comments
  SET is_author = (user_id = NEW.author_id),
      public_user_id = CASE WHEN user_id = NEW.author_id AND NEW.author_role = 'anonymous' THEN NULL ELSE user_id END
  WHERE project_id = NEW.id;
  UPDATE public.project_hearts
  SET by_anonymous_owner = (user_id = NEW.author_id AND NEW.author_role = 'anonymous')
  WHERE project_id = NEW.id;
  -- 해줘 글쓴이 = 만든 사람이라 연결이 남아 있으면 익명이 풀린다(2026-11-12 감사). 다시 공개 이름으로 바꿔도 연결은 안 돌아온다.
  IF NEW.author_role = 'anonymous' THEN
    UPDATE public.ideas SET linked_project_id = NULL WHERE linked_project_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.projects_refresh_anonymous_marks() FROM PUBLIC, anon, authenticated;

-- 이미 익명인 프로젝트에 걸린 연결도 비운다(감사 때 0건)
UPDATE public.ideas i SET linked_project_id = NULL
FROM public.projects p
WHERE p.id = i.linked_project_id AND (p.author_role = 'anonymous' OR p.author_id <> i.author_id);

-- ───────────────────────── 2) 잠긴 프로젝트 공유 늘리기 ─────────────────────────

CREATE OR REPLACE FUNCTION public.projects_guard_locked()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF current_user IN ('anon', 'authenticated') AND private.project_is_locked(NEW.id) THEN
    IF NEW.visibility = 'public' THEN
      RAISE EXCEPTION 'project_locked' USING ERRCODE = '42501';
    END IF;
    IF NOT (coalesce(NEW.allowed_users, '{}') <@ coalesce(OLD.allowed_users, '{}')) THEN
      RAISE EXCEPTION 'project_locked_share' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER projects_guard_locked ON public.projects;
CREATE TRIGGER projects_guard_locked
  BEFORE UPDATE OF visibility, allowed_users ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.projects_guard_locked();

-- ───────────────────────── 3) 차단 중 프로필 ─────────────────────────

CREATE OR REPLACE FUNCTION public.users_guard_profile()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  -- 비어 있던 닉네임을 처음 정하는 것(온보딩 — 관심 분야·사진도 같이 저장)은 차단 중에도 허용 — 막으면 미들웨어가 온보딩으로만 보내 사이트를 못 쓴다
  IF current_user IN ('anon', 'authenticated')
     AND (NEW.bio IS DISTINCT FROM OLD.bio
          OR (OLD.nickname IS NOT NULL
              AND (NEW.nickname IS DISTINCT FROM OLD.nickname
                   OR NEW.avatar_url IS DISTINCT FROM OLD.avatar_url
                   OR NEW.contacts IS DISTINCT FROM OLD.contacts
                   OR NEW.interests IS DISTINCT FROM OLD.interests)))
     AND private.is_banned((SELECT auth.uid())) THEN
    RAISE EXCEPTION 'user_banned' USING ERRCODE = '42501';
  END IF;
  IF NEW.nickname IS DISTINCT FROM OLD.nickname OR NEW.bio IS DISTINCT FROM OLD.bio THEN
    NEW.profile_updated_at := now();
  END IF;
  RETURN NEW;
END;
$$;

-- ───────────────────────── 4) 새 함수 기본 권한 ─────────────────────────
-- 함수의 PUBLIC EXECUTE 는 전역 기본값이라 IN SCHEMA 로는 못 뺀다. 이미 있는 함수의 권한은 그대로다.
-- 트리거 함수는 실행할 때 EXECUTE 를 보지 않으니 영향 없음. RLS 정책 안에서 부르는 INVOKER 함수는 GRANT 가 필요하다.

ALTER DEFAULT PRIVILEGES FOR ROLE postgres REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated;

-- ───────────────────────── 5) search_path 에 pg_temp 맨 뒤 ─────────────────────────

ALTER FUNCTION public.projects_block_delete_with_subdomain() SET search_path = public, pg_temp;
ALTER FUNCTION public.save_guide_revision(uuid, text, integer, text, text, jsonb, jsonb, text, integer, jsonb, jsonb) SET search_path = public, pg_temp;
ALTER FUNCTION public.subdomain_connect_naru(uuid, uuid, text, text, text[]) SET search_path = public, pg_temp;
ALTER FUNCTION public.subdomain_connect(uuid, uuid, text, text, jsonb, text[]) SET search_path = public, pg_temp;
ALTER FUNCTION public.subdomain_is_developer(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.subdomain_record_check(uuid, boolean, timestamptz) SET search_path = public, pg_temp;
ALTER FUNCTION public.subdomain_release(uuid, uuid, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.subdomain_reserve(uuid, uuid, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.subdomain_revoke(uuid, uuid, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.subdomain_set_naru_records(uuid, text[]) SET search_path = public, pg_temp;
ALTER FUNCTION public.subdomain_set_placeholder_records(uuid, text[]) SET search_path = public, pg_temp;
ALTER FUNCTION public.subdomain_set_redirect_records(uuid, text[]) SET search_path = public, pg_temp;
ALTER FUNCTION public.subdomain_set_site(uuid, uuid, text, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.subdomain_set_url(uuid, uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.subdomain_unblock(uuid, uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.subdomain_verify_site(uuid, uuid, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.track_project_click(uuid, uuid, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.withdraw_account(uuid) SET search_path = public, pg_temp;

-- ───────────────────────── 6) 크기 제한 ─────────────────────────
-- 감사 때 최댓값: 팁 댓글 685자, 연락처 2개(화면 한도 8), 관심 분야 13개, 허용 사용자 0명, 팀원 3명

ALTER TABLE public.tip_comments ADD CONSTRAINT tip_comments_content_len_chk CHECK (char_length(content) <= 5000);
ALTER TABLE public.users ADD CONSTRAINT users_contacts_len_chk
  CHECK (contacts IS NULL OR CASE WHEN jsonb_typeof(contacts) = 'array' THEN jsonb_array_length(contacts) <= 8 ELSE false END);
ALTER TABLE public.users ADD CONSTRAINT users_interests_len_chk CHECK (interests IS NULL OR cardinality(interests) <= 50);
ALTER TABLE public.projects ADD CONSTRAINT projects_allowed_users_len_chk CHECK (allowed_users IS NULL OR cardinality(allowed_users) <= 500);
ALTER TABLE public.projects ADD CONSTRAINT projects_team_members_len_chk CHECK (team_members IS NULL OR cardinality(team_members) <= 50);

-- ───────────────────────── 7) 이미지 올리기·포스터 내보내기 하루 횟수 ─────────────────────────
-- reserve_ai_usage 를 그대로 쓴다(KST 자정). 한도 값은 src/lib/posters/usage.ts. 코드보다 먼저 적용해야 한다 —
-- CHECK 에 없는 종류면 예약이 실패해 업로드가 막힌다.

ALTER TABLE public.ai_usage DROP CONSTRAINT ai_usage_kind_check;
ALTER TABLE public.ai_usage ADD CONSTRAINT ai_usage_kind_check CHECK (kind IN ('text', 'art', 'art_local', 'upload', 'export'));
