-- 도메인 마련하기: 호스트 "대곽나루"(naru) — 대곽나루 학생 서버에 <이름>.dshs.dev 를 연결 (2026-11-01)
-- 설계: 대곽나루 저장소 docs/superpowers/specs/2026-11-01-server-hosting-devplatform-link (서버 대여 3단계)
-- 학생 서버의 주소는 proxied CNAME <이름>.dshs.dev → <터널 uuid>.cfargotunnel.com 이고, 요청은 대곽나루 허브가 서버로 나눈다.
-- 그래서 다른 호스트와 달리 ② 소유 확인(사이트에 토큰 넣기)을 하지 않는다 — 서버 주인임은 대곽나루 허브가 이메일로 확인하고,
-- 매일 점검도 토큰 확인·끊김·7일 반납을 적용하지 않는다(허브에 그 서버가 없을 때만 반납, scripts/check-subdomains.mts).
-- 규칙은 src/lib/domains/hosts.ts 와 같다(DB 쪽 최후 방어선). 다시 실행하면 실패한다 — 수정은 새 migration 으로.
-- 검증: docs/22-supabase-subdomains-verify.sql (항상 롤백)

-- 1. host·site_host 에 'naru'
ALTER TABLE public.subdomains DROP CONSTRAINT subdomains_host_check;
ALTER TABLE public.subdomains ADD CONSTRAINT subdomains_host_check
  CHECK (host IN ('vercel', 'netlify', 'cloudflare-pages', 'github-pages', 'gitlab-pages', 'render', 'railway',
                  'cloudflare-workers', 'firebase', 'naru'));
ALTER TABLE public.subdomains DROP CONSTRAINT subdomains_site_host_check;
ALTER TABLE public.subdomains ADD CONSTRAINT subdomains_site_host_check
  CHECK (site_host IS NULL OR site_host IN ('vercel', 'netlify', 'cloudflare-pages', 'github-pages', 'gitlab-pages',
                                            'render', 'railway', 'cloudflare-workers', 'firebase', 'naru'));

-- 2. 묶인 서버 id (대곽나루 서버 id = 8자리 소문자 16진수). 서버 1대에 살아 있는 주소 1개
ALTER TABLE public.subdomains
  ADD COLUMN naru_server_id text CHECK (naru_server_id IS NULL OR naru_server_id ~ '^[0-9a-f]{8}$');
ALTER TABLE public.subdomains
  ADD CONSTRAINT subdomains_naru_server_host_check CHECK (naru_server_id IS NULL OR host = 'naru');
CREATE UNIQUE INDEX subdomains_naru_server_live_uidx ON public.subdomains (naru_server_id)
  WHERE status IN ('reserved', 'pending', 'active', 'broken');

-- 3. CNAME 대상: Cloudflare 터널 (<uuid>.cfargotunnel.com). search_path 고정(20261027110000)은 CREATE OR REPLACE 가 지우므로 다시 건다
CREATE OR REPLACE FUNCTION public.subdomain_target_ok(p_host text, p_target text) RETURNS boolean
LANGUAGE sql IMMUTABLE SET search_path = public AS $$
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
    -- 대곽나루: Cloudflare 터널 uuid
    WHEN 'naru' THEN p_target ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.cfargotunnel\.com$'
    ELSE false
  END;
$$;

-- 4. 예약: 방문 주소(url) 조건을 뺀다. 대곽나루 서버는 사이트 주소 없이 주소를 받을 수 있다.
--    방문 주소가 필요한 다른 호스트 흐름은 서버 액션(reserveSubdomain)이 not_website 로 막는다 — DB 는 website 종류만 본다
CREATE OR REPLACE FUNCTION public.subdomain_reserve(p_user uuid, p_project uuid, p_name text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_name text := lower(btrim(coalesce(p_name, '')));
  v_proj record;
  v_id   uuid;
BEGIN
  SELECT author_id, types INTO v_proj FROM public.projects WHERE id = p_project;
  IF NOT FOUND OR v_proj.author_id IS DISTINCT FROM p_user THEN
    RAISE EXCEPTION 'not_owner' USING ERRCODE = 'P0001';
  END IF;
  IF NOT ('website' = ANY (v_proj.types)) THEN
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

-- 5. 일반 연결(subdomain_connect, 20261026120000)에 대곽나루 관련 두 가지만 더한다
--    ① p_host 가 'naru' 면 거절 — 대곽나루는 서버 id 와 허브 검증이 필요해 subdomain_connect_naru 로만 연결한다
--    ② 다른 호스트로 바꿔 연결하면 묶인 서버 id 를 비운다(서버가 계속 주소에 묶여 있지 않게)
CREATE OR REPLACE FUNCTION public.subdomain_connect(
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
  IF p_host = 'naru' THEN
    RAISE EXCEPTION 'host_mismatch' USING ERRCODE = 'P0001';
  END IF;
  IF v_row.site_verified_at IS NULL THEN
    RAISE EXCEPTION 'not_verified' USING ERRCODE = 'P0001';
  END IF;
  IF p_host IS DISTINCT FROM v_row.site_host THEN
    RAISE EXCEPTION 'host_mismatch' USING ERRCODE = 'P0001';
  END IF;
  IF p_host IS NULL OR p_target IS NULL OR NOT public.subdomain_target_ok(p_host, p_target) THEN
    RAISE EXCEPTION 'target_invalid' USING ERRCODE = 'P0001';
  END IF;
  IF public.subdomain_target_bound(p_host)
     AND p_target IS DISTINCT FROM split_part(split_part(v_row.site_url, '://', 2), '/', 1) THEN
    RAISE EXCEPTION 'target_mismatch' USING ERRCODE = 'P0001';
  END IF;
  IF NOT public.subdomain_txt_ok(p_host, v_row.name, coalesce(p_txt, '[]'::jsonb)) THEN
    RAISE EXCEPTION 'txt_invalid' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.subdomains
  SET host = p_host, target = p_target, txt_records = coalesce(p_txt, '[]'::jsonb), naru_server_id = NULL,
      cf_record_ids = coalesce(p_record_ids, '{}'), status = 'pending', broken_since = NULL, connected_at = now()
  WHERE id = p_id;
END $$;

-- 6. 대곽나루 서버에 연결. 서버 주인 확인과 터널 대상 발급은 서버 액션이 대곽나루 허브에서 끝낸 뒤 부른다.
--    확인 코드 단계가 없으므로 바로 active(ever_active) — 매일 점검은 naru 행을 확인·끊김 처리하지 않는다.
--    옛 호스트의 원래 주소(site_url)는 의미가 없어져 비운다
CREATE FUNCTION public.subdomain_connect_naru(
  p_user uuid, p_id uuid, p_server_id text, p_target text, p_record_ids text[]
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
  IF p_server_id IS NULL OR p_server_id !~ '^[0-9a-f]{8}$'
     OR p_target IS NULL OR NOT public.subdomain_target_ok('naru', p_target) THEN
    RAISE EXCEPTION 'target_invalid' USING ERRCODE = 'P0001';
  END IF;
  IF EXISTS (SELECT 1 FROM public.subdomains
             WHERE naru_server_id = p_server_id AND id <> p_id
               AND status IN ('reserved', 'pending', 'active', 'broken')) THEN
    RAISE EXCEPTION 'naru_server_taken' USING ERRCODE = 'P0001';
  END IF;

  BEGIN
    UPDATE public.subdomains
    SET host = 'naru', target = p_target, naru_server_id = p_server_id,
        cf_record_ids = coalesce(p_record_ids, '{}'), status = 'active', ever_active = true,
        site_host = 'naru', site_url = NULL, site_verified_at = now(), connected_at = now(),
        broken_since = NULL, txt_records = '[]'::jsonb
    WHERE id = p_id;
  EXCEPTION WHEN unique_violation THEN
    -- 위 검사와 UPDATE 사이에 다른 주소가 같은 서버를 먼저 잡은 경우
    RAISE EXCEPTION 'naru_server_taken' USING ERRCODE = 'P0001';
  END;
END $$;

REVOKE ALL ON FUNCTION public.subdomain_connect_naru(uuid, uuid, text, text, text[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.subdomain_connect_naru(uuid, uuid, text, text, text[]) TO service_role;
