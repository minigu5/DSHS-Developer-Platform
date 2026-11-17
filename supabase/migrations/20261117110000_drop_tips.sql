-- 2026-11-17 개발 팁 기능 삭제(사용자 결정). 코드는 951c346에서 이미 걷어냈고, 여기서 DB를 정리한다.
-- ⚠️ 코드 배포가 끝난 뒤에 올릴 것 — 옛 코드가 tips 를 읽는 동안 지우면 홈·프로필이 깨진다.
-- 1) tips·tip_comments·tip_likes 를 쓰던 함수 4개를 팁 없이 다시 만든다(본문은 이전 정의 그대로, 팁 부분만 뺌).
--    - admin_content / admin_bursts / admin_site_stats : 20261106110000
--    - withdraw_account : 20261106100000 (+ 20261112100000 의 search_path 고정)
-- 2) 테이블을 지운다(트리거·정책·인덱스·팁 전용 함수 포함). tips 가 지워지면 tip_comments·tip_likes 도 따라 지워진다.

CREATE OR REPLACE FUNCTION public.admin_content(p_after timestamptz)
RETURNS TABLE (
  kind text, id text, created_at timestamptz, author_id uuid, author_name text,
  anonymous boolean, title text, body text, href text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT 'project', p.id::text, p.created_at, p.author_id,
         CASE WHEN p.author_role = 'anonymous' THEN NULL ELSE coalesce(u.nickname, u.full_name) END,
         p.author_role = 'anonymous', p.title,
         btrim(coalesce(p.short_description, '') || ' ' || left(coalesce(p.description, ''), 300)),
         '/projects/' || p.id
  FROM public.projects p LEFT JOIN public.users u ON u.id = p.author_id
  WHERE p.created_at > p_after
  UNION ALL
  SELECT 'project_comment', c.id::text, c.created_at, c.user_id,
         CASE WHEN c.public_user_id IS NULL THEN NULL ELSE coalesce(u.nickname, u.full_name) END,
         c.public_user_id IS NULL, NULL, c.content, '/projects/' || c.project_id
  FROM public.project_comments c LEFT JOIN public.users u ON u.id = c.user_id
  WHERE c.created_at > p_after
  UNION ALL
  SELECT 'idea', i.id::text, i.created_at, i.author_id, coalesce(u.nickname, u.full_name), false,
         i.title, left(coalesce(i.content, ''), 300), '/haejwo/' || i.id
  FROM public.ideas i LEFT JOIN public.users u ON u.id = i.author_id
  WHERE i.created_at > p_after
  UNION ALL
  SELECT 'guide', g.id::text, g.created_at, g.author_id, coalesce(u.nickname, u.full_name), false,
         coalesce(g.title, g.doc_key), coalesce(g.summary, ''), '/guide-wiki/' || g.doc_key || '/history'
  FROM public.guide_revisions g LEFT JOIN public.users u ON u.id = g.author_id
  WHERE g.kind <> 'seed' AND g.created_at > p_after
  UNION ALL
  SELECT 'profile', u.id::text, u.profile_updated_at, u.id, coalesce(u.nickname, u.full_name), false,
         u.nickname, coalesce(u.bio, ''), '/developers/' || u.id
  FROM public.users u
  WHERE u.profile_updated_at > p_after;
$$;

CREATE OR REPLACE FUNCTION public.admin_bursts(p_since interval DEFAULT '2 days')
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH rows AS (
    SELECT c.*,
           CASE WHEN c.created_at - lag(c.created_at) OVER w <= interval '10 minutes' THEN 0 ELSE 1 END AS starts
    FROM public.admin_content(now() - p_since) c
    WHERE c.kind IN ('project', 'project_comment', 'idea') AND c.author_id IS NOT NULL
    WINDOW w AS (PARTITION BY c.kind, c.author_id, c.anonymous ORDER BY c.created_at)
  ), islands AS (
    SELECT r.*, sum(r.starts) OVER (PARTITION BY r.kind, r.author_id, r.anonymous ORDER BY r.created_at) AS island
    FROM rows r
  ), groups AS (
    SELECT i.kind, i.anonymous,
           md5(i.kind || ':' || i.author_id::text || ':' || i.anonymous::text || ':' || i.island::text) AS author_key,
           jsonb_agg(public.admin_item_json(i.kind, i.id, i.created_at, i.author_id, i.author_name,
                                            i.anonymous, i.title, i.body, i.href) ORDER BY i.created_at) AS items,
           max(i.created_at) AS last_at
    FROM islands i
    GROUP BY i.kind, i.author_id, i.anonymous, i.island
    HAVING count(*) >= 3
  )
  SELECT coalesce(jsonb_agg(jsonb_build_object('kind', g.kind, 'authorKey', g.author_key,
                                               'anonymous', g.anonymous, 'items', g.items)
                            ORDER BY g.last_at DESC), '[]'::jsonb)
  FROM groups g;
$$;

CREATE OR REPLACE FUNCTION public.admin_site_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_today timestamptz := date_trunc('day', now() AT TIME ZONE 'Asia/Seoul') AT TIME ZONE 'Asia/Seoul';
  v_result jsonb := '{}'::jsonb;
  v_range record;
BEGIN
  FOR v_range IN
    SELECT * FROM (VALUES
      ('today', v_today, 'infinity'::timestamptz),
      ('yesterday', v_today - interval '1 day', v_today),
      ('week', v_today - interval '6 days', 'infinity'::timestamptz)
    ) AS t(name, from_at, to_at)
  LOOP
    v_result := v_result || jsonb_build_object(v_range.name, jsonb_build_object(
      'users', (SELECT count(*) FROM public.users WHERE created_at >= v_range.from_at AND created_at < v_range.to_at),
      'projects', (SELECT count(*) FROM public.projects WHERE created_at >= v_range.from_at AND created_at < v_range.to_at),
      'projectComments', (SELECT count(*) FROM public.project_comments WHERE created_at >= v_range.from_at AND created_at < v_range.to_at),
      'ideas', (SELECT count(*) FROM public.ideas WHERE created_at >= v_range.from_at AND created_at < v_range.to_at),
      'guideEdits', (SELECT count(*) FROM public.guide_revisions WHERE kind <> 'seed' AND created_at >= v_range.from_at AND created_at < v_range.to_at),
      'clicks', (SELECT count(*) FROM public.project_clicks WHERE created_at >= v_range.from_at AND created_at < v_range.to_at)
    ));
  END LOOP;
  RETURN v_result || jsonb_build_object(
    'activeDomains', (SELECT count(*) FROM public.subdomains WHERE status = 'active'),
    'activeBans', (SELECT count(DISTINCT coalesce(user_id::text, email_hash)) FROM public.user_bans WHERE until IS NULL OR until > now())
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.withdraw_account(p_user_id uuid)
 RETURNS text[]
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_email text;
  v_alias text;
  v_urls  text[];
BEGIN
  SELECT email INTO v_email FROM public.users WHERE id = p_user_id;
  IF v_email IS NULL THEN
    RAISE EXCEPTION 'user_not_found' USING ERRCODE = 'P0001';
  END IF;

  DELETE FROM public.user_bans
   WHERE user_id = p_user_id AND until IS NOT NULL AND until <= now();
  UPDATE public.user_bans
     SET reason = NULL, created_by = NULL, from_anonymous = false
   WHERE user_id = p_user_id;
  UPDATE public.user_bans SET created_by = NULL WHERE created_by = p_user_id;

  SELECT coalesce(array_agg(DISTINCT t.u), '{}') INTO v_urls
  FROM (
    SELECT avatar_url AS u FROM public.users    WHERE id = p_user_id
    UNION ALL
    SELECT icon_url         FROM public.projects WHERE author_id = p_user_id
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
$function$;

-- 테이블 삭제(자식 먼저). 팁 전용 함수도 함께 지운다.
DROP TABLE public.tip_likes;
DROP TABLE public.tip_comments;
DROP TABLE public.tips;
DROP FUNCTION IF EXISTS public.tip_likes_count();
DROP FUNCTION IF EXISTS public.tips_guard_like_count();
DROP FUNCTION IF EXISTS public.touch_tips_updated_at();
