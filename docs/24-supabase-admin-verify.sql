-- ============================================================
-- 관리자 대시보드: 차단·관리 표·읽기 함수 검증 (운영 DB에서 돌려도 안전)
-- ============================================================
-- 실행: supabase db query --linked -f docs/24-supabase-admin-verify.sql
--
-- 하나의 DO 블록(= 하나의 트랜잭션) 안에서 시험 행(zz-verify-*)을 만들고,
-- 마지막에 항상 RAISE EXCEPTION 으로 끝나 전부 롤백된다. 아무것도 남지 않는다.
-- 결과: "VERIFY OK" 면 통과, "VERIFY FAIL ..." 이면 기대값과 실제 로그가 나온다.
-- 개발자 계정이 아닌 @ts.hs.kr 사용자 2명이 users 에 있어야 한다(u = 소유자, u2 = 차단할 팀원).

DO $verify$
DECLARE
  u      uuid;
  u2     uuid;
  u2mail text;
  pid    uuid;
  n      int;
  log    text := '';
  expect text;
BEGIN
  SELECT id INTO u FROM public.users WHERE email LIKE '%@ts.hs.kr' AND email <> 'ts250024@ts.hs.kr' ORDER BY created_at LIMIT 1;
  SELECT id, email INTO u2, u2mail FROM public.users WHERE email LIKE '%@ts.hs.kr' AND email <> 'ts250024@ts.hs.kr' AND id <> u ORDER BY created_at LIMIT 1;
  IF u IS NULL OR u2 IS NULL THEN RAISE EXCEPTION 'VERIFY FAIL need two non-developer users'; END IF;

  -- u 의 공개 팀 프로젝트(팀원 u2)
  INSERT INTO public.projects (author_id, title, description, source_type, visibility, types, author_role, team_name, team_members)
  VALUES (u, 'zz-verify-ban', 'x', 'closed', 'public', ARRAY['website'], 'team', 'zz', ARRAY[u2mail])
  RETURNING id INTO pid;

  -- 대시보드 읽기 함수: 익명 프로젝트는 이름 없이, 몰아 올린 팁 3개는 한 묶음, 사용자 키로는 못 부름
  INSERT INTO public.projects (author_id, title, description, source_type, visibility, types, author_role)
  VALUES (u, 'zz-verify-anon', 'x', 'closed', 'public', ARRAY['website'], 'anonymous');
  INSERT INTO public.tips (author_id, title, content) VALUES (u, 'zz-verify-t1', 'x'), (u, 'zz-verify-t2', 'x'), (u, 'zz-verify-t3', 'x');
  log := log || 'feed_anon=' || coalesce((
    SELECT (e ->> 'authorName' IS NULL)::text || '/' || (e ->> 'anonymous') || '/' || (e ->> 'authorId' IS NOT NULL)::text
    FROM jsonb_array_elements(public.admin_recent_content(ARRAY['project'])) e WHERE e ->> 'title' = 'zz-verify-anon'), 'missing') || ';';
  log := log || 'feed_kinds=' || (SELECT count(*) FROM jsonb_array_elements(public.admin_recent_content(ARRAY['tip'])) e WHERE e ->> 'kind' <> 'tip') || ';';
  log := log || 'burst=' || (SELECT count(*) FROM jsonb_array_elements(public.admin_bursts()) g
                             WHERE g ->> 'kind' = 'tip' AND (SELECT count(*) FROM jsonb_array_elements(g -> 'items') i WHERE i ->> 'title' LIKE 'zz-verify-t%') = 3) || ';';
  log := log || 'stats=' || ((public.admin_site_stats() -> 'today' ->> 'tips')::int >= 3)::text || ';';
  log := log || 'rpc_auth=' || has_function_privilege('authenticated', 'public.admin_site_stats()', 'EXECUTE')::text
             || '/' || has_function_privilege('anon', 'public.admin_recent_content(text[],timestamptz,int)', 'EXECUTE')::text
             || '/' || has_function_privilege('authenticated', 'public.admin_content(timestamptz)', 'EXECUTE')::text || ';';

  INSERT INTO public.user_bans (user_id, email_hash, until, reason)
  VALUES (u2, public.email_hash(u2mail), now() + interval '7 days', 'zz-verify');
  log := log || 'bans_fn=' || jsonb_array_length(public.admin_bans() -> 'active')::text || ';';

  -- 1. 차단된 u2 의 새 글
  PERFORM set_config('request.jwt.claims', json_build_object('sub', u2, 'email', u2mail, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  BEGIN
    INSERT INTO public.tips (author_id, title, content) VALUES (u2, 'zz-verify', 'x');
    log := log || 'tip_insert=ok;';
  EXCEPTION WHEN insufficient_privilege THEN log := log || 'tip_insert=' || SQLERRM || ';';
  END;

  -- 2. 차단된 팀원이 남의 팀 프로젝트 수정
  BEGIN
    UPDATE public.projects SET description = 'zz-banned' WHERE id = pid;
    GET DIAGNOSTICS n = ROW_COUNT;
    log := log || 'member_update=' || n || ';';
  EXCEPTION WHEN insufficient_privilege THEN log := log || 'member_update=' || SQLERRM || ';';
  END;

  -- 3. 로그인 때 upsert 처럼 같은 값 다시 쓰기는 통과, 닉네임 변경은 거절
  BEGIN
    UPDATE public.users SET email = email, nickname = nickname, bio = bio WHERE id = u2;
    log := log || 'same_profile=ok;';
  EXCEPTION WHEN insufficient_privilege THEN log := log || 'same_profile=' || SQLERRM || ';';
  END;
  BEGIN
    UPDATE public.users SET nickname = 'zz-verify-nick' WHERE id = u2;
    log := log || 'nick_change=ok;';
  EXCEPTION WHEN insufficient_privilege THEN log := log || 'nick_change=' || SQLERRM || ';';
  END;

  -- 공지로 우회 못 함
  BEGIN
    INSERT INTO public.announcements (author_id, title, category, content) VALUES (u2, 'zz-verify', 'general', 'x');
    log := log || 'announce=ok;';
  EXCEPTION WHEN insufficient_privilege THEN log := log || 'announce=' || SQLERRM || ';';
  END;

  -- 5. 하트는 막지 않는다
  BEGIN
    INSERT INTO public.project_hearts (project_id, user_id) VALUES (pid, u2);
    log := log || 'heart=ok;';
  EXCEPTION WHEN insufficient_privilege THEN log := log || 'heart=' || SQLERRM || ';';
  END;

  -- 닉네임이 비어 있으면 처음 정하는 건 허용(재가입·관리자가 비운 뒤 온보딩에 갇히지 않게)
  EXECUTE 'RESET ROLE';
  UPDATE public.users SET nickname = NULL WHERE id = u2;
  EXECUTE 'SET LOCAL ROLE authenticated';
  BEGIN
    UPDATE public.users SET nickname = 'zz-verify-first' WHERE id = u2;
    log := log || 'nick_first=ok;';
  EXCEPTION WHEN insufficient_privilege THEN log := log || 'nick_first=' || SQLERRM || ';';
  END;

  -- 7. 내 차단 안내
  log := log || 'my_ban=' || (SELECT count(*) FROM public.my_ban()) || '/' || (SELECT unlimited FROM public.my_ban())::text || ';';

  -- 8. 관리 표는 사용자 키로 못 읽음
  BEGIN
    SELECT count(*) INTO n FROM public.user_bans;
    log := log || 'bans_read=' || n || ';';
  EXCEPTION WHEN insufficient_privilege THEN log := log || 'bans_read=denied;';
  END;
  EXECUTE 'RESET ROLE';

  -- 소유자 u 의 수정은 통과
  PERFORM set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  UPDATE public.projects SET description = 'zz-owner' WHERE id = pid;
  GET DIAGNOSTICS n = ROW_COUNT;
  log := log || 'owner_update=' || n || ';';
  EXECUTE 'RESET ROLE';

  -- 4. 서비스 키(관리자)가 차단된 사람의 글을 비공개로 — 통과. 서비스 키로 차단된 사람 이름으로 새 글 — 거절
  PERFORM set_config('request.jwt.claims', json_build_object('role', 'service_role')::text, true);
  EXECUTE 'SET LOCAL ROLE service_role';
  UPDATE public.projects SET visibility = 'private' WHERE id = pid;
  GET DIAGNOSTICS n = ROW_COUNT;
  log := log || 'service_update=' || n || ';';
  BEGIN
    INSERT INTO public.tips (author_id, title, content) VALUES (u2, 'zz-verify', 'x');
    log := log || 'service_insert_for_banned=ok;';
  EXCEPTION WHEN insufficient_privilege THEN log := log || 'service_insert_for_banned=' || SQLERRM || ';';
  END;
  EXECUTE 'RESET ROLE';

  -- 무제한으로 바꾸면 안내도 무제한
  UPDATE public.user_bans SET until = NULL WHERE user_id = u2;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', u2, 'email', u2mail, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  log := log || 'my_ban_forever=' || (SELECT unlimited FROM public.my_ban())::text || ';';
  EXECUTE 'RESET ROLE';

  -- 6. 다시 가입한 것처럼: user_id 없이 이메일 해시만 남은 차단도 걸린다. 끝나면 풀린다
  DELETE FROM public.user_bans WHERE user_id = u2;
  INSERT INTO public.user_bans (user_id, email_hash, until) VALUES (NULL, public.email_hash(upper(u2mail)), now() + interval '1 day');
  log := log || 'hash_ban=' || public.is_banned(u2)::text || ';';
  UPDATE public.user_bans SET until = now() - interval '1 minute' WHERE user_id IS NULL AND email_hash = public.email_hash(u2mail);
  log := log || 'hash_ban_ended=' || public.is_banned(u2)::text || ';';

  -- 탈퇴: 차단 중이면 해시·끝나는 날만 남고, 끝난 차단은 지워진다
  DELETE FROM public.user_bans WHERE email_hash = public.email_hash(u2mail);
  INSERT INTO public.user_bans (user_id, email_hash, until, reason, created_by) VALUES (u2, public.email_hash(u2mail), now() + interval '7 days', 'zz-active', u);
  INSERT INTO public.user_bans (user_id, email_hash, until, reason) VALUES (u2, public.email_hash(u2mail), now() - interval '1 day', 'zz-ended');
  INSERT INTO public.admin_actions (action, target_kind, target_id, target_user_id, detail) VALUES ('ban', 'user', u2::text, u2, '{"duration":"7d"}');
  PERFORM public.withdraw_account(u2);
  log := log || 'actions_forgot=' || (SELECT count(*) FROM public.admin_actions WHERE target_id = u2::text OR target_user_id = u2) || ';';
  SELECT count(*) INTO n FROM public.user_bans WHERE email_hash = public.email_hash(u2mail);
  log := log || 'withdraw=' || n || '/'
    || (SELECT (user_id IS NULL AND reason IS NULL AND created_by IS NULL AND until > now())::text FROM public.user_bans WHERE email_hash = public.email_hash(u2mail) LIMIT 1) || ';';

  -- 실행 권한
  log := log || 'fn=' || has_function_privilege('anon', 'public.is_banned(uuid)', 'EXECUTE')::text
             || '/' || has_function_privilege('authenticated', 'public.is_banned(uuid)', 'EXECUTE')::text
             || '/' || has_function_privilege('anon', 'public.my_ban()', 'EXECUTE')::text || ';';

  expect :=
    'feed_anon=true/true/true;feed_kinds=0;burst=1;stats=true;rpc_auth=false/false/false;bans_fn=1;'
    'tip_insert=user_banned;member_update=user_banned;same_profile=ok;nick_change=user_banned;announce=user_banned;heart=ok;nick_first=ok;'
    'my_ban=1/false;bans_read=denied;owner_update=1;service_update=1;service_insert_for_banned=user_banned;'
    'my_ban_forever=true;hash_ban=true;hash_ban_ended=false;actions_forgot=0;withdraw=1/true;fn=false/false/false;';

  IF log = expect THEN
    RAISE EXCEPTION 'VERIFY OK';
  ELSE
    RAISE EXCEPTION 'VERIFY FAIL expected=% actual=%', expect, log;
  END IF;
END
$verify$;
