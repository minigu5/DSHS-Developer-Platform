-- ⚠️ 사람이 읽는 사본. 운영 반영은 supabase/migrations/20261025100000_subdomains.sql (2026-10-25 db push 완료).
-- DROP 이 없어 다시 실행하면 실패한다 — 운영 DB에 재실행 금지, 수정은 새 migration 으로.

-- ============================================================
-- DSHS Developer Platform — 서브도메인 빌려주기("주소 받기")
-- ============================================================
-- 웹사이트 프로젝트 소유자가 <이름>.dshs.dev 를 받는다. 우리는 Cloudflare 에 CNAME(+TXT)만 만든다.
-- 설계: docs/superpowers/specs/2026-10-25-subdomain-lending-design.md 6절
--
-- 권한(엄격):
--   - RLS 는 SELECT 만(본인·관리자). INSERT/UPDATE/DELETE 정책은 일부러 없다 → 직접 쓰기 전부 거부.
--   - 쓰기는 아래 subdomain_* 함수로만, EXECUTE 는 service_role 전용.
--     서버 액션(src/lib/domains/actions.ts)이 getUser() 로 사용자를 확인한 뒤 서비스 키로 부른다.
--   - 함수 안에서 소유자·관리자를 다시 확인한다. 3개 제한·프로젝트당 1개·이름 중복은 DB 가 강제한다.
-- 새 migration 전용 — DROP 이 없고, 다시 실행하면 실패한다. 수정은 새 migration 으로.
-- 검증: docs/22-supabase-subdomains-verify.sql (항상 롤백)


-- 1. 예약어 — src/lib/domains/name.ts RESERVED_NAMES 와 같은 목록
CREATE TABLE public.subdomain_reserved (name text PRIMARY KEY);
INSERT INTO public.subdomain_reserved (name) VALUES
  ('www'), ('api'), ('admin'), ('mail'), ('smtp'), ('imap'), ('pop'), ('ftp'), ('ns'), ('ns1'), ('ns2'), ('mx'),
  ('dev'), ('staging'), ('test'), ('status'), ('auth'), ('login'), ('static'), ('assets'), ('cdn'), ('app'),
  ('docs'), ('blog'), ('domains'), ('guide'), ('tips'), ('haejwo'), ('explore'), ('dshs'), ('root'),
  ('support'), ('help'), ('security');
ALTER TABLE public.subdomain_reserved ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subdomain_reserved_select_all" ON public.subdomain_reserved FOR SELECT USING (true);


-- 2. subdomains
CREATE TABLE public.subdomains (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL CHECK (name ~ '^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$' AND name !~ '^xn--'),
  -- 프로젝트가 지워져도 기록은 남긴다. 살아 있는 주소가 있으면 프로젝트 삭제는 트리거가 막는다.
  project_id      uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  owner_id        uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  host            text CHECK (host IN ('vercel', 'netlify', 'cloudflare-pages', 'github-pages', 'gitlab-pages', 'render', 'railway')),
  target          text,
  txt_records     jsonb NOT NULL DEFAULT '[]'::jsonb,   -- [{name, value}]
  cf_record_ids   text[] NOT NULL DEFAULT '{}',         -- Cloudflare 레코드 id (삭제용)
  status          text NOT NULL DEFAULT 'reserved'
                  CHECK (status IN ('reserved', 'pending', 'active', 'broken', 'released', 'revoked')),
  -- 소유 확인 토큰: 학생 사이트의 <meta name="dshs-verify" content="..."> 와 비교. 행마다 새로, 바꾸지 않는다
  verify_token    text NOT NULL DEFAULT replace(gen_random_uuid()::text, '-', ''),
  ever_active     boolean NOT NULL DEFAULT false,
  broken_since    timestamptz,
  checked_at      timestamptz,
  released_reason text,
  revoked_reason  text,
  revoked_by      uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- 이름: 살아 있거나 회수된(막아 둔) 것끼리 중복 불가. 반납된 이름은 다시 받을 수 있다
CREATE UNIQUE INDEX subdomains_name_live_uidx ON public.subdomains (name)
  WHERE status IN ('reserved', 'pending', 'active', 'broken', 'revoked');
-- 프로젝트당 살아 있는 주소 1개
CREATE UNIQUE INDEX subdomains_project_live_uidx ON public.subdomains (project_id)
  WHERE status IN ('reserved', 'pending', 'active', 'broken');
CREATE INDEX subdomains_owner_idx ON public.subdomains (owner_id);

ALTER TABLE public.subdomains ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subdomains_select_own_or_admin"
  ON public.subdomains FOR SELECT USING (owner_id = auth.uid() OR public.is_admin());


-- 3. 트리거
CREATE FUNCTION public.subdomains_touch() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER subdomains_touch BEFORE UPDATE ON public.subdomains
  FOR EACH ROW EXECUTE FUNCTION public.subdomains_touch();

-- 계정당 살아 있는 주소 3개. 같은 사용자의 예약을 줄 세워 동시 요청에도 넘지 않게
CREATE FUNCTION public.subdomains_limit() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('subdomains:' || NEW.owner_id::text));
  IF (SELECT count(*) FROM public.subdomains
      WHERE owner_id = NEW.owner_id AND status IN ('reserved', 'pending', 'active', 'broken')) >= 3 THEN
    RAISE EXCEPTION 'limit' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER subdomains_limit BEFORE INSERT ON public.subdomains
  FOR EACH ROW EXECUTE FUNCTION public.subdomains_limit();

-- DNS 레코드를 지우지 않고 프로젝트를 지우면 주인 없는 주소가 남는다 → 먼저 반납해야 한다
CREATE FUNCTION public.projects_block_delete_with_subdomain() RETURNS trigger LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.subdomains
             WHERE project_id = OLD.id AND status IN ('reserved', 'pending', 'active', 'broken')) THEN
    RAISE EXCEPTION 'project_has_subdomain' USING ERRCODE = 'P0001';
  END IF;
  RETURN OLD;
END $$;
CREATE TRIGGER projects_block_delete_with_subdomain BEFORE DELETE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.projects_block_delete_with_subdomain();


-- 4. 내부 도우미
CREATE FUNCTION public.subdomain_is_developer(p_user uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.users WHERE id = p_user AND email = 'ts250024@ts.hs.kr');
$$;

-- 호스트별 CNAME 대상 — src/lib/domains/hosts.ts cnameTarget 과 같은 규칙(DB 쪽 최후 방어선)
CREATE FUNCTION public.subdomain_target_ok(p_host text, p_target text) RETURNS boolean
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE p_host
    WHEN 'vercel' THEN p_target ~ '^(cname\.vercel-dns\.com|cname\.vercel-dns-[0-9]{1,4}\.com|[a-z0-9]{8,32}\.vercel-dns-[0-9]{1,4}\.com)$'
    WHEN 'netlify' THEN p_target ~ '^[a-z0-9-]+\.netlify\.app$'
    WHEN 'cloudflare-pages' THEN p_target ~ '^[a-z0-9-]+\.pages\.dev$'
    WHEN 'github-pages' THEN p_target ~ '^[a-z0-9-]+\.github\.io$'
    WHEN 'gitlab-pages' THEN p_target ~ '^[a-z0-9-]+\.gitlab\.io$'
    WHEN 'render' THEN p_target ~ '^[a-z0-9-]+\.onrender\.com$'
    WHEN 'railway' THEN p_target ~ '^[a-z0-9-]+\.up\.railway\.app$'
    ELSE false
  END;
$$;

-- TXT: 내 이름 아래(<x>.<이름>.dshs.dev)만, 예외로 Vercel 의 _vercel.dshs.dev 는 내 주소 값일 때만
CREATE FUNCTION public.subdomain_txt_ok(p_host text, p_name text, p_txt jsonb) RETURNS boolean
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  r jsonb;
  n text;
  v text;
BEGIN
  IF p_txt IS NULL OR jsonb_typeof(p_txt) <> 'array' OR jsonb_array_length(p_txt) > 2 THEN RETURN false; END IF;
  FOR r IN SELECT * FROM jsonb_array_elements(p_txt) LOOP
    n := r->>'name';
    v := r->>'value';
    IF n IS NULL OR v IS NULL OR char_length(v) NOT BETWEEN 1 AND 255 THEN RETURN false; END IF;
    IF n = '_vercel.dshs.dev' THEN
      IF p_host <> 'vercel' OR left(v, char_length('vc-domain-verify=' || p_name || '.dshs.dev,'))
           <> 'vc-domain-verify=' || p_name || '.dshs.dev,' THEN
        RETURN false;
      END IF;
    ELSIF n !~ ('^[a-z0-9_]([a-z0-9_-]*[a-z0-9_])?(\.[a-z0-9_]([a-z0-9_-]*[a-z0-9_])?)*\.' || p_name || '\.dshs\.dev$') THEN
      RETURN false;
    END IF;
  END LOOP;
  RETURN true;
END $$;


-- 5. 쓰기 함수 (service_role 전용). 오류는 RAISE EXCEPTION '<코드>' (P0001) — actions.ts 가 문구로 바꾼다

-- 예약: 이름을 잡아 두기만 한다(DNS 는 connect 때)
CREATE FUNCTION public.subdomain_reserve(p_user uuid, p_project uuid, p_name text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_name text := lower(btrim(coalesce(p_name, '')));
  v_proj record;
  v_id   uuid;
BEGIN
  SELECT author_id, types, url INTO v_proj FROM public.projects WHERE id = p_project;
  IF NOT FOUND OR v_proj.author_id IS DISTINCT FROM p_user THEN
    RAISE EXCEPTION 'not_owner' USING ERRCODE = 'P0001';
  END IF;
  IF NOT ('website' = ANY (v_proj.types)) OR v_proj.url IS NULL OR btrim(v_proj.url) = '' THEN
    RAISE EXCEPTION 'not_website' USING ERRCODE = 'P0001';
  END IF;
  IF v_name !~ '^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$' THEN
    RAISE EXCEPTION 'name_invalid' USING ERRCODE = 'P0001';
  END IF;
  IF v_name ~ '^xn--' OR EXISTS (SELECT 1 FROM public.subdomain_reserved WHERE name = v_name) THEN
    RAISE EXCEPTION 'name_reserved' USING ERRCODE = 'P0001';
  END IF;
  IF EXISTS (SELECT 1 FROM public.subdomains
             WHERE name = v_name AND status IN ('reserved', 'pending', 'active', 'broken', 'revoked')) THEN
    RAISE EXCEPTION 'name_taken' USING ERRCODE = 'P0001';
  END IF;
  IF EXISTS (SELECT 1 FROM public.subdomains
             WHERE project_id = p_project AND status IN ('reserved', 'pending', 'active', 'broken')) THEN
    RAISE EXCEPTION 'project_has_subdomain' USING ERRCODE = 'P0001';
  END IF;

  BEGIN
    INSERT INTO public.subdomains (name, project_id, owner_id)
    VALUES (v_name, p_project, p_user)
    RETURNING id INTO v_id;
  EXCEPTION WHEN unique_violation THEN
    -- 위 검사와 INSERT 사이에 다른 요청이 먼저 잡은 경우
    IF EXISTS (SELECT 1 FROM public.subdomains WHERE project_id = p_project
               AND status IN ('reserved', 'pending', 'active', 'broken')) THEN
      RAISE EXCEPTION 'project_has_subdomain' USING ERRCODE = 'P0001';
    END IF;
    RAISE EXCEPTION 'name_taken' USING ERRCODE = 'P0001';
  END;
  RETURN v_id;
END $$;

-- 연결: Cloudflare 에 레코드를 만든 뒤 그 결과를 기록한다(옛 레코드는 액션이 먼저 지움)
CREATE FUNCTION public.subdomain_connect(
  p_user uuid, p_id uuid, p_host text, p_target text, p_txt jsonb, p_record_ids text[]
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_row public.subdomains%ROWTYPE;
BEGIN
  SELECT * INTO v_row FROM public.subdomains WHERE id = p_id FOR UPDATE;
  IF NOT FOUND OR v_row.owner_id IS DISTINCT FROM p_user THEN
    RAISE EXCEPTION 'not_owner' USING ERRCODE = 'P0001';
  END IF;
  IF v_row.status NOT IN ('reserved', 'pending', 'active', 'broken') THEN
    RAISE EXCEPTION 'not_live' USING ERRCODE = 'P0001';
  END IF;
  IF p_host IS NULL OR p_target IS NULL OR NOT public.subdomain_target_ok(p_host, p_target) THEN
    RAISE EXCEPTION 'target_invalid' USING ERRCODE = 'P0001';
  END IF;
  IF NOT public.subdomain_txt_ok(p_host, v_row.name, coalesce(p_txt, '[]'::jsonb)) THEN
    RAISE EXCEPTION 'txt_invalid' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.subdomains
  SET host = p_host, target = p_target, txt_records = coalesce(p_txt, '[]'::jsonb),
      cf_record_ids = coalesce(p_record_ids, '{}'), status = 'pending', broken_since = NULL
  WHERE id = p_id;
END $$;

-- 확인 결과 기록 (연결 확인 버튼·매일 점검). 반환: 새 상태
CREATE FUNCTION public.subdomain_record_check(p_id uuid, p_ok boolean, p_now timestamptz) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_status text;
BEGIN
  SELECT status INTO v_status FROM public.subdomains WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0001'; END IF;
  IF v_status NOT IN ('pending', 'active', 'broken') THEN
    RETURN v_status;   -- 예약만 됐거나 이미 반납·회수된 주소는 그대로
  END IF;

  IF p_ok THEN
    UPDATE public.subdomains SET status = 'active', ever_active = true, broken_since = NULL, checked_at = p_now
    WHERE id = p_id;
    RETURN 'active';
  ELSIF v_status IN ('active', 'broken') THEN
    UPDATE public.subdomains SET status = 'broken', broken_since = coalesce(broken_since, p_now), checked_at = p_now
    WHERE id = p_id;
    RETURN 'broken';
  ELSE
    UPDATE public.subdomains SET checked_at = p_now WHERE id = p_id;
    RETURN v_status;
  END IF;
END $$;

-- 반납: 소유자·관리자, 또는 p_actor NULL(서비스 경로 — 매일 점검·프로젝트 삭제). 반환: 지울 Cloudflare 레코드 id
CREATE FUNCTION public.subdomain_release(p_actor uuid, p_id uuid, p_reason text) RETURNS text[]
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_row public.subdomains%ROWTYPE;
BEGIN
  SELECT * INTO v_row FROM public.subdomains WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0001'; END IF;
  IF p_actor IS NOT NULL AND v_row.owner_id IS DISTINCT FROM p_actor AND NOT public.subdomain_is_developer(p_actor) THEN
    RAISE EXCEPTION 'not_owner' USING ERRCODE = 'P0001';
  END IF;
  IF v_row.status NOT IN ('reserved', 'pending', 'active', 'broken') THEN
    RAISE EXCEPTION 'not_live' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.subdomains
  SET status = 'released', released_reason = left(coalesce(p_reason, ''), 200), cf_record_ids = '{}'
  WHERE id = p_id;
  RETURN v_row.cf_record_ids;
END $$;

-- 회수(관리자): 이름은 막아 둔다(revoked 도 이름 중복 검사에 포함). 반환: 지울 레코드 id
CREATE FUNCTION public.subdomain_revoke(p_admin uuid, p_id uuid, p_reason text) RETURNS text[]
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_row    public.subdomains%ROWTYPE;
  v_reason text := btrim(coalesce(p_reason, ''));
BEGIN
  IF NOT public.subdomain_is_developer(p_admin) THEN RAISE EXCEPTION 'not_admin' USING ERRCODE = 'P0001'; END IF;
  IF char_length(v_reason) NOT BETWEEN 1 AND 200 THEN RAISE EXCEPTION 'reason_invalid' USING ERRCODE = 'P0001'; END IF;
  SELECT * INTO v_row FROM public.subdomains WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0001'; END IF;
  IF v_row.status NOT IN ('reserved', 'pending', 'active', 'broken') THEN
    RAISE EXCEPTION 'not_live' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.subdomains
  SET status = 'revoked', revoked_reason = v_reason, revoked_by = p_admin, cf_record_ids = '{}'
  WHERE id = p_id;
  RETURN v_row.cf_record_ids;
END $$;

-- 회수된 이름 풀기(관리자)
CREATE FUNCTION public.subdomain_unblock(p_admin uuid, p_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.subdomain_is_developer(p_admin) THEN RAISE EXCEPTION 'not_admin' USING ERRCODE = 'P0001'; END IF;
  UPDATE public.subdomains SET status = 'released', released_reason = 'unblocked'
  WHERE id = p_id AND status = 'revoked';
  IF NOT FOUND THEN RAISE EXCEPTION 'not_revoked' USING ERRCODE = 'P0001'; END IF;
END $$;

-- 방문 주소를 받은 주소로 (연결된 뒤 학생이 "바꾸기"를 눌렀을 때)
CREATE FUNCTION public.subdomain_set_url(p_user uuid, p_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_row public.subdomains%ROWTYPE;
BEGIN
  SELECT * INTO v_row FROM public.subdomains WHERE id = p_id;
  IF NOT FOUND OR v_row.owner_id IS DISTINCT FROM p_user THEN
    RAISE EXCEPTION 'not_owner' USING ERRCODE = 'P0001';
  END IF;
  IF v_row.status <> 'active' OR v_row.project_id IS NULL THEN
    RAISE EXCEPTION 'not_active' USING ERRCODE = 'P0001';
  END IF;
  UPDATE public.projects SET url = 'https://' || v_row.name || '.dshs.dev' WHERE id = v_row.project_id;
END $$;


-- 6. 실행 권한: 쓰기 함수·도우미는 service_role 만
REVOKE ALL ON FUNCTION public.subdomain_reserve(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.subdomain_connect(uuid, uuid, text, text, jsonb, text[]) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.subdomain_record_check(uuid, boolean, timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.subdomain_release(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.subdomain_revoke(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.subdomain_unblock(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.subdomain_set_url(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.subdomain_is_developer(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.subdomain_reserve(uuid, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.subdomain_connect(uuid, uuid, text, text, jsonb, text[]) TO service_role;
GRANT EXECUTE ON FUNCTION public.subdomain_record_check(uuid, boolean, timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.subdomain_release(uuid, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.subdomain_revoke(uuid, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.subdomain_unblock(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.subdomain_set_url(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.subdomain_is_developer(uuid) TO service_role;


-- ============================================================
-- 추가: supabase/migrations/20261025110000_subdomains_lifecycle.sql (2026-10-25 db push 완료)
-- ============================================================
-- 주소 받기 수명 주기 보완 (최종 리뷰 반영, 2026-10-25)
-- 1. 연결된 적 있는 주소를 다시 연결(pending)한 뒤 확인이 실패하면 끊김(broken)으로 — 전에는 pending 에 머물러
--    매일 점검이 영영 반납하지 않았다(주인이 떠난 CNAME 이 남음).
-- 2. "방문 주소 바꾸기" 전 주소를 기억했다가, 반납·회수 때 프로젝트 방문 주소가 아직 이 주소면 되돌린다.
--    반납된 이름은 다른 학생이 바로 받을 수 있어, 그대로 두면 방문 버튼이 남의 사이트로 간다.
--    기억한 주소가 없으면(학생이 직접 이 주소를 적은 경우) 방문 주소를 비운다.

ALTER TABLE public.subdomains ADD COLUMN previous_url text;

CREATE OR REPLACE FUNCTION public.subdomain_record_check(p_id uuid, p_ok boolean, p_now timestamptz) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_status text;
  v_ever   boolean;
BEGIN
  SELECT status, ever_active INTO v_status, v_ever FROM public.subdomains WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0001'; END IF;
  IF v_status NOT IN ('pending', 'active', 'broken') THEN
    RETURN v_status;   -- 예약만 됐거나 이미 반납·회수된 주소는 그대로
  END IF;

  IF p_ok THEN
    UPDATE public.subdomains SET status = 'active', ever_active = true, broken_since = NULL, checked_at = p_now
    WHERE id = p_id;
    RETURN 'active';
  ELSIF v_status IN ('active', 'broken') OR v_ever THEN
    UPDATE public.subdomains SET status = 'broken', broken_since = coalesce(broken_since, p_now), checked_at = p_now
    WHERE id = p_id;
    RETURN 'broken';
  ELSE
    UPDATE public.subdomains SET checked_at = p_now WHERE id = p_id;
    RETURN v_status;
  END IF;
END $$;

-- 반납·회수 때 프로젝트 방문 주소 되돌리기 (내부 도우미)
CREATE FUNCTION public.subdomain_restore_project_url(p_row public.subdomains) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_row.project_id IS NULL THEN RETURN; END IF;
  UPDATE public.projects
  SET url = p_row.previous_url
  WHERE id = p_row.project_id
    AND rtrim(url, '/') = 'https://' || p_row.name || '.dshs.dev';
END $$;
REVOKE ALL ON FUNCTION public.subdomain_restore_project_url(public.subdomains) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.subdomain_set_url(p_user uuid, p_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_row public.subdomains%ROWTYPE;
  v_new text;
  v_old text;
BEGIN
  SELECT * INTO v_row FROM public.subdomains WHERE id = p_id FOR UPDATE;
  IF NOT FOUND OR v_row.owner_id IS DISTINCT FROM p_user THEN
    RAISE EXCEPTION 'not_owner' USING ERRCODE = 'P0001';
  END IF;
  IF v_row.status <> 'active' OR v_row.project_id IS NULL THEN
    RAISE EXCEPTION 'not_active' USING ERRCODE = 'P0001';
  END IF;
  v_new := 'https://' || v_row.name || '.dshs.dev';
  SELECT url INTO v_old FROM public.projects WHERE id = v_row.project_id;
  IF rtrim(coalesce(v_old, ''), '/') = v_new THEN RETURN; END IF;

  UPDATE public.subdomains SET previous_url = v_old WHERE id = p_id;
  UPDATE public.projects SET url = v_new WHERE id = v_row.project_id;
END $$;

CREATE OR REPLACE FUNCTION public.subdomain_release(p_actor uuid, p_id uuid, p_reason text) RETURNS text[]
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_row public.subdomains%ROWTYPE;
BEGIN
  SELECT * INTO v_row FROM public.subdomains WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0001'; END IF;
  IF p_actor IS NOT NULL AND v_row.owner_id IS DISTINCT FROM p_actor AND NOT public.subdomain_is_developer(p_actor) THEN
    RAISE EXCEPTION 'not_owner' USING ERRCODE = 'P0001';
  END IF;
  IF v_row.status NOT IN ('reserved', 'pending', 'active', 'broken') THEN
    RAISE EXCEPTION 'not_live' USING ERRCODE = 'P0001';
  END IF;

  PERFORM public.subdomain_restore_project_url(v_row);
  UPDATE public.subdomains
  SET status = 'released', released_reason = left(coalesce(p_reason, ''), 200), cf_record_ids = '{}'
  WHERE id = p_id;
  RETURN v_row.cf_record_ids;
END $$;

CREATE OR REPLACE FUNCTION public.subdomain_revoke(p_admin uuid, p_id uuid, p_reason text) RETURNS text[]
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_row    public.subdomains%ROWTYPE;
  v_reason text := btrim(coalesce(p_reason, ''));
BEGIN
  IF NOT public.subdomain_is_developer(p_admin) THEN RAISE EXCEPTION 'not_admin' USING ERRCODE = 'P0001'; END IF;
  IF char_length(v_reason) NOT BETWEEN 1 AND 200 THEN RAISE EXCEPTION 'reason_invalid' USING ERRCODE = 'P0001'; END IF;
  SELECT * INTO v_row FROM public.subdomains WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0001'; END IF;
  IF v_row.status NOT IN ('reserved', 'pending', 'active', 'broken') THEN
    RAISE EXCEPTION 'not_live' USING ERRCODE = 'P0001';
  END IF;

  PERFORM public.subdomain_restore_project_url(v_row);
  UPDATE public.subdomains
  SET status = 'revoked', revoked_reason = v_reason, revoked_by = p_admin, cf_record_ids = '{}'
  WHERE id = p_id;
  RETURN v_row.cf_record_ids;
END $$;


-- ============================================================
-- 추가: supabase/migrations/20261025130000_withdraw_releases_subdomains.sql (2026-10-25 db push 완료)
-- 탈퇴(withdraw_account)가 살아 있는 주소를 먼저 반납 — 전문은 그 migration 파일 참고
-- ============================================================


-- ============================================================
-- 추가: supabase/migrations/20261026100000_subdomains_redirect_hosts.sql (2026-10-26 db push 완료)
-- ============================================================
-- 도메인 마련하기: 바로가기 호스트(Cloudflare Workers·Firebase Hosting) 추가 (2026-10-26)
-- 설계: docs/superpowers/specs/2026-10-26-subdomain-redirects-design.md
-- 이 두 호스트는 CNAME 으로 연결하지 않고, 소유 확인 토큰이 보낼 곳(target)에서 확인되면
-- 우리가 proxied AAAA + Bulk Redirect 목록 항목을 만들어 <이름>.dshs.dev → https://<target>/ 로 302 보낸다.
-- 규칙은 src/lib/domains/hosts.ts 와 같다(DB 쪽 최후 방어선).

ALTER TABLE public.subdomains DROP CONSTRAINT subdomains_host_check;
ALTER TABLE public.subdomains ADD CONSTRAINT subdomains_host_check
  CHECK (host IN ('vercel', 'netlify', 'cloudflare-pages', 'github-pages', 'gitlab-pages', 'render', 'railway',
                  'cloudflare-workers', 'firebase'));

CREATE OR REPLACE FUNCTION public.subdomain_target_ok(p_host text, p_target text) RETURNS boolean
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE p_host
    WHEN 'vercel' THEN p_target ~ '^(cname\.vercel-dns\.com|cname\.vercel-dns-[0-9]{1,4}\.com|[a-z0-9]{8,32}\.vercel-dns-[0-9]{1,4}\.com)$'
    WHEN 'netlify' THEN p_target ~ '^[a-z0-9-]+\.netlify\.app$'
    WHEN 'cloudflare-pages' THEN p_target ~ '^[a-z0-9-]+\.pages\.dev$'
    WHEN 'github-pages' THEN p_target ~ '^[a-z0-9-]+\.github\.io$'
    WHEN 'gitlab-pages' THEN p_target ~ '^[a-z0-9-]+\.gitlab\.io$'
    WHEN 'render' THEN p_target ~ '^[a-z0-9-]+\.onrender\.com$'
    WHEN 'railway' THEN p_target ~ '^[a-z0-9-]+\.up\.railway\.app$'
    -- 바로가기: 워커이름.계정서브도메인.workers.dev / 사이트.web.app·firebaseapp.com (미리보기 채널 `--` 제외)
    WHEN 'cloudflare-workers' THEN p_target ~ '^[a-z0-9-]+\.[a-z0-9-]+\.workers\.dev$'
    WHEN 'firebase' THEN p_target !~ '--' AND p_target ~ '^[a-z0-9-]+\.(web\.app|firebaseapp\.com)$'
    ELSE false
  END;
$$;

-- TXT: 바로가기 호스트는 받지 않는다(빈 배열만). 나머지는 내 이름 아래만, 예외로 Vercel 의 _vercel.dshs.dev
CREATE OR REPLACE FUNCTION public.subdomain_txt_ok(p_host text, p_name text, p_txt jsonb) RETURNS boolean
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  r jsonb;
  n text;
  v text;
BEGIN
  IF p_host IN ('cloudflare-workers', 'firebase') THEN RETURN p_txt = '[]'::jsonb; END IF;
  IF p_txt IS NULL OR jsonb_typeof(p_txt) <> 'array' OR jsonb_array_length(p_txt) > 2 THEN RETURN false; END IF;
  FOR r IN SELECT * FROM jsonb_array_elements(p_txt) LOOP
    n := r->>'name';
    v := r->>'value';
    IF n IS NULL OR v IS NULL OR char_length(v) NOT BETWEEN 1 AND 255 THEN RETURN false; END IF;
    IF n = '_vercel.dshs.dev' THEN
      IF p_host <> 'vercel' OR left(v, char_length('vc-domain-verify=' || p_name || '.dshs.dev,'))
           <> 'vc-domain-verify=' || p_name || '.dshs.dev,' THEN
        RETURN false;
      END IF;
    ELSIF n !~ ('^[a-z0-9_]([a-z0-9_-]*[a-z0-9_])?(\.[a-z0-9_]([a-z0-9_-]*[a-z0-9_])?)*\.' || p_name || '\.dshs\.dev$') THEN
      RETURN false;
    END IF;
  END LOOP;
  RETURN true;
END $$;

-- 바로가기 레코드 기록: 소유 확인이 처음 성공해 Cloudflare 에 AAAA·목록 항목을 만든 뒤 그 id 를 남긴다.
-- 소유자 확인 대신 "바로가기 호스트이고 살아 있는 행"인지 본다(매일 점검도 부른다).
-- 이미 기록이 있으면 records_exist — 동시에 두 번 활성화한 쪽은 자기가 만든 것을 지운다.
CREATE FUNCTION public.subdomain_set_redirect_records(p_id uuid, p_record_ids text[]) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_row public.subdomains%ROWTYPE;
BEGIN
  SELECT * INTO v_row FROM public.subdomains WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0001'; END IF;
  IF v_row.status NOT IN ('pending', 'active', 'broken') THEN
    RAISE EXCEPTION 'not_live' USING ERRCODE = 'P0001';
  END IF;
  IF v_row.host IS NULL OR v_row.host NOT IN ('cloudflare-workers', 'firebase') THEN
    RAISE EXCEPTION 'not_redirect' USING ERRCODE = 'P0001';
  END IF;
  IF cardinality(v_row.cf_record_ids) > 0 THEN
    RAISE EXCEPTION 'records_exist' USING ERRCODE = 'P0001';
  END IF;
  UPDATE public.subdomains SET cf_record_ids = coalesce(p_record_ids, '{}') WHERE id = p_id;
END $$;

REVOKE ALL ON FUNCTION public.subdomain_set_redirect_records(uuid, text[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.subdomain_set_redirect_records(uuid, text[]) TO service_role;
