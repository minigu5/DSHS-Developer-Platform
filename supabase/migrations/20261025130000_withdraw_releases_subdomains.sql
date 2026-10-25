-- 탈퇴(withdraw_account)가 주소 받기와 부딪히던 문제 (2026-10-25)
-- 살아 있는 주소가 있는 학생이 탈퇴하면 auth.users → users → projects CASCADE 를
-- projects_block_delete_with_subdomain 트리거가 막아 탈퇴 전체가 실패했다. 주소를 먼저 반납한다.
-- 나머지 본문은 20261025090000_privacy_consents.sql 과 같다. 권한(service_role 전용)은 CREATE OR REPLACE 로 유지된다.

CREATE OR REPLACE FUNCTION public.withdraw_account(p_user_id uuid) RETURNS text[]
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

  -- 주소 받기: 살아 있는 주소를 먼저 반납한다. 안 하면 프로젝트 삭제 트리거(projects_block_delete_with_subdomain)가
  -- CASCADE 를 막아 탈퇴가 실패한다. DNS 레코드는 서버 액션이 바로 지우고, 놓친 것은 매일 점검이 고아로 지운다.
  UPDATE public.subdomains
     SET status = 'released', released_reason = 'account_withdrawn', cf_record_ids = '{}'
   WHERE owner_id = p_user_id AND status IN ('reserved', 'pending', 'active', 'broken');

  DELETE FROM auth.users WHERE id = p_user_id;

  RETURN v_urls;
END;
$$;
