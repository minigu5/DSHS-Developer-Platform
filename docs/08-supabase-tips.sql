-- ============================================================
-- DSHS Developer Platform — 개발 팁(블로그) 기능 스키마
-- ============================================================
-- 개발자들이 마크다운으로 팁 글을 작성/수정하고,
-- 좋아요 / 댓글을 남길 수 있는 기능을 위한 테이블들.
--
-- 03-supabase-schema.sql 의 public.users 가 이미 존재한다는 전제.
-- 이 스크립트만 추가로 실행하면 됩니다. (기존 테이블은 건드리지 않음)

-- 안전을 위해 재실행 가능하도록 DROP 후 재생성
DROP TABLE IF EXISTS public.tip_comments CASCADE;
DROP TABLE IF EXISTS public.tip_likes CASCADE;
DROP TABLE IF EXISTS public.tips CASCADE;


-- 1. tips — 팁 글
CREATE TABLE public.tips (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id   uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title       text NOT NULL,
  summary     text,                       -- 목록에 보일 한 줄 요약 (선택)
  content     text NOT NULL,              -- 본문 (마크다운)
  cover_url   text,                        -- 대표 이미지 URL (선택)
  tags        text[] NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tips ENABLE ROW LEVEL SECURITY;

-- 팁은 모두 공개 (로그인 안 해도 열람 가능)
CREATE POLICY "tips_select_all"
  ON public.tips FOR SELECT USING (true);

CREATE POLICY "tips_insert_own"
  ON public.tips FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "tips_update_own"
  ON public.tips FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY "tips_delete_own"
  ON public.tips FOR DELETE USING (auth.uid() = author_id);

CREATE INDEX tips_created_at_idx ON public.tips (created_at DESC);
CREATE INDEX tips_author_idx ON public.tips (author_id);


-- 2. tip_likes — 좋아요 (한 사용자가 한 팁에 한 번)
CREATE TABLE public.tip_likes (
  tip_id      uuid NOT NULL REFERENCES public.tips(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tip_id, user_id)
);

ALTER TABLE public.tip_likes ENABLE ROW LEVEL SECURITY;

-- 좋아요 수 집계를 위해 모두 조회 가능
CREATE POLICY "tip_likes_select_all"
  ON public.tip_likes FOR SELECT USING (true);

CREATE POLICY "tip_likes_insert_own"
  ON public.tip_likes FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "tip_likes_delete_own"
  ON public.tip_likes FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX tip_likes_tip_idx ON public.tip_likes (tip_id);


-- 3. tip_comments — 댓글
CREATE TABLE public.tip_comments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tip_id      uuid NOT NULL REFERENCES public.tips(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content     text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tip_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tip_comments_select_all"
  ON public.tip_comments FOR SELECT USING (true);

CREATE POLICY "tip_comments_insert_own"
  ON public.tip_comments FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "tip_comments_update_own"
  ON public.tip_comments FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "tip_comments_delete_own"
  ON public.tip_comments FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX tip_comments_tip_idx ON public.tip_comments (tip_id, created_at);


-- 4. updated_at 자동 갱신 트리거 (tips)
CREATE OR REPLACE FUNCTION public.touch_tips_updated_at()
RETURNS trigger AS $$
BEGIN
  new.updated_at = now();
  RETURN new;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tips_set_updated_at
  BEFORE UPDATE ON public.tips
  FOR EACH ROW EXECUTE FUNCTION public.touch_tips_updated_at();


-- 5. PostgREST schema cache 리로드
NOTIFY pgrst, 'reload schema';
