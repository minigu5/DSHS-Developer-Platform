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
