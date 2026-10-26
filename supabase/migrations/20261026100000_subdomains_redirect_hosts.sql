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
