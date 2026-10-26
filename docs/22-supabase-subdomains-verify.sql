-- ============================================================
-- subdomains 함수·트리거·권한 검증 (운영 DB에서 돌려도 안전)
-- ============================================================
-- 실행: supabase db query --linked -f docs/22-supabase-subdomains-verify.sql
--
-- 하나의 DO 블록(= 하나의 트랜잭션) 안에서 테스트 프로젝트·주소(zz-verify-*)를 만들고,
-- 마지막에 항상 RAISE EXCEPTION 으로 끝나 전부 롤백된다. 아무것도 남지 않는다.
-- 결과: "VERIFY OK" 면 통과, "VERIFY FAIL ..." 이면 기대값과 실제 로그가 나온다.
-- 개발자 계정이 아닌 @ts.hs.kr 사용자 2명이 users 에 있어야 한다. 개발자 계정이 있으면 회수도 검사한다.

DO $verify$
DECLARE
  u      uuid;
  u2     uuid;
  adm    uuid;
  p      uuid[] := '{}';
  pid    uuid;
  a      uuid;
  b      uuid;
  c      uuid;
  d      uuid;
  f      uuid;
  ids    text[];
  st     text;
  n      int;
  log    text := '';
  expect text;
BEGIN
  SELECT id INTO u FROM public.users WHERE email LIKE '%@ts.hs.kr' AND email <> 'ts250024@ts.hs.kr' ORDER BY created_at LIMIT 1;
  SELECT id INTO u2 FROM public.users WHERE email LIKE '%@ts.hs.kr' AND email <> 'ts250024@ts.hs.kr' AND id <> u ORDER BY created_at LIMIT 1;
  SELECT id INTO adm FROM public.users WHERE email = 'ts250024@ts.hs.kr';
  IF u IS NULL OR u2 IS NULL THEN RAISE EXCEPTION 'VERIFY FAIL need two non-developer users'; END IF;

  -- 테스트 프로젝트: 1~4 웹사이트(url 있음), 5 앱, 6 웹사이트(url 없음), 7 다른 사람 웹사이트
  FOR i IN 1..7 LOOP
    INSERT INTO public.projects (author_id, title, description, source_type, visibility, types, url)
    VALUES (
      CASE WHEN i = 7 THEN u2 ELSE u END,
      'zz-verify-' || i, 'x', 'closed', 'private',
      CASE WHEN i = 5 THEN ARRAY['app'] ELSE ARRAY['website'] END,
      CASE WHEN i = 6 THEN NULL ELSE 'https://zz-verify-' || i || '.vercel.app' END
    ) RETURNING id INTO pid;
    p := p || pid;
  END LOOP;

  -- 예약 3개까지
  a := public.subdomain_reserve(u, p[1], '  ZZ-Verify-A ');
  b := public.subdomain_reserve(u, p[2], 'zz-verify-b');
  c := public.subdomain_reserve(u, p[3], 'zz-verify-c');
  log := log || 'name_norm=' || (SELECT name FROM public.subdomains WHERE id = a) || ';';
  log := log || 'status=' || (SELECT status FROM public.subdomains WHERE id = a) || ';';
  log := log || 'owner=' || ((SELECT owner_id FROM public.subdomains WHERE id = a) = u)::text || ';';
  log := log || 'token_len=' || (SELECT length(verify_token) FROM public.subdomains WHERE id = a) || ';';

  BEGIN PERFORM public.subdomain_reserve(u, p[4], 'zz-verify-d'); log := log || 'fourth=ok;';
  EXCEPTION WHEN raise_exception THEN log := log || 'fourth=' || SQLERRM || ';'; END;
  BEGIN PERFORM public.subdomain_reserve(u, p[4], 'zz-verify-a'); log := log || 'taken=ok;';
  EXCEPTION WHEN raise_exception THEN log := log || 'taken=' || SQLERRM || ';'; END;
  BEGIN PERFORM public.subdomain_reserve(u, p[1], 'zz-verify-e'); log := log || 'same_project=ok;';
  EXCEPTION WHEN raise_exception THEN log := log || 'same_project=' || SQLERRM || ';'; END;
  BEGIN PERFORM public.subdomain_reserve(u, p[4], 'www'); log := log || 'reserved=ok;';
  EXCEPTION WHEN raise_exception THEN log := log || 'reserved=' || SQLERRM || ';'; END;
  BEGIN PERFORM public.subdomain_reserve(u, p[4], 'bad_name'); log := log || 'invalid=ok;';
  EXCEPTION WHEN raise_exception THEN log := log || 'invalid=' || SQLERRM || ';'; END;
  BEGIN PERFORM public.subdomain_reserve(u, p[5], 'zz-verify-app'); log := log || 'app=ok;';
  EXCEPTION WHEN raise_exception THEN log := log || 'app=' || SQLERRM || ';'; END;
  BEGIN PERFORM public.subdomain_reserve(u, p[6], 'zz-verify-nourl'); log := log || 'nourl=ok;';
  EXCEPTION WHEN raise_exception THEN log := log || 'nourl=' || SQLERRM || ';'; END;
  BEGIN PERFORM public.subdomain_reserve(u, p[7], 'zz-verify-other'); log := log || 'other=ok;';
  EXCEPTION WHEN raise_exception THEN log := log || 'other=' || SQLERRM || ';'; END;

  -- 살아 있는 주소가 있는 프로젝트는 지울 수 없다
  BEGIN DELETE FROM public.projects WHERE id = p[1]; log := log || 'delete=ok;';
  EXCEPTION WHEN raise_exception THEN log := log || 'delete=' || SQLERRM || ';'; END;

  -- 확인 전 자리표시(2026-10-26): 예약만 된 행에 한 번만
  PERFORM public.subdomain_set_placeholder_records(b, ARRAY['p1', 'redirect:p2']);
  log := log || 'ph=' || (SELECT array_to_string(cf_record_ids, ',') FROM public.subdomains WHERE id = b) || ';';
  BEGIN PERFORM public.subdomain_set_placeholder_records(b, ARRAY['p3']); log := log || 'ph_twice=ok;';
  EXCEPTION WHEN raise_exception THEN log := log || 'ph_twice=' || SQLERRM || ';'; END;

  -- 확인 먼저(2026-10-26): ② 원래 주소 확인 전에는 연결할 수 없다
  BEGIN PERFORM public.subdomain_connect(u, a, 'vercel', 'abcdef12.vercel-dns-017.com', '[]', '{}'); log := log || 'unverified=ok;';
  EXCEPTION WHEN raise_exception THEN log := log || 'unverified=' || SQLERRM || ';'; END;
  BEGIN PERFORM public.subdomain_set_site(u, a, 'http://zz-verify-1.vercel.app/', 'vercel'); log := log || 'site_http=ok;';
  EXCEPTION WHEN raise_exception THEN log := log || 'site_http=' || SQLERRM || ';'; END;
  BEGIN PERFORM public.subdomain_set_site(u, a, 'https://a.b.netlify.app/', 'netlify'); log := log || 'site_shape=ok;';
  EXCEPTION WHEN raise_exception THEN log := log || 'site_shape=' || SQLERRM || ';'; END;
  BEGIN PERFORM public.subdomain_set_site(u2, a, 'https://zz-verify-1.vercel.app/', 'vercel'); log := log || 'site_other=ok;';
  EXCEPTION WHEN raise_exception THEN log := log || 'site_other=' || SQLERRM || ';'; END;
  PERFORM public.subdomain_set_site(u, a, 'https://zz-verify-1.vercel.app/', 'vercel');
  BEGIN PERFORM public.subdomain_verify_site(u, a, 'https://other.vercel.app/'); log := log || 'site_changed=ok;';
  EXCEPTION WHEN raise_exception THEN log := log || 'site_changed=' || SQLERRM || ';'; END;
  PERFORM public.subdomain_verify_site(u, a, 'https://zz-verify-1.vercel.app/');
  PERFORM public.subdomain_set_site(u, a, 'https://zz-verify-1.vercel.app/', 'vercel');
  log := log || 'site_same_keeps=' || (SELECT (site_verified_at IS NOT NULL)::text FROM public.subdomains WHERE id = a) || ';';
  BEGIN PERFORM public.subdomain_connect(u, a, 'netlify', 'zz-verify-1.netlify.app', '[]', '{}'); log := log || 'host_mismatch=ok;';
  EXCEPTION WHEN raise_exception THEN log := log || 'host_mismatch=' || SQLERRM || ';'; END;

  -- 연결: 호스트·대상·TXT 검사
  BEGIN PERFORM public.subdomain_connect(u, a, 'vercel', 'evil.com', '[]', '{}'); log := log || 'bad_target=ok;';
  EXCEPTION WHEN raise_exception THEN log := log || 'bad_target=' || SQLERRM || ';'; END;
  BEGIN PERFORM public.subdomain_connect(u, a, 'vercel', 'abcdef12.vercel-dns-017.com',
          '[{"name":"_x.zz-verify-b.dshs.dev","value":"t"}]', '{}'); log := log || 'bad_txt=ok;';
  EXCEPTION WHEN raise_exception THEN log := log || 'bad_txt=' || SQLERRM || ';'; END;
  BEGIN PERFORM public.subdomain_connect(u2, a, 'vercel', 'abcdef12.vercel-dns-017.com', '[]', '{}'); log := log || 'connect_other=ok;';
  EXCEPTION WHEN raise_exception THEN log := log || 'connect_other=' || SQLERRM || ';'; END;
  PERFORM public.subdomain_connect(u, a, 'vercel', 'abcdef12.vercel-dns-017.com',
    '[{"name":"_vercel.dshs.dev","value":"vc-domain-verify=zz-verify-a.dshs.dev,abc"}]', ARRAY['rec1', 'rec2']);
  log := log || 'connected=' || (SELECT status || '/' || host || '/' || array_length(cf_record_ids, 1) || '/' || (connected_at IS NOT NULL)::text FROM public.subdomains WHERE id = a) || ';';
  BEGIN PERFORM public.subdomain_set_placeholder_records(a, ARRAY['p9']); log := log || 'ph_connected=ok;';
  EXCEPTION WHEN raise_exception THEN log := log || 'ph_connected=' || SQLERRM || ';'; END;

  -- 확인 결과 기록
  st := public.subdomain_record_check(a, false, now());
  log := log || 'pending_fail=' || st || ';';
  st := public.subdomain_record_check(a, true, now());
  log := log || 'ok=' || st || '/' || (SELECT ever_active::text FROM public.subdomains WHERE id = a) || ';';
  st := public.subdomain_record_check(a, false, now());
  log := log || 'broken=' || st || '/' || (SELECT (broken_since IS NOT NULL)::text FROM public.subdomains WHERE id = a) || ';';
  st := public.subdomain_record_check(a, true, now());

  -- 연결됐던 주소를 다시 연결(pending)한 뒤 확인이 실패하면 끊김으로 — 매일 점검이 7일 뒤 반납할 수 있게
  PERFORM public.subdomain_connect(u, a, 'vercel', 'abcdef12.vercel-dns-017.com', '[]', ARRAY['rec1', 'rec2']);
  st := public.subdomain_record_check(a, false, now());
  log := log || 'reconnect_fail=' || st || '/' || (SELECT (broken_since IS NOT NULL)::text FROM public.subdomains WHERE id = a) || ';';
  st := public.subdomain_record_check(a, true, now());

  -- 방문 주소 바꾸기 (active 만)
  PERFORM public.subdomain_set_url(u, a);
  log := log || 'url=' || (SELECT url FROM public.projects WHERE id = p[1]) || ';';
  BEGIN PERFORM public.subdomain_set_url(u, b); log := log || 'url_reserved=ok;';
  EXCEPTION WHEN raise_exception THEN log := log || 'url_reserved=' || SQLERRM || ';'; END;

  -- 반납: 다른 사람은 못 하고, 소유자는 레코드 id 를 돌려받는다
  BEGIN PERFORM public.subdomain_release(u2, a, 'x'); log := log || 'release_other=ok;';
  EXCEPTION WHEN raise_exception THEN log := log || 'release_other=' || SQLERRM || ';'; END;
  ids := public.subdomain_release(u, a, 'owner');
  log := log || 'released=' || array_to_string(ids, ',') || '/' || (SELECT status FROM public.subdomains WHERE id = a) || ';';
  -- 반납하면 방문 주소를 받기 전 주소로 되돌린다(같은 이름을 다른 학생이 받을 수 있어서)
  log := log || 'url_restored=' || (SELECT url FROM public.projects WHERE id = p[1]) || ';';
  d := public.subdomain_reserve(u, p[4], 'zz-verify-a');
  log := log || 'reuse=' || (d IS NOT NULL)::text || ';';
  DELETE FROM public.projects WHERE id = p[1];
  log := log || 'delete_after_release=' || (NOT EXISTS (SELECT 1 FROM public.projects WHERE id = p[1]))::text || ';';
  log := log || 'history_kept=' || (SELECT (project_id IS NULL)::text FROM public.subdomains WHERE id = a) || ';';

  -- 서비스 경로 반납(p_actor NULL — 매일 점검)
  ids := public.subdomain_release(NULL, c, 'never_connected_7d');
  log := log || 'service_release=' || (SELECT status || '/' || released_reason FROM public.subdomains WHERE id = c) || ';';

  -- 회수는 관리자만
  BEGIN PERFORM public.subdomain_revoke(u, b, '장난'); log := log || 'revoke_user=ok;';
  EXCEPTION WHEN raise_exception THEN log := log || 'revoke_user=' || SQLERRM || ';'; END;
  IF adm IS NOT NULL THEN
    PERFORM public.subdomain_revoke(adm, b, '부적절한 이름');
    BEGIN PERFORM public.subdomain_reserve(u, p[3], 'zz-verify-b'); log := log || 'revoked_name=ok;';
    EXCEPTION WHEN raise_exception THEN log := log || 'revoked_name=' || SQLERRM || ';'; END;
    PERFORM public.subdomain_unblock(adm, b);
    log := log || 'unblocked=' || (public.subdomain_reserve(u, p[3], 'zz-verify-b') IS NOT NULL)::text || ';';
  ELSE
    log := log || 'revoked_name=name_taken;unblocked=true;';
  END IF;

  -- 실행 권한: service_role 전용
  log := log || 'fn_anon=' || has_function_privilege('anon', 'public.subdomain_reserve(uuid,uuid,text)', 'EXECUTE')::text
             || ';fn_auth=' || has_function_privilege('authenticated', 'public.subdomain_reserve(uuid,uuid,text)', 'EXECUTE')::text
             || ';fn_service=' || has_function_privilege('service_role', 'public.subdomain_reserve(uuid,uuid,text)', 'EXECUTE')::text || ';';

  -- RLS: 다른 사용자는 내 주소를 못 보고, 직접 쓰기는 거부
  PERFORM set_config('request.jwt.claims', json_build_object('sub', u2, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  SELECT count(*) INTO n FROM public.subdomains WHERE owner_id = u;
  log := log || 'rls_other_rows=' || n || ';';
  BEGIN
    INSERT INTO public.subdomains (name, project_id, owner_id) VALUES ('zz-verify-rls', p[7], u2);
    log := log || 'rls_insert=ok;';
  EXCEPTION WHEN insufficient_privilege THEN log := log || 'rls_insert=denied;';
  END;
  EXECUTE 'RESET ROLE';

  -- 바로가기 호스트(Workers·Firebase, 2026-10-26): 보낼 곳 규칙, TXT 없음, 확인 뒤 레코드 기록 함수
  log := log || 'rd_target=' || public.subdomain_target_ok('cloudflare-workers', 'a.b.workers.dev')::text || '/'
    || public.subdomain_target_ok('cloudflare-workers', 'b.workers.dev')::text || '/'
    || public.subdomain_target_ok('firebase', 's.web.app')::text || '/'
    || public.subdomain_target_ok('firebase', 's.firebaseapp.com')::text || '/'
    || public.subdomain_target_ok('firebase', 's--c.web.app')::text || ';';
  log := log || 'rd_txt=' || public.subdomain_txt_ok('firebase', 'zz-verify-f', '[{"name":"x.zz-verify-f.dshs.dev","value":"v"}]')::text || '/'
    || public.subdomain_txt_ok('firebase', 'zz-verify-f', '[]')::text || ';';
  f := public.subdomain_reserve(u2, p[7], 'zz-verify-f');
  PERFORM public.subdomain_set_site(u2, f, 'https://zz-verify.web.app/', 'firebase');
  PERFORM public.subdomain_verify_site(u2, f, 'https://zz-verify.web.app/');
  BEGIN PERFORM public.subdomain_connect(u2, f, 'firebase', 'someone-else.web.app', '[]', '{}'); log := log || 'rd_target_mismatch=ok;';
  EXCEPTION WHEN raise_exception THEN log := log || 'rd_target_mismatch=' || SQLERRM || ';'; END;
  BEGIN PERFORM public.subdomain_set_redirect_records(f, ARRAY['r1']); log := log || 'rd_reserved=ok;';
  EXCEPTION WHEN raise_exception THEN log := log || 'rd_reserved=' || SQLERRM || ';'; END;
  BEGIN PERFORM public.subdomain_connect(u2, f, 'firebase', 'zz-verify.web.app', '[{"name":"x.zz-verify-f.dshs.dev","value":"v"}]', '{}');
    log := log || 'rd_connect_txt=ok;';
  EXCEPTION WHEN raise_exception THEN log := log || 'rd_connect_txt=' || SQLERRM || ';'; END;
  PERFORM public.subdomain_connect(u2, f, 'firebase', 'zz-verify.web.app', '[]', '{}');
  PERFORM public.subdomain_set_redirect_records(f, ARRAY['r1', 'redirect:i1']);
  log := log || 'rd_set=' || (SELECT array_to_string(cf_record_ids, ',') FROM public.subdomains WHERE id = f) || ';';
  BEGIN PERFORM public.subdomain_set_redirect_records(f, ARRAY['r2']); log := log || 'rd_twice=ok;';
  EXCEPTION WHEN raise_exception THEN log := log || 'rd_twice=' || SQLERRM || ';'; END;
  PERFORM public.subdomain_set_site(u2, f, 'https://zz-verify-7.vercel.app/', 'vercel');
  log := log || 'site_reset=' || (SELECT (site_verified_at IS NULL)::text FROM public.subdomains WHERE id = f) || ';';
  PERFORM public.subdomain_verify_site(u2, f, 'https://zz-verify-7.vercel.app/');
  PERFORM public.subdomain_connect(u2, f, 'vercel', 'abcdef12.vercel-dns-017.com', '[]', '{}');
  BEGIN PERFORM public.subdomain_set_redirect_records(f, ARRAY['r3']); log := log || 'rd_cname=ok;';
  EXCEPTION WHEN raise_exception THEN log := log || 'rd_cname=' || SQLERRM || ';'; END;
  log := log || 'new_fn_auth=' || has_function_privilege('authenticated', 'public.subdomain_set_site(uuid,uuid,text,text)', 'EXECUTE')::text || '/'
    || has_function_privilege('authenticated', 'public.subdomain_verify_site(uuid,uuid,text)', 'EXECUTE')::text || '/'
    || has_function_privilege('authenticated', 'public.subdomain_set_placeholder_records(uuid,text[])', 'EXECUTE')::text || '/'
    || has_function_privilege('service_role', 'public.subdomain_set_site(uuid,uuid,text,text)', 'EXECUTE')::text || ';';
  log := log || 'rd_fn_auth=' || has_function_privilege('authenticated', 'public.subdomain_set_redirect_records(uuid, text[])', 'EXECUTE')::text || ';';
  PERFORM public.subdomain_release(u2, f, 'owner');

  -- 탈퇴(동의 철회): 살아 있는 주소가 있어도 막히지 않는다 — 주소를 먼저 반납하고 계정을 지운다
  BEGIN
    PERFORM public.withdraw_account(u);
    log := log || 'withdraw=ok/' || (NOT EXISTS (SELECT 1 FROM public.users WHERE id = u))::text || ';';
  EXCEPTION WHEN raise_exception THEN log := log || 'withdraw=' || SQLERRM || ';';
  END;

  expect :=
    'name_norm=zz-verify-a;status=reserved;owner=true;token_len=32;'
    'fourth=limit;taken=name_taken;same_project=project_has_subdomain;reserved=name_reserved;invalid=name_invalid;'
    'app=not_website;nourl=not_website;other=not_owner;delete=project_has_subdomain;'
    'ph=p1,redirect:p2;ph_twice=records_exist;'
    'unverified=not_verified;site_http=site_invalid;site_shape=site_invalid;site_other=not_owner;site_changed=site_changed;'
    'site_same_keeps=true;host_mismatch=host_mismatch;'
    'bad_target=target_invalid;bad_txt=txt_invalid;connect_other=not_owner;connected=pending/vercel/2/true;ph_connected=records_exist;'
    'pending_fail=pending;ok=active/true;broken=broken/true;reconnect_fail=broken/true;'
    'url=https://zz-verify-a.dshs.dev;url_reserved=not_active;'
    'release_other=not_owner;released=rec1,rec2/released;url_restored=https://zz-verify-1.vercel.app;reuse=true;delete_after_release=true;history_kept=true;'
    'service_release=released/never_connected_7d;'
    'revoke_user=not_admin;revoked_name=name_taken;unblocked=true;'
    'fn_anon=false;fn_auth=false;fn_service=true;'
    'rls_other_rows=0;rls_insert=denied;'
    'rd_target=true/false/true/true/false;rd_txt=false/true;rd_target_mismatch=target_mismatch;rd_reserved=not_live;rd_connect_txt=txt_invalid;'
    'rd_set=r1,redirect:i1;rd_twice=records_exist;site_reset=true;rd_cname=not_redirect;new_fn_auth=false/false/false/true;rd_fn_auth=false;'
    'withdraw=ok/true;';

  IF log = expect THEN
    RAISE EXCEPTION 'VERIFY OK';
  ELSE
    RAISE EXCEPTION 'VERIFY FAIL expected=% actual=%', expect, log;
  END IF;
END
$verify$;
