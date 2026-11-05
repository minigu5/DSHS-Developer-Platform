-- 2026-11-05 관리자 대시보드 최종 리뷰 반영
-- 1) public.is_banned 를 authenticated 가 부를 수 있어서 누구나 REST(/rpc/is_banned)로 남의 차단 여부를 알 수 있었다.
--    가드(INVOKER)가 부르는 판정 함수는 API 로 열리지 않는 private 스키마로 옮기고, public.is_banned 는 service_role 만.
-- 2) 공지(announcements)는 로그인한 누구나 쓸 수 있는데 가드가 없어 차단된 사람이 공지로 우회할 수 있었다.
-- 3) 닉네임이 비어 있을 때(재가입·관리자가 비움) 처음 정하는 것까지 막아 온보딩에 갇혔다 → 비어 있을 때 처음 정하는 건 허용.

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.is_banned(p_uid uuid)
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
REVOKE ALL ON FUNCTION private.is_banned(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.is_banned(uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.is_banned(uuid) FROM authenticated;

CREATE OR REPLACE FUNCTION public.guard_banned_writes()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF private.is_banned((SELECT auth.uid()))
       OR private.is_banned(nullif(to_jsonb(NEW) ->> TG_ARGV[0], '')::uuid) THEN
      RAISE EXCEPTION 'user_banned' USING ERRCODE = '42501';
    END IF;
  ELSIF current_user IN ('anon', 'authenticated') AND private.is_banned((SELECT auth.uid())) THEN
    RAISE EXCEPTION 'user_banned' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.users_guard_profile()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.nickname IS DISTINCT FROM OLD.nickname OR NEW.bio IS DISTINCT FROM OLD.bio THEN
    -- 비어 있던 닉네임을 처음 정하는 것(온보딩)은 차단 중에도 허용 — 막으면 미들웨어가 온보딩으로만 보내 사이트를 못 쓴다
    IF current_user IN ('anon', 'authenticated')
       AND ((OLD.nickname IS NOT NULL AND NEW.nickname IS DISTINCT FROM OLD.nickname) OR NEW.bio IS DISTINCT FROM OLD.bio)
       AND private.is_banned((SELECT auth.uid())) THEN
      RAISE EXCEPTION 'user_banned' USING ERRCODE = '42501';
    END IF;
    NEW.profile_updated_at := now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER zz_ban_guard BEFORE INSERT OR UPDATE ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.guard_banned_writes('author_id');
