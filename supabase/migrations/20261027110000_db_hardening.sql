-- 2026-10-27 DB 점검 후속 — 안정성·성능 정리 (권한 구멍은 20261027100000)
-- 모두 되돌릴 수 있는 변경. 옛 projects.type 칸 삭제는 여기 넣지 않음.

-- ───────── 1. NOT VALID 로 붙어 있던 제약을 기존 행까지 검사 ─────────
-- 2026-10-27 운영 데이터로 미리 세어 봄: 어긋나는 행 0개
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT conrelid::regclass AS t, conname
    FROM pg_constraint
    WHERE connamespace = 'public'::regnamespace AND NOT convalidated
  LOOP
    EXECUTE format('ALTER TABLE %s VALIDATE CONSTRAINT %I', r.t, r.conname);
  END LOOP;
END $$;

-- ───────── 2. 무결성 ─────────
-- 리뷰는 프로젝트마다 한 사람 1개(화면 규칙 "이미 이 프로젝트에 리뷰를 남겼어요")
-- 이 UNIQUE 가 reviews.project_id 외래 키 인덱스 역할도 한다.
ALTER TABLE public.reviews
  ADD CONSTRAINT reviews_project_user_key UNIQUE (project_id, user_id);

-- 별점은 선택(docs/15) — 운영에 안 들어가 있어서 별점 없는 리뷰 저장이 NOT NULL 로 실패했다
ALTER TABLE public.reviews ALTER COLUMN rating DROP NOT NULL;
ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS reviews_rating_check;
ALTER TABLE public.reviews
  ADD CONSTRAINT reviews_rating_check CHECK (rating IS NULL OR (rating BETWEEN 1 AND 5));

-- 종류는 최소 1개 (docs/17 2단계의 CHECK — 운영 데이터 빈 배열 0개)
ALTER TABLE public.projects
  ADD CONSTRAINT projects_types_not_empty CHECK (cardinality(types) >= 1);

-- ───────── 3. 외래 키 인덱스 (지울 때·작성자별 목록 때 전체 훑기 방지) ─────────
CREATE INDEX IF NOT EXISTS projects_author_id_idx       ON public.projects (author_id);
CREATE INDEX IF NOT EXISTS reviews_user_id_idx          ON public.reviews (user_id);
CREATE INDEX IF NOT EXISTS ideas_author_id_idx          ON public.ideas (author_id);
CREATE INDEX IF NOT EXISTS ideas_linked_project_id_idx  ON public.ideas (linked_project_id);
CREATE INDEX IF NOT EXISTS project_clicks_user_id_idx   ON public.project_clicks (user_id);
CREATE INDEX IF NOT EXISTS tip_comments_user_id_idx     ON public.tip_comments (user_id);
CREATE INDEX IF NOT EXISTS tip_likes_user_id_idx        ON public.tip_likes (user_id);
CREATE INDEX IF NOT EXISTS subdomains_revoked_by_idx    ON public.subdomains (revoked_by);

-- (doc_key, rev_no) UNIQUE 와 겹침 — 거꾸로 훑기로 DESC 정렬도 된다
DROP INDEX IF EXISTS public.guide_revisions_doc_idx;

-- ───────── 4. 함수 search_path 고정 ─────────
-- SECURITY DEFINER 두 개는 본문이 모두 스키마를 적어 둬서 빈 값
ALTER FUNCTION public.handle_new_user() SET search_path = '';
ALTER FUNCTION public.is_admin() SET search_path = '';
-- 나머지(트리거·검사 함수)는 지금 실제로 쓰는 값 그대로 고정
ALTER FUNCTION public.subdomain_target_bound(text) SET search_path = public;
ALTER FUNCTION public.subdomain_target_ok(text, text) SET search_path = public;
ALTER FUNCTION public.subdomain_txt_ok(text, text, jsonb) SET search_path = public;
ALTER FUNCTION public.subdomains_limit() SET search_path = public;
ALTER FUNCTION public.subdomains_touch() SET search_path = public;
ALTER FUNCTION public.touch_tips_updated_at() SET search_path = public;
ALTER FUNCTION public.update_announcements_updated_at() SET search_path = public;
ALTER FUNCTION public.update_ideas_updated_at() SET search_path = public;

-- ───────── 5. RLS: auth.uid()·is_admin() 를 (select …) 로 감싸 행마다 다시 부르지 않게 ─────────
-- 조건은 예전과 같다.
ALTER POLICY announcements_delete_author ON public.announcements
  USING (((SELECT auth.uid()) = author_id) OR (SELECT public.is_admin()));
ALTER POLICY announcements_insert_auth ON public.announcements
  WITH CHECK ((SELECT auth.uid()) = author_id);
ALTER POLICY announcements_update_author ON public.announcements
  USING (((SELECT auth.uid()) = author_id) OR (SELECT public.is_admin()))
  WITH CHECK (((SELECT auth.uid()) = author_id) OR (SELECT public.is_admin()));

ALTER POLICY "Authors can delete their own ideas" ON public.ideas
  USING ((SELECT auth.uid()) = author_id);
ALTER POLICY "Authors can update their own ideas" ON public.ideas
  USING ((SELECT auth.uid()) = author_id);
ALTER POLICY "Logged-in users can create ideas" ON public.ideas
  WITH CHECK ((SELECT auth.uid()) = author_id);

ALTER POLICY privacy_consents_select_own ON public.privacy_consents
  USING ((SELECT auth.uid()) = user_id);

ALTER POLICY projects_delete_own ON public.projects
  USING ((SELECT auth.uid()) = author_id);
ALTER POLICY projects_insert_own ON public.projects
  WITH CHECK ((SELECT auth.uid()) = author_id);

ALTER POLICY reviews_delete_own ON public.reviews
  USING ((SELECT auth.uid()) = user_id);
ALTER POLICY reviews_insert_own ON public.reviews
  WITH CHECK ((SELECT auth.uid()) = user_id);
ALTER POLICY reviews_update_own ON public.reviews
  USING ((SELECT auth.uid()) = user_id);

ALTER POLICY subdomains_select_own_or_admin ON public.subdomains
  USING ((owner_id = (SELECT auth.uid())) OR (SELECT public.is_admin()));

ALTER POLICY tip_comments_delete_own ON public.tip_comments
  USING ((SELECT auth.uid()) = user_id);
ALTER POLICY tip_comments_insert_own ON public.tip_comments
  WITH CHECK ((SELECT auth.uid()) = user_id);
ALTER POLICY tip_comments_update_own ON public.tip_comments
  USING ((SELECT auth.uid()) = user_id);

ALTER POLICY tip_likes_delete_own ON public.tip_likes
  USING ((SELECT auth.uid()) = user_id);
ALTER POLICY tip_likes_insert_own ON public.tip_likes
  WITH CHECK ((SELECT auth.uid()) = user_id);

ALTER POLICY tips_delete_own ON public.tips
  USING ((SELECT auth.uid()) = author_id);
ALTER POLICY tips_insert_own ON public.tips
  WITH CHECK ((SELECT auth.uid()) = author_id);
ALTER POLICY tips_update_own ON public.tips
  USING ((SELECT auth.uid()) = author_id);

ALTER POLICY users_insert_self ON public.users
  WITH CHECK ((SELECT auth.uid()) = id);
ALTER POLICY users_update_self ON public.users
  USING ((SELECT auth.uid()) = id);
