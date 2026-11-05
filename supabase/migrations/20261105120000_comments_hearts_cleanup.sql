-- 리뷰 → 댓글 정리 (B 단계 — 20261105110000_comments_hearts.sql 다음, 새 코드 배포 뒤에 적용)
--
-- 1) 옛 코드 호환용 view reviews 와 별점 칸 rating 을 지운다.
-- 2) 댓글 쓴 사람 user_id 를 anon/authenticated 가 읽지 못하게 한다 — 익명 프로젝트 소유자의 댓글이 API 로
--    드러나지 않게(화면은 public_user_id 로만 사람을 붙인다). select=* 도 막히므로 앱은 칸을 적어 읽는다.
--    RLS 정책이 같은 표의 user_id 를 보는 것은 칸 권한 검사 대상이 아니라 그대로 동작한다(projects.author_id 와 같음).
--    ⚠️ project_comments 에 새 칸을 만들면 GRANT SELECT (새 칸) 를 같이 할 것.

DROP VIEW IF EXISTS public.reviews;

ALTER TABLE public.project_comments DROP CONSTRAINT IF EXISTS reviews_rating_check;
ALTER TABLE public.project_comments DROP COLUMN rating;

REVOKE SELECT ON public.project_comments FROM anon, authenticated;
GRANT SELECT (id, project_id, content, created_at, is_author, public_user_id)
  ON public.project_comments TO anon, authenticated;

-- 3) 없는 프로젝트에 댓글을 넣으면 is_author 가 NULL 이 되어 NOT NULL 오류가 외래 키 오류보다 먼저 났다 — false 로.
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
  NEW.is_author := coalesce(NEW.user_id = v_author, false);
  NEW.public_user_id := CASE WHEN NEW.is_author AND v_role = 'anonymous' THEN NULL ELSE NEW.user_id END;
  RETURN NEW;
END;
$$;

-- 4) 1인 1개 제한이 풀려 남용 여지가 커졌다(최종 검토 지적): 볼 수 없는 프로젝트(남의 비공개)에는 댓글을 못 달고,
--    글 길이 500자 제한을 DB 에도 둔다(화면 comment-form.tsx 와 같은 값).
ALTER POLICY project_comments_insert_own ON public.project_comments
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id)
  );

ALTER TABLE public.project_comments
  ADD CONSTRAINT project_comments_content_length CHECK (char_length(content) BETWEEN 1 AND 500);
