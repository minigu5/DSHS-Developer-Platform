-- 도메인 마련하기: 확인 먼저, 연결은 그다음 (2026-10-26)
-- 설계: docs/superpowers/specs/2026-10-26-domain-verify-first-design.md
-- 예전에는 2단계에서 CNAME 이 바로 생겨 소유 확인 없이도 주소가 열렸다(DNS only 라 우리가 막을 수 없음).
-- 이제 ② 학생 사이트 원래 주소에서 토큰을 확인한 뒤에만 ③ 연결(subdomain_connect)할 수 있다.
-- 확인 전에는 예약 때 만든 자리표시(proxied AAAA + 경고 페이지 바로가기)가 cf_record_ids 에 들어 있다.
-- 규칙은 src/lib/domains/hosts.ts(siteAddressFor·targetBoundToSite)와 같다(DB 쪽 최후 방어선).

ALTER TABLE public.subdomains
  ADD COLUMN site_url text,
  ADD COLUMN site_host text CHECK (site_host IS NULL OR site_host IN (
    'vercel', 'netlify', 'cloudflare-pages', 'github-pages', 'gitlab-pages', 'render', 'railway',
    'cloudflare-workers', 'firebase')),
  ADD COLUMN site_verified_at timestamptz,
  ADD COLUMN connected_at timestamptz;

-- CNAME 값(바로가기는 보낼 곳)이 원래 주소의 호스트 이름이어야 하는 호스트. Vercel·Railway 는 호스트가 따로 준 값이라 못 묶는다
CREATE FUNCTION public.subdomain_target_bound(p_host text) RETURNS boolean
LANGUAGE sql IMMUTABLE AS $$
  SELECT p_host IN ('netlify', 'cloudflare-pages', 'github-pages', 'gitlab-pages', 'render', 'cloudflare-workers', 'firebase');
$$;

-- ② 원래 주소 저장. 바뀌면 확인 기록을 지운다(같은 주소면 그대로). 이미 연결된 DNS 는 건드리지 않는다
CREATE FUNCTION public.subdomain_set_site(p_user uuid, p_id uuid, p_site_url text, p_site_host text) RETURNS void
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
                                                 'render', 'railway', 'cloudflare-workers', 'firebase') THEN
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

-- ② 확인 성공 기록. 확인하는 사이 원래 주소가 바뀌었으면 site_changed
CREATE FUNCTION public.subdomain_verify_site(p_user uuid, p_id uuid, p_site_url text) RETURNS void
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
  IF v_row.site_url IS DISTINCT FROM p_site_url THEN
    RAISE EXCEPTION 'site_changed' USING ERRCODE = 'P0001';
  END IF;
  UPDATE public.subdomains SET site_verified_at = now() WHERE id = p_id;
END $$;

-- 예약 직후 만든 자리표시 레코드 기록 — 예약만 된 행이고 기록이 비어 있을 때만
CREATE FUNCTION public.subdomain_set_placeholder_records(p_id uuid, p_record_ids text[]) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_row public.subdomains%ROWTYPE;
BEGIN
  SELECT * INTO v_row FROM public.subdomains WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0001'; END IF;
  IF v_row.status <> 'reserved' OR cardinality(v_row.cf_record_ids) > 0 THEN
    RAISE EXCEPTION 'records_exist' USING ERRCODE = 'P0001';
  END IF;
  UPDATE public.subdomains SET cf_record_ids = coalesce(p_record_ids, '{}') WHERE id = p_id;
END $$;

-- 연결: ② 확인이 끝났고, 그 사이트의 호스트로만. 묶이는 호스트는 대상도 그 사이트여야 한다
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
  SET host = p_host, target = p_target, txt_records = coalesce(p_txt, '[]'::jsonb),
      cf_record_ids = coalesce(p_record_ids, '{}'), status = 'pending', broken_since = NULL, connected_at = now()
  WHERE id = p_id;
END $$;

REVOKE ALL ON FUNCTION public.subdomain_target_bound(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.subdomain_target_bound(text) TO service_role;
REVOKE ALL ON FUNCTION public.subdomain_set_site(uuid, uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.subdomain_set_site(uuid, uuid, text, text) TO service_role;
REVOKE ALL ON FUNCTION public.subdomain_verify_site(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.subdomain_verify_site(uuid, uuid, text) TO service_role;
REVOKE ALL ON FUNCTION public.subdomain_set_placeholder_records(uuid, text[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.subdomain_set_placeholder_records(uuid, text[]) TO service_role;
REVOKE ALL ON FUNCTION public.subdomain_connect(uuid, uuid, text, text, jsonb, text[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.subdomain_connect(uuid, uuid, text, text, jsonb, text[]) TO service_role;

-- 기존 연결 행의 연결 시각은 알 수 없어 updated_at 으로 어림한다(아래 UPDATE 가 updated_at 을 바꾸기 전에)
UPDATE public.subdomains SET connected_at = updated_at
WHERE host IS NOT NULL AND status IN ('pending', 'active', 'broken');

-- 기존 행: 실제 주소에서 확인된 적 있는 주소는 확인된 것으로 친다.
-- site_url 은 대상이 곧 사이트인 호스트만 채운다(Vercel·Railway 는 원래 주소를 모름 — 같은 호스트 재연결엔 필요 없음)
UPDATE public.subdomains
SET site_verified_at = now(),
    site_host = host,
    site_url = CASE WHEN public.subdomain_target_bound(host) AND target IS NOT NULL THEN 'https://' || target || '/' END
WHERE ever_active AND host IS NOT NULL AND status IN ('pending', 'active', 'broken');

