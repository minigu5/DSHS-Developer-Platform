-- 도메인 마련하기: 대곽나루 서버 주소의 DNS 레코드 id 를 다시 기록하는 서비스 전용 함수 (2026-11-02)
-- 같은 서버 재연결이 중간에 실패하면(옛 레코드만 지워지고 새 레코드를 못 만든 경우) active 인데 DNS 가 없는 행이 남는다.
-- 매일 점검(scripts/check-subdomains.mts → runNaruDnsRepair)이 그런 행의 proxied CNAME 을 다시 만들고 이 함수로 id 를 기록한다.
-- 대곽나루(host='naru')이면서 살아 있는 행만 — 다른 호스트 행의 레코드 기록(subdomain_connect 등)과 섞이지 않게.
-- 검증: docs/22-supabase-subdomains-verify.sql (항상 롤백)

CREATE FUNCTION public.subdomain_set_naru_records(p_id uuid, p_record_ids text[]) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_row public.subdomains%ROWTYPE;
BEGIN
  SELECT * INTO v_row FROM public.subdomains WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0001';
  END IF;
  IF v_row.host IS DISTINCT FROM 'naru' THEN
    RAISE EXCEPTION 'not_naru' USING ERRCODE = 'P0001';
  END IF;
  IF v_row.status NOT IN ('reserved', 'pending', 'active', 'broken') THEN
    RAISE EXCEPTION 'not_live' USING ERRCODE = 'P0001';
  END IF;
  UPDATE public.subdomains SET cf_record_ids = coalesce(p_record_ids, '{}') WHERE id = p_id;
END $$;

REVOKE ALL ON FUNCTION public.subdomain_set_naru_records(uuid, text[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.subdomain_set_naru_records(uuid, text[]) TO service_role;
