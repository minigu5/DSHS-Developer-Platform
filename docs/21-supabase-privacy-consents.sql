-- ============================================================
-- DSHS Developer Platform — 개인정보 처리방침 동의 기록 + 동의 철회(탈퇴)
-- ============================================================
-- 1. privacy_consents  — 동의한 정책 버전과 시각. 계정당 버전별 한 줄.
--    쓰기는 서버 액션(service_role)만 한다 → 시각을 브라우저가 못 바꾼다.
-- 2. withdraw_account() — 동의 철회 = 계정과 내가 쓴 글 전부 삭제. service_role 전용.
--
-- 03-supabase-schema.sql 의 public.users 와 16-supabase-click-tracking.sql 의 project_clicks,
-- 18-supabase-guide-revisions.sql 의 guide_revisions 가 이미 있다는 전제.
-- 운영에는 supabase/migrations/20261025090000_privacy_consents.sql 로 적용.

-- 1. privacy_consents
CREATE TABLE public.privacy_consents (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  policy_version text NOT NULL CHECK (policy_version ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'),
  consented_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, policy_version)
);

ALTER TABLE public.privacy_consents ENABLE ROW LEVEL SECURITY;

-- 본인 기록만 읽는다. INSERT/UPDATE/DELETE 정책은 일부러 만들지 않는다 → 직접 쓰기 전부 거부.
CREATE POLICY "privacy_consents_select_own"
  ON public.privacy_consents FOR SELECT USING (auth.uid() = user_id);


-- 2. withdraw_account — 동의 철회(탈퇴). 한 트랜잭션으로 처리한다.
--    반환: 지워야 할 이미지 URL 목록(아바타·프로젝트 아이콘·팁 대표 이미지). Cloudinary 정리는 서버 액션이 한다.
--    - 다른 사람 프로젝트의 team_members·allowed_users 에서 내 이메일을 뺀다.
--    - 가이드 수정 기록은 내용(위키)은 남기고 author_email 만 무작위 별칭으로 바꾼다.
--    - project_clicks 는 user_id 가 NULL 이 되면 user_or_ip_required 검사에 걸리므로 먼저 지운다.
--    - 마지막에 auth.users 를 지우면 users → 프로젝트·팁·리뷰·댓글·좋아요·해줘·공지·동의 기록이 CASCADE 로 지워진다.
CREATE FUNCTION public.withdraw_account(p_user_id uuid) RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_alias text;
  v_urls  text[];
BEGIN
  SELECT email INTO v_email FROM public.users WHERE id = p_user_id;
  IF v_email IS NULL THEN
    RAISE EXCEPTION 'user_not_found' USING ERRCODE = 'P0001';
  END IF;

  SELECT coalesce(array_agg(DISTINCT t.u), '{}') INTO v_urls
  FROM (
    SELECT avatar_url AS u FROM public.users    WHERE id = p_user_id
    UNION ALL
    SELECT icon_url         FROM public.projects WHERE author_id = p_user_id
    UNION ALL
    SELECT cover_url        FROM public.tips     WHERE author_id = p_user_id
  ) t
  WHERE t.u IS NOT NULL;

  UPDATE public.projects
     SET team_members  = array_remove(team_members, v_email),
         allowed_users = array_remove(allowed_users, v_email)
   WHERE author_id <> p_user_id
     AND (v_email = ANY(team_members) OR v_email = ANY(allowed_users));

  v_alias := 'withdrawn-' || left(md5(random()::text || clock_timestamp()::text), 8);
  UPDATE public.guide_revisions
     SET author_email = v_alias
   WHERE author_id = p_user_id OR author_email = v_email;

  DELETE FROM public.project_clicks WHERE user_id = p_user_id;

  DELETE FROM auth.users WHERE id = p_user_id;

  RETURN v_urls;
END;
$$;

-- 브라우저(anon/authenticated)가 직접 부르면 남의 계정을 지울 수 있으므로 service_role 만 허용
REVOKE ALL ON FUNCTION public.withdraw_account(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.withdraw_account(uuid) TO service_role;
