-- 반납·회수 때 설명 속 주소도 되돌리기 (2026-11-05 사용자 요청)
-- 연결 뒤 "설명 속 옛 주소 바꾸기"(OldAddressNudge, src/lib/domains/old-address.ts)로 설명의 옛 사이트 주소를
-- https://<이름>.dshs.dev 로 바꿀 수 있다. 반납된 이름은 다른 학생이 바로 받으므로, 그대로 두면 설명의 링크가 남의 사이트로 간다.
-- 그래서 반납·회수(subdomain_release·subdomain_revoke 가 부르는 도우미)에서
-- 1. 방문 주소: 기억한 "바꾸기" 전 주소(previous_url)가 없으면 ② 확인한 원래 주소(site_url), 바로가기면 보낼 곳으로 되돌린다
--    (전에는 비웠다). 셋 다 없으면 예전처럼 비운다.
-- 2. 설명: <이름>.dshs.dev 를 같은 옛 주소로 되돌린다 — 뒤에 붙은 경로·해시는 그대로, 스킴 없이 적은 주소는 스킴 없이.
--    다른 주소의 일부(sub.<이름>.dshs.dev, <이름>.dshs.dev.evil.com, <이름>.dshs.dev2)는 건드리지 않는다(old-address.ts 와 같은 경계).
--    되돌릴 옛 주소가 없으면 설명은 그대로 둔다.

CREATE OR REPLACE FUNCTION public.subdomain_restore_project_url(p_row public.subdomains) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_addr text := 'https://' || p_row.name || '.dshs.dev';
  -- 이름은 [a-z0-9-] 만이라 점만 이스케이프하면 된다
  v_re   text := p_row.name || '\.dshs\.dev(?![A-Za-z0-9_-]|\.[A-Za-z0-9])';
  v_cand text;
  v_host text;
  v_url  text;   -- 되돌릴 방문 주소(원래 적힌 그대로)
  v_base text;   -- 설명에 넣을 "https://호스트/경로"(쿼리·해시·끝의 / 뗌)
  v_desc text;
  v_new  text;
BEGIN
  IF p_row.project_id IS NULL THEN RETURN; END IF;

  FOREACH v_cand IN ARRAY ARRAY[
    p_row.previous_url,
    p_row.site_url,
    CASE WHEN p_row.host IN ('cloudflare-workers', 'firebase', 'chatgpt-sites') AND p_row.target IS NOT NULL
         THEN 'https://' || p_row.target END
  ] LOOP
    CONTINUE WHEN v_cand IS NULL OR v_cand !~* '^https?://[^/?#]+';
    v_host := lower(substring(v_cand from '^[A-Za-z]+://([^/?#:]+)'));
    CONTINUE WHEN v_host = 'dshs.dev' OR v_host LIKE '%.dshs.dev';
    v_url := v_cand;
    v_base := rtrim(regexp_replace(v_cand, '[?#].*$', ''), '/');
    EXIT;
  END LOOP;

  UPDATE public.projects
  SET url = v_url
  WHERE id = p_row.project_id
    AND rtrim(url, '/') = v_addr;

  IF v_base IS NULL THEN RETURN; END IF;
  SELECT description INTO v_desc FROM public.projects WHERE id = p_row.project_id;
  IF v_desc IS NULL THEN RETURN; END IF;

  -- regexp_replace 바꿀 글에서 \ 는 특수 문자
  v_new := regexp_replace(v_desc, '(?<![A-Za-z0-9./@-])https?://' || v_re, replace(v_base, '\', '\\'), 'gi');
  v_new := regexp_replace(v_new, '(?<![A-Za-z0-9./@-])' || v_re,
                          replace(regexp_replace(v_base, '^[A-Za-z]+://', ''), '\', '\\'), 'gi');
  IF v_new IS DISTINCT FROM v_desc THEN
    UPDATE public.projects SET description = v_new WHERE id = p_row.project_id;
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.subdomain_restore_project_url(public.subdomains) FROM PUBLIC, anon, authenticated;
