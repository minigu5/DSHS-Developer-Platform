-- 도메인 마련하기: 바로가기 호스트 "ChatGPT Sites"(chatgpt-sites) 추가 (2026-11-05 사용자 요청 — *.chatgpt.site 주소를 거는 학생이 있음)
-- Cloudflare Workers·Firebase 와 같은 바로가기: <이름>.dshs.dev → https://<사이트>.chatgpt.site 302. TXT 없음.
-- ChatGPT 쪽 도메인 연결은 유료 플랜이고 넣을 DNS 값이 앱 안에서만 보여 CNAME 연결은 만들지 않는다.
-- 보낼 곳은 사이트.아이디.chatgpt.site(또는 사이트.chatgpt.site)만 — 아무 주소나 받으면 열린 리다이렉터가 된다.
-- 규칙은 src/lib/domains/hosts.ts 와 같다(DB 쪽 최후 방어선). 다시 실행하면 실패한다 — 수정은 새 migration 으로.
-- search_path 고정(20261027110000)은 CREATE OR REPLACE 가 지우므로 다시 건다. 권한(GRANT)은 그대로 남는다.

-- 1. host·site_host 에 'chatgpt-sites'
ALTER TABLE public.subdomains DROP CONSTRAINT subdomains_host_check;
ALTER TABLE public.subdomains ADD CONSTRAINT subdomains_host_check
  CHECK (host IN ('vercel', 'netlify', 'cloudflare-pages', 'github-pages', 'gitlab-pages', 'render', 'railway',
                  'cloudflare-workers', 'firebase', 'chatgpt-sites', 'naru'));
ALTER TABLE public.subdomains DROP CONSTRAINT subdomains_site_host_check;
ALTER TABLE public.subdomains ADD CONSTRAINT subdomains_site_host_check
  CHECK (site_host IS NULL OR site_host IN ('vercel', 'netlify', 'cloudflare-pages', 'github-pages', 'gitlab-pages',
                                            'render', 'railway', 'cloudflare-workers', 'firebase', 'chatgpt-sites', 'naru'));

-- 2. 보낼 곳 모양
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
    -- 바로가기: 워커이름.계정서브도메인.workers.dev / 사이트.web.app·firebaseapp.com (미리보기 채널 `--` 제외) / 사이트(.아이디).chatgpt.site
    WHEN 'cloudflare-workers' THEN p_target ~ '^[a-z0-9-]+\.[a-z0-9-]+\.workers\.dev$'
    WHEN 'firebase' THEN p_target !~ '--' AND p_target ~ '^[a-z0-9-]+\.(web\.app|firebaseapp\.com)$'
    WHEN 'chatgpt-sites' THEN p_target ~ '^[a-z0-9-]+(\.[a-z0-9-]+)?\.chatgpt\.site$'
    -- 대곽나루: Cloudflare 터널 uuid
    WHEN 'naru' THEN p_target ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.cfargotunnel\.com$'
    ELSE false
  END;
$$;

-- 3. 보낼 곳이 ②에서 확인한 사이트 호스트 이름이어야 하는 호스트
CREATE OR REPLACE FUNCTION public.subdomain_target_bound(p_host text) RETURNS boolean
LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT p_host IN ('netlify', 'cloudflare-pages', 'github-pages', 'gitlab-pages', 'render', 'cloudflare-workers', 'firebase', 'chatgpt-sites');
$$;

-- 4. ② 원래 주소 저장 — 받는 호스트에 추가 (나머지는 20261026120000 그대로)
CREATE OR REPLACE FUNCTION public.subdomain_set_site(p_user uuid, p_id uuid, p_site_url text, p_site_host text) RETURNS void
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
  IF p_site_url IS NULL OR p_site_url !~ '^https://[a-z0-9.-]+/' OR char_length(p_site_url) > 300
     OR p_site_host IS NULL OR p_site_host NOT IN ('vercel', 'netlify', 'cloudflare-pages', 'github-pages', 'gitlab-pages',
                                                 'render', 'railway', 'cloudflare-workers', 'firebase', 'chatgpt-sites') THEN
    RAISE EXCEPTION 'site_invalid' USING ERRCODE = 'P0001';
  END IF;
  -- 묶이는 호스트는 원래 주소의 호스트 이름이 곧 연결 대상이므로 그 모양도 여기서 본다
  IF public.subdomain_target_bound(p_site_host)
     AND NOT public.subdomain_target_ok(p_site_host, split_part(split_part(p_site_url, '://', 2), '/', 1)) THEN
    RAISE EXCEPTION 'site_invalid' USING ERRCODE = 'P0001';
  END IF;

  IF v_row.site_url IS DISTINCT FROM p_site_url OR v_row.site_host IS DISTINCT FROM p_site_host THEN
    UPDATE public.subdomains SET site_url = p_site_url, site_host = p_site_host, site_verified_at = NULL WHERE id = p_id;
  END IF;
END $$;

-- 5. TXT: 바로가기 호스트는 받지 않는다(빈 배열만)
CREATE OR REPLACE FUNCTION public.subdomain_txt_ok(p_host text, p_name text, p_txt jsonb) RETURNS boolean
LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE
  r jsonb;
  n text;
  v text;
BEGIN
  IF p_host IN ('cloudflare-workers', 'firebase', 'chatgpt-sites') THEN RETURN p_txt = '[]'::jsonb; END IF;
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

-- 6. 바로가기 레코드 기록(옛 흐름, 남아 있는 함수) — 바로가기 호스트에 추가
CREATE OR REPLACE FUNCTION public.subdomain_set_redirect_records(p_id uuid, p_record_ids text[]) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_row public.subdomains%ROWTYPE;
BEGIN
  SELECT * INTO v_row FROM public.subdomains WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0001'; END IF;
  IF v_row.status NOT IN ('pending', 'active', 'broken') THEN
    RAISE EXCEPTION 'not_live' USING ERRCODE = 'P0001';
  END IF;
  IF v_row.host IS NULL OR v_row.host NOT IN ('cloudflare-workers', 'firebase', 'chatgpt-sites') THEN
    RAISE EXCEPTION 'not_redirect' USING ERRCODE = 'P0001';
  END IF;
  IF cardinality(v_row.cf_record_ids) > 0 THEN
    RAISE EXCEPTION 'records_exist' USING ERRCODE = 'P0001';
  END IF;
  UPDATE public.subdomains SET cf_record_ids = coalesce(p_record_ids, '{}') WHERE id = p_id;
END $$;
