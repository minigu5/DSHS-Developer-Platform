-- 2026-11-12 팁 좋아요 누른 사람 숨기기 1단계(A) — 프로젝트 하트(20261108120000)와 같은 방식.
-- 사용자 결정: 누가 눌렀는지는 본인·관리자만. tip_likes 를 본인 행만 읽게 바꾸면(B, 코드 배포 뒤 별도 migration)
-- tip_likes(count) 가 내 좋아요만 세게 되므로, 먼저 수를 트리거가 채우는 tips.like_count 로 옮긴다.

ALTER TABLE public.tips
  ADD COLUMN like_count integer NOT NULL DEFAULT 0 CHECK (like_count >= 0);

-- 20261112100000 부터 새 함수는 기본 EXECUTE 가 없다 — 아래는 트리거 함수라 GRANT 가 필요 없다.

-- 좋아요 수만 바뀐 건 글을 고친 게 아니다 — 최근 수정 시각을 건드리지 않는다(아래 채우기보다 먼저 바꿔야 채우기도 시각을 안 건드림)
CREATE OR REPLACE FUNCTION public.touch_tips_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF (to_jsonb(NEW) - 'like_count' - 'updated_at') = (to_jsonb(OLD) - 'like_count' - 'updated_at') THEN
    RETURN NEW;
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

UPDATE public.tips t
SET like_count = l.n
FROM (SELECT tip_id, count(*)::integer AS n FROM public.tip_likes GROUP BY tip_id) l
WHERE l.tip_id = t.id;

-- DEFINER: 좋아요를 누른 사람은 그 팁을 고칠 권한이 없다. current_user 가 함수 주인이 되어 아래 가드·zz_ban_guard 를 통과한다.
CREATE OR REPLACE FUNCTION public.tip_likes_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.tips SET like_count = like_count + 1 WHERE id = NEW.tip_id;
  ELSE
    -- 팁이 지워지며 따라 지워질 때는 고칠 행이 없다(0행)
    UPDATE public.tips SET like_count = greatest(like_count - 1, 0) WHERE id = OLD.tip_id;
  END IF;
  RETURN NULL;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.tip_likes_count() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER tip_likes_count
  AFTER INSERT OR DELETE ON public.tip_likes
  FOR EACH ROW EXECUTE FUNCTION public.tip_likes_count();

-- 사용자 키로는 like_count 를 못 바꾼다(글쓴이도). INVOKER 여야 current_user 로 사용자 키를 가린다.
CREATE OR REPLACE FUNCTION public.tips_guard_like_count()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF current_user NOT IN ('anon', 'authenticated') THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.like_count := 0;
  ELSIF NEW.like_count IS DISTINCT FROM OLD.like_count THEN
    RAISE EXCEPTION 'tips_like_count_locked' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.tips_guard_like_count() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER tips_guard_like_count
  BEFORE INSERT OR UPDATE ON public.tips
  FOR EACH ROW EXECUTE FUNCTION public.tips_guard_like_count();
