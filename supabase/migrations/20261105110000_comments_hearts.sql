-- 리뷰 → 댓글, 별점 → 하트 (2026-11-04 사용자 요청 — 별점 때문에 리뷰를 잘 안 쓴다)
--
-- 설계: docs/superpowers/specs/2026-11-04-hearts-comments-design.md
-- 이 파일은 "A" 단계다 — 운영의 옛 코드가 계속 읽을 수 있게 옛 이름 view reviews 와 rating 칸을 남긴다.
-- 새 코드 배포 뒤 20261105120000_comments_hearts_cleanup.sql(B)이 view·rating 을 지우고 user_id 읽기를 막는다.
--
-- 1) reviews → project_comments, comment → content(tip_comments 와 맞춤). 1인 1개 UNIQUE 를 풀어 여러 개 달 수 있게.
--    정책식은 OID 로 저장돼 있어 이름만 바꾸면 그대로 동작한다.
-- 2) 익명 프로젝트를 만든 사람이 단 댓글은 남에게 '익명 · 만든 사람'으로만 보여야 한다. 화면만 가리면
--    API 로 user_id 를 읽을 수 있으므로 공개용 칸 public_user_id(익명 소유자면 NULL)를 두고, B 에서 user_id 읽기를 막는다.
--    다른 표(projects.author_id)를 봐야 해서 자동 계산 칸이 아니라 트리거로 채운다. author_id 는 사용자 키로
--    못 읽으므로 채우는 함수는 SECURITY DEFINER. 막는 함수(UPDATE 가드)는 current_user 를 봐야 해서 따로 둔다.
-- 3) project_hearts — 1인 1번. 누가 무엇에 눌렀는지는 공개(GitHub 별처럼, 나중 팔로잉 피드용 인덱스).
--    단 만든 사람이 자기 익명 프로젝트에 누른 하트는 남에게 숨긴다(그 사람의 공개 즐겨찾기에 떠서 익명이 풀림).
--    이것도 projects.author_id 가 필요해서 트리거가 by_anonymous_owner 를 채운다 — 정책에서 함수로
--    author_id 를 묻게 하면 아무나 그 함수를 불러 "이 사람이 이 익명 프로젝트 주인인가"를 알아낼 수 있다.

-- ───────────────────────── 1) 이름 바꾸기 ─────────────────────────

ALTER TABLE public.reviews RENAME TO project_comments;
ALTER TABLE public.project_comments RENAME COLUMN comment TO content;
ALTER TABLE public.project_comments DROP CONSTRAINT reviews_project_user_key;
-- 지운 UNIQUE 가 project_id 외래 키 인덱스를 겸했다
CREATE INDEX project_comments_project_created_idx ON public.project_comments (project_id, created_at);

ALTER POLICY reviews_select_developer ON public.project_comments RENAME TO project_comments_select_developer;
ALTER POLICY reviews_select_when_project_visible ON public.project_comments RENAME TO project_comments_select_when_project_visible;
ALTER POLICY reviews_insert_own ON public.project_comments RENAME TO project_comments_insert_own;
ALTER POLICY reviews_update_own ON public.project_comments RENAME TO project_comments_update_own;
ALTER POLICY reviews_delete_own ON public.project_comments RENAME TO project_comments_delete_own;

-- ───────────────────────── 2) 공개용 작성자 칸 ─────────────────────────

ALTER TABLE public.project_comments
  ADD COLUMN is_author boolean NOT NULL DEFAULT false,
  ADD COLUMN public_user_id uuid;

ALTER TABLE public.project_comments
  ADD CONSTRAINT project_comments_public_user_id_fkey
  FOREIGN KEY (public_user_id) REFERENCES public.users(id) ON DELETE CASCADE;
CREATE INDEX project_comments_public_user_id_idx ON public.project_comments (public_user_id);

UPDATE public.project_comments c
SET is_author = (c.user_id = p.author_id),
    public_user_id = CASE WHEN c.user_id = p.author_id AND p.author_role = 'anonymous' THEN NULL ELSE c.user_id END
FROM public.projects p
WHERE p.id = c.project_id;

-- 새 댓글: 두 칸을 계산한다(클라이언트가 보낸 값은 덮어씀).
CREATE OR REPLACE FUNCTION public.project_comments_fill_author()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_author uuid;
  v_role text;
BEGIN
  SELECT author_id, author_role INTO v_author, v_role FROM public.projects WHERE id = NEW.project_id;
  NEW.is_author := (NEW.user_id = v_author);
  NEW.public_user_id := CASE WHEN NEW.is_author AND v_role = 'anonymous' THEN NULL ELSE NEW.user_id END;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.project_comments_fill_author() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER project_comments_fill_author
  BEFORE INSERT ON public.project_comments
  FOR EACH ROW EXECUTE FUNCTION public.project_comments_fill_author();

-- 사용자 키로는 글(content)만 고칠 수 있다.
CREATE OR REPLACE FUNCTION public.project_comments_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF current_user NOT IN ('anon', 'authenticated') THEN
    RETURN NEW;
  END IF;
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.project_id IS DISTINCT FROM OLD.project_id
     OR NEW.is_author IS DISTINCT FROM OLD.is_author
     OR NEW.public_user_id IS DISTINCT FROM OLD.public_user_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'project_comments_locked' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER project_comments_guard
  BEFORE UPDATE ON public.project_comments
  FOR EACH ROW EXECUTE FUNCTION public.project_comments_guard();

-- ───────────────────────── 3) 하트 ─────────────────────────

CREATE TABLE public.project_hearts (
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  -- 만든 사람이 자기 익명 프로젝트에 누른 하트 — 남에게 숨긴다(트리거가 채움)
  by_anonymous_owner boolean NOT NULL DEFAULT false,
  PRIMARY KEY (project_id, user_id)
);
-- 즐겨찾기 목록(최신 먼저)·나중 팔로잉 피드. user_id 외래 키 인덱스도 겸한다.
CREATE INDEX project_hearts_user_created_idx ON public.project_hearts (user_id, created_at DESC);

ALTER TABLE public.project_hearts ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.project_hearts_fill()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.created_at := now();
  NEW.by_anonymous_owner := EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = NEW.project_id AND author_role = 'anonymous' AND author_id = NEW.user_id
  );
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.project_hearts_fill() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER project_hearts_fill
  BEFORE INSERT ON public.project_hearts
  FOR EACH ROW EXECUTE FUNCTION public.project_hearts_fill();

-- 내 것은 항상 본다. 남의 것은 그 프로젝트를 내가 볼 수 있을 때(projects RLS 에 맡김)만, 익명 소유자 하트는 빼고.
CREATE POLICY project_hearts_select ON public.project_hearts
  FOR SELECT USING (
    user_id = (SELECT auth.uid())
    OR (NOT by_anonymous_owner AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id))
  );
CREATE POLICY project_hearts_select_developer ON public.project_hearts
  FOR SELECT USING ((SELECT public.is_admin()));
-- 볼 수 없는 프로젝트에는 누르지 못한다.
CREATE POLICY project_hearts_insert_own ON public.project_hearts
  FOR INSERT WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id)
  );
CREATE POLICY project_hearts_delete_own ON public.project_hearts
  FOR DELETE USING (user_id = (SELECT auth.uid()));

REVOKE ALL ON public.project_hearts FROM anon, authenticated;
GRANT SELECT ON public.project_hearts TO anon;
GRANT SELECT, INSERT (project_id, user_id), DELETE ON public.project_hearts TO authenticated;

-- ───────────────────────── 4) 익명으로 바꾸거나 풀 때 다시 계산 ─────────────────────────

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
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.projects_refresh_anonymous_marks() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER projects_refresh_anonymous_marks
  AFTER UPDATE OF author_role, author_id ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.projects_refresh_anonymous_marks();

-- ───────────────────────── 5) 옛 코드 호환 (B 에서 삭제) ─────────────────────────

CREATE VIEW public.reviews WITH (security_invoker = true) AS
  SELECT id, project_id, user_id, rating, content AS comment, created_at
  FROM public.project_comments;
REVOKE ALL ON public.reviews FROM anon, authenticated;
GRANT SELECT ON public.reviews TO anon, authenticated;
