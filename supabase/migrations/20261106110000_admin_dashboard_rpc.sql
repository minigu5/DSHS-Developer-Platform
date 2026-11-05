-- 2026-11-05 관리자 대시보드 읽기 함수. 전부 SECURITY DEFINER + EXECUTE service_role 전용 —
-- 서버(src/lib/admin/read.ts)가 getUser() + isDeveloper() 확인 뒤 서비스 키로 부른다.
-- 반환 jsonb 의 키 이름은 src/lib/admin/today.ts 타입(FeedItem·Burst·GuideShrink·EndedBan)과 같다.
-- 익명 프로젝트(author_role='anonymous')와 작성자가 가려진 댓글(public_user_id IS NULL)은 authorName 을 NULL 로 —
-- authorId 는 차단 액션용으로 채우고, 서버가 화면으로 넘길 때 뺀다.

-- 모든 사람 글을 한 모양으로. p_after 이후만.
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
  SELECT 'tip', t.id::text, t.created_at, t.author_id, coalesce(u.nickname, u.full_name), false,
         t.title, left(coalesce(t.content, ''), 300), '/tips/' || t.id
  FROM public.tips t LEFT JOIN public.users u ON u.id = t.author_id
  WHERE t.created_at > p_after
  UNION ALL
  SELECT 'tip_comment', c.id::text, c.created_at, c.user_id, coalesce(u.nickname, u.full_name), false,
         NULL, c.content, '/tips/' || c.tip_id
  FROM public.tip_comments c LEFT JOIN public.users u ON u.id = c.user_id
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

-- 한 줄을 FeedItem jsonb 로
CREATE OR REPLACE FUNCTION public.admin_item_json(
  p_kind text, p_id text, p_created_at timestamptz, p_author_id uuid, p_author_name text,
  p_anonymous boolean, p_title text, p_body text, p_href text
)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT jsonb_build_object(
    'kind', p_kind, 'id', p_id, 'createdAt', p_created_at, 'authorId', p_author_id,
    'authorName', p_author_name, 'anonymous', p_anonymous, 'title', p_title, 'body', p_body, 'href', p_href
  );
$$;

-- 최신 글(최신순). p_kinds NULL = 전부, p_before 보다 이전만
CREATE OR REPLACE FUNCTION public.admin_recent_content(
  p_kinds text[] DEFAULT NULL, p_before timestamptz DEFAULT NULL, p_limit int DEFAULT 50
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT coalesce(jsonb_agg(public.admin_item_json(c.kind, c.id, c.created_at, c.author_id, c.author_name,
                                                   c.anonymous, c.title, c.body, c.href)
                            ORDER BY c.created_at DESC), '[]'::jsonb)
  FROM (
    SELECT * FROM public.admin_content('-infinity')
    WHERE (p_kinds IS NULL OR kind = ANY (p_kinds))
      AND (p_before IS NULL OR created_at < p_before)
    ORDER BY created_at DESC
    LIMIT least(greatest(p_limit, 1), 100)
  ) c;
$$;

-- 몰아서 올린 것: 같은 작성자·같은 종류의 글이 앞 글과 10분 이내로 이어진 묶음 중 3개 이상.
-- 익명 글은 익명 글끼리만 묶는다. authorKey 는 작성자를 드러내지 않는 불투명 값.
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
    WHERE c.kind IN ('project', 'project_comment', 'tip', 'tip_comment', 'idea') AND c.author_id IS NOT NULL
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

-- 가이드 위키에서 한 번에 크게 지운 수정(지운 글자 − 더한 글자 ≥ 300)
CREATE OR REPLACE FUNCTION public.admin_guide_shrinks(p_since interval DEFAULT '2 days')
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT coalesce(jsonb_agg(jsonb_build_object(
           'revId', g.id, 'docKey', g.doc_key, 'docTitle', coalesce(g.title, g.doc_key),
           'minus', coalesce((g.stats ->> 'minus')::int, 0), 'plus', coalesce((g.stats ->> 'plus')::int, 0),
           'createdAt', g.created_at, 'revNo', g.rev_no, 'authorId', g.author_id
         ) ORDER BY g.created_at DESC), '[]'::jsonb)
  FROM public.guide_revisions g
  WHERE g.kind = 'edit'
    AND g.created_at > now() - p_since
    AND coalesce((g.stats ->> 'minus')::int, 0) - coalesce((g.stats ->> 'plus')::int, 0) >= 300;
$$;

-- 차단 목록: 지금 차단 중(active) + 최근 2일 안에 끝난 것(ended). 익명 글에서 건 차단·탈퇴한 사람은 name NULL
CREATE OR REPLACE FUNCTION public.admin_bans()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH b AS (
    SELECT b.*, CASE WHEN b.from_anonymous THEN NULL ELSE coalesce(u.nickname, u.full_name) END AS name
    FROM public.user_bans b LEFT JOIN public.users u ON u.id = b.user_id
  )
  SELECT jsonb_build_object(
    'active', coalesce((SELECT jsonb_agg(jsonb_build_object(
                'banId', b.id, 'userId', b.user_id, 'name', b.name, 'anonymous', b.from_anonymous,
                'until', b.until, 'reason', b.reason, 'createdAt', b.created_at) ORDER BY b.created_at DESC)
              FROM b WHERE b.until IS NULL OR b.until > now()), '[]'::jsonb),
    'ended', coalesce((SELECT jsonb_agg(jsonb_build_object(
                'banId', b.id, 'userId', b.user_id, 'name', b.name, 'anonymous', b.from_anonymous,
                'until', b.until) ORDER BY b.until DESC)
              FROM b WHERE b.until <= now() AND b.until > now() - interval '2 days'), '[]'::jsonb)
  );
$$;

-- 사이트 현황 숫자. 날짜 경계는 한국 시간
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
      'tips', (SELECT count(*) FROM public.tips WHERE created_at >= v_range.from_at AND created_at < v_range.to_at),
      'tipComments', (SELECT count(*) FROM public.tip_comments WHERE created_at >= v_range.from_at AND created_at < v_range.to_at),
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

REVOKE ALL ON FUNCTION public.admin_content(timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_recent_content(text[], timestamptz, int) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_bursts(interval) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_guide_shrinks(interval) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_bans() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_site_stats() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_content(timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_recent_content(text[], timestamptz, int) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_bursts(interval) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_guide_shrinks(interval) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_bans() TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_site_stats() TO service_role;
