-- 2026-11-05 관리자 대시보드: 사용자 차단·확인함·관리 기록
-- 설계 docs/superpowers/specs/2026-11-05-admin-dashboard-design.md
--
-- 차단(사용자 결정): 기간을 정해서(무제한 포함) 등록만 막는다 — 로그인·열람·내 글 삭제·하트는 그대로.
-- 이미 쓴 글 수정과 프로필 닉네임·소개 변경도 막는다(기존 글을 욕설로 고치는 우회 방지, 설계 판단).
-- 탈퇴 후 같은 이메일로 다시 가입해 피하지 못하게 이메일 해시(SHA-256)와 끝나는 날만 차단이 끝날 때까지 남긴다.

-- ───────────────────────── 표 ─────────────────────────

CREATE TABLE public.user_bans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NULL REFERENCES public.users(id) ON DELETE SET NULL,
  email_hash text NOT NULL,
  until timestamptz NULL,            -- NULL = 무제한
  reason text NULL CHECK (reason IS NULL OR char_length(reason) <= 200),
  from_anonymous boolean NOT NULL DEFAULT false,  -- 익명 글에서 건 차단 — 관리 화면에도 '익명 작성자'로
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL REFERENCES public.users(id) ON DELETE SET NULL
);
CREATE INDEX user_bans_user_id_idx ON public.user_bans (user_id);
CREATE INDEX user_bans_email_hash_idx ON public.user_bans (email_hash);
CREATE INDEX user_bans_created_by_idx ON public.user_bans (created_by);

CREATE TABLE public.admin_dismissals (
  kind text NOT NULL,
  item_id text NOT NULL,
  dismissed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (kind, item_id)
);

CREATE TABLE public.admin_actions (
  id bigserial PRIMARY KEY,
  action text NOT NULL CHECK (action IN ('delete', 'ban', 'unban', 'private', 'dismiss', 'revert')),
  target_kind text NULL,
  target_id text NULL,
  target_user_id uuid NULL REFERENCES public.users(id) ON DELETE SET NULL,
  detail jsonb NULL,                 -- 지운 글 내용은 넣지 않는다
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX admin_actions_target_user_id_idx ON public.admin_actions (target_user_id);

-- 관리 표는 서비스 키만 — RLS 켜고 정책 없음
ALTER TABLE public.user_bans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_dismissals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.user_bans, public.admin_dismissals, public.admin_actions FROM anon, authenticated;
REVOKE ALL ON SEQUENCE public.admin_actions_id_seq FROM anon, authenticated;

-- 대시보드 "최신 글"에 프로필 변경을 띄우려고. 닉네임·소개가 바뀔 때 아래 트리거가 채운다.
ALTER TABLE public.users ADD COLUMN profile_updated_at timestamptz NULL;

-- ───────────────────────── 함수 ─────────────────────────

CREATE OR REPLACE FUNCTION public.email_hash(p_email text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT encode(pg_catalog.sha256(convert_to(lower(btrim(p_email)), 'UTF8')), 'hex');
$$;

CREATE OR REPLACE FUNCTION public.is_banned(p_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT p_uid IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.user_bans b
    WHERE (b.until IS NULL OR b.until > now())
      AND (
        b.user_id = p_uid
        OR b.email_hash = (SELECT public.email_hash(u.email) FROM auth.users u WHERE u.id = p_uid)
      )
  );
$$;
REVOKE ALL ON FUNCTION public.is_banned(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_banned(uuid) TO authenticated, service_role;

-- 로그인한 본인의 차단(가장 늦게 끝나는 것 하나). 글쓰기 화면 안내용
CREATE OR REPLACE FUNCTION public.my_ban()
RETURNS TABLE (until timestamptz, unlimited boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT b.until, b.until IS NULL
  FROM public.user_bans b
  WHERE (b.until IS NULL OR b.until > now())
    AND (
      b.user_id = (SELECT auth.uid())
      OR b.email_hash = (SELECT public.email_hash(u.email) FROM auth.users u WHERE u.id = (SELECT auth.uid()))
    )
  ORDER BY b.until DESC NULLS FIRST
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.my_ban() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_ban() TO authenticated;

-- 쓰기 가드. SECURITY INVOKER 여야 current_user 로 사용자 키인지 가릴 수 있다(차단 판정은 is_banned 가 DEFINER).
--  INSERT: 로그인한 사람(auth.uid()) 또는 행의 주인(TG_ARGV[0] 칸)이 차단 중이면 거절.
--          주인 칸 검사는 서비스 키로 대신 쓰는 경로(가이드 위키 저장·주소 예약)를 막는다.
--  UPDATE: 사용자 키(anon/authenticated)이고 로그인한 사람이 차단 중일 때만 — 관리자·서비스 키 수정은 통과.
CREATE OR REPLACE FUNCTION public.guard_banned_writes()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF public.is_banned((SELECT auth.uid()))
       OR public.is_banned(nullif(to_jsonb(NEW) ->> TG_ARGV[0], '')::uuid) THEN
      RAISE EXCEPTION 'user_banned' USING ERRCODE = '42501';
    END IF;
  ELSIF current_user IN ('anon', 'authenticated') AND public.is_banned((SELECT auth.uid())) THEN
    RAISE EXCEPTION 'user_banned' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

-- users: 가입(INSERT)은 막지 않는다. 로그인 때 도는 upsert(같은 값 다시 쓰기)가 깨지지 않게
-- 닉네임·소개가 실제로 바뀔 때만 검사하고, 바뀌면 profile_updated_at 을 채운다.
CREATE OR REPLACE FUNCTION public.users_guard_profile()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.nickname IS DISTINCT FROM OLD.nickname OR NEW.bio IS DISTINCT FROM OLD.bio THEN
    IF current_user IN ('anon', 'authenticated') AND public.is_banned((SELECT auth.uid())) THEN
      RAISE EXCEPTION 'user_banned' USING ERRCODE = '42501';
    END IF;
    NEW.profile_updated_at := now();
  END IF;
  RETURN NEW;
END;
$$;

-- 이름을 zz_ 로 시작해 같은 표의 다른 BEFORE 트리거(댓글 작성자 채우기 등) 뒤에 돈다
CREATE TRIGGER zz_ban_guard BEFORE INSERT OR UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.guard_banned_writes('author_id');
CREATE TRIGGER zz_ban_guard BEFORE INSERT OR UPDATE ON public.project_comments
  FOR EACH ROW EXECUTE FUNCTION public.guard_banned_writes('user_id');
CREATE TRIGGER zz_ban_guard BEFORE INSERT OR UPDATE ON public.tips
  FOR EACH ROW EXECUTE FUNCTION public.guard_banned_writes('author_id');
CREATE TRIGGER zz_ban_guard BEFORE INSERT OR UPDATE ON public.tip_comments
  FOR EACH ROW EXECUTE FUNCTION public.guard_banned_writes('user_id');
CREATE TRIGGER zz_ban_guard BEFORE INSERT OR UPDATE ON public.ideas
  FOR EACH ROW EXECUTE FUNCTION public.guard_banned_writes('author_id');
CREATE TRIGGER zz_ban_guard BEFORE INSERT ON public.guide_revisions
  FOR EACH ROW EXECUTE FUNCTION public.guard_banned_writes('author_id');
CREATE TRIGGER zz_ban_guard BEFORE INSERT ON public.subdomains
  FOR EACH ROW EXECUTE FUNCTION public.guard_banned_writes('owner_id');
CREATE TRIGGER zz_profile_guard BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.users_guard_profile();

-- ───────────────────────── 탈퇴 ─────────────────────────
-- 20261025130000 본문 그대로 + 맨 앞에 차단 기록 정리:
-- 차단 중이면 이유·건 사람을 지우고 이메일 해시·끝나는 날만 남긴다(user_id 는 FK 가 SET NULL). 끝난 차단은 지운다.

CREATE OR REPLACE FUNCTION public.withdraw_account(p_user_id uuid)
 RETURNS text[]
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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
$function$;
